const axios = require('axios');

/**
 * Roblox API Integration Module
 * Handles all interactions with Roblox APIs
 */

class RobloxAPI {
  constructor(cookie) {
    this.cookie = cookie;
    this.axios = axios.create({
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  /**
   * Get current authenticated user's information
   */
  async getCurrentUser() {
    try {
      const response = await this.axios.get('https://users.roblox.com/v1/users/authenticated');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get current user: ${error.message}`);
    }
  }

  /**
   * Get user information by user ID
   */
  async getUserInfo(userId) {
    try {
      const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Get all friends for a user
   */
  async getFriends(userId) {
    try {
      const response = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends`);
      return response.data.data || [];
    } catch (error) {
      throw new Error(`Failed to get friends: ${error.message}`);
    }
  }

  /**
   * Get friends with their online presence
   */
  async getFriendsWithPresence(userId) {
    try {
      const friends = await this.getFriends(userId);

      // Get friend IDs
      const friendIds = friends.map(f => f.id);

      // Fetch user info in batches of 100 (includes usernames and display names)
      const userInfoData = await this.getBatchUserInfo(friendIds);

      // Get presence information for all friends (in batches of 50)
      const presenceData = await this.getUserPresences(friendIds);

      // Merge all data together
      return friends.map(friend => {
        const userInfo = userInfoData.find(u => u.id === friend.id);
        const presence = presenceData.find(p => p.userPresenceId === friend.id);

        // For users without name data (privacy settings), use placeholder
        const username = userInfo?.name || `User_${friend.id}`;
        const displayName = userInfo?.displayName || username;

        return {
          id: friend.id,
          name: username,
          displayName: displayName,
          presence: presence || null
        };
      });
    } catch (error) {
      throw new Error(`Failed to get friends with presence: ${error.message}`);
    }
  }

  /**
   * Get user presences (what games they're playing, online status)
   */
  async getUserPresences(userIds) {
    try {
      if (!userIds || userIds.length === 0) return [];

      // Roblox API limits to 50 users per request
      const batches = [];
      for (let i = 0; i < userIds.length; i += 50) {
        batches.push(userIds.slice(i, i + 50));
      }

      const allPresences = [];
      for (const batch of batches) {
        const response = await axios.post('https://presence.roblox.com/v1/presence/users', {
          userIds: batch
        });
        allPresences.push(...(response.data.userPresences || []));
      }

      return allPresences;
    } catch (error) {
      console.error(`Failed to get user presences: ${error.message}`);
      return [];
    }
  }

  /**
   * Get user's avatar thumbnail URL
   * size: '48x48', '50x50', '60x60', '75x75', '100x100', '110x110', '150x150', '180x180', '352x352', '420x420', '720x720'
   */
  async getAvatarThumbnail(userId, size = '420x420') {
    try {
      const response = await axios.get(
        `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=${size}&format=Png`
      );

      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0].imageUrl;
      }
      return null;
    } catch (error) {
      console.error(`Failed to get avatar thumbnail: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user's avatar headshot thumbnail
   */
  async getHeadshotThumbnail(userId, size = '150x150') {
    try {
      const response = await axios.get(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png`
      );

      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0].imageUrl;
      }
      return null;
    } catch (error) {
      console.error(`Failed to get headshot thumbnail: ${error.message}`);
      return null;
    }
  }

  /**
   * Get username history for a user
   */
  async getUsernameHistory(userId) {
    try {
      const response = await axios.get(
        `https://users.roblox.com/v1/users/${userId}/username-history?limit=100&sortOrder=Desc`
      );
      return response.data.data || [];
    } catch (error) {
      console.error(`Failed to get username history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get games a user has played recently
   * Note: This endpoint may have limited data depending on user privacy settings
   */
  async getUserRecentGames(userId) {
    try {
      // This uses the games API to get recently played games
      const response = await axios.get(
        `https://games.roblox.com/v1/users/${userId}/games?sortOrder=Desc&limit=50`
      );
      return response.data.data || [];
    } catch (error) {
      console.error(`Failed to get recent games: ${error.message}`);
      return [];
    }
  }

  /**
   * Get game details by game ID
   */
  async getGameDetails(universeId) {
    try {
      const response = await axios.get(
        `https://games.roblox.com/v1/games?universeIds=${universeId}`
      );

      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
      return null;
    } catch (error) {
      console.error(`Failed to get game details: ${error.message}`);
      return null;
    }
  }

  /**
   * Unfriend a user
   */
  async unfriendUser(targetUserId) {
    try {
      // First, get CSRF token
      const csrfToken = await this.getCSRFToken();

      const response = await this.axios.post(
        `https://friends.roblox.com/v1/users/${targetUserId}/unfriend`,
        {},
        {
          headers: {
            'X-CSRF-TOKEN': csrfToken
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to unfriend user: ${error.message}`);
    }
  }

  /**
   * Get CSRF token (required for POST requests)
   */
  async getCSRFToken() {
    try {
      // Make a POST request that will fail but return the CSRF token
      await this.axios.post('https://auth.roblox.com/v2/logout', {});
    } catch (error) {
      if (error.response && error.response.headers['x-csrf-token']) {
        return error.response.headers['x-csrf-token'];
      }
      throw new Error('Failed to get CSRF token');
    }
  }

  /**
   * Get friends count
   */
  async getFriendsCount(userId) {
    try {
      const response = await axios.get(
        `https://friends.roblox.com/v1/users/${userId}/friends/count`
      );
      return response.data.count || 0;
    } catch (error) {
      console.error(`Failed to get friends count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Batch get user info for multiple users
   */
  async getBatchUserInfo(userIds) {
    try {
      if (!userIds || userIds.length === 0) return [];

      // Process in batches of 100 (API limit)
      const batches = [];
      for (let i = 0; i < userIds.length; i += 100) {
        batches.push(userIds.slice(i, i + 100));
      }

      const allUsers = [];
      for (const batch of batches) {
        try {
          const response = await axios.post(
            'https://users.roblox.com/v1/users',
            {
              userIds: batch,
              excludeBannedUsers: false
            }
          );
          allUsers.push(...(response.data.data || []));

          // Small delay to avoid rate limiting
          if (batches.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Failed to get batch user info for batch: ${error.message}`);
        }
      }

      return allUsers;
    } catch (error) {
      console.error(`Failed to get batch user info: ${error.message}`);
      return [];
    }
  }
}

module.exports = RobloxAPI;
