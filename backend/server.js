const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();

const { dbOperations } = require('./database');
const RobloxAPI = require('./robloxAPI');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'roblox-friend-manager-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// ==================== AUTH ROUTES ====================

/**
 * Login with Roblox cookie
 * POST /api/auth/login
 * Body: { robloxCookie: string }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { robloxCookie } = req.body;

    if (!robloxCookie) {
      return res.status(400).json({ error: 'Roblox cookie is required' });
    }

    // Verify cookie by getting user info
    const robloxAPI = new RobloxAPI(robloxCookie);
    const userInfo = await robloxAPI.getCurrentUser();

    // Check if user exists, if not create
    let user = await dbOperations.get(
      'SELECT * FROM users WHERE roblox_user_id = ?',
      [userInfo.id]
    );

    if (!user) {
      const result = await dbOperations.run(
        `INSERT INTO users (roblox_user_id, username, display_name, roblox_cookie)
         VALUES (?, ?, ?, ?)`,
        [userInfo.id, userInfo.name, userInfo.displayName, robloxCookie]
      );
      user = await dbOperations.get('SELECT * FROM users WHERE id = ?', [result.id]);
    } else {
      // Update existing user
      await dbOperations.run(
        `UPDATE users SET username = ?, display_name = ?, roblox_cookie = ?, last_login = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [userInfo.name, userInfo.displayName, robloxCookie, user.id]
      );
    }

    // Set session
    req.session.userId = user.id;
    req.session.robloxUserId = userInfo.id;

    res.json({
      success: true,
      user: {
        id: user.id,
        robloxUserId: userInfo.id,
        username: userInfo.name,
        displayName: userInfo.displayName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid Roblox cookie or authentication failed' });
  }
});

/**
 * Logout
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

/**
 * Check authentication status
 * GET /api/auth/status
 */
app.get('/api/auth/status', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ authenticated: false });
  }

  try {
    const user = await dbOperations.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (!user) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        robloxUserId: user.roblox_user_id,
        username: user.username,
        displayName: user.display_name
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check auth status' });
  }
});

// ==================== FRIENDS ROUTES ====================

/**
 * Sync friends from Roblox
 * POST /api/friends/sync
 */
app.post('/api/friends/sync', requireAuth, async (req, res) => {
  try {
    const user = await dbOperations.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    const robloxAPI = new RobloxAPI(user.roblox_cookie);

    // Get friends from Roblox
    const friends = await robloxAPI.getFriendsWithPresence(user.roblox_user_id);

    let syncedCount = 0;

    for (let i = 0; i < friends.length; i++) {
      const friend = friends[i];

      // Skip only invalid friend IDs (not missing names - those use placeholders)
      if (!friend.id || friend.id < 0) {
        console.log(`Skipping invalid friend ID: ${friend.id}`);
        continue;
      }

      // Check if friend already exists
      let existingFriend = await dbOperations.get(
        'SELECT * FROM friends WHERE user_id = ? AND friend_roblox_id = ?',
        [user.id, friend.id]
      );

      if (!existingFriend) {
        // New friend - insert
        const result = await dbOperations.run(
          `INSERT INTO friends (user_id, friend_roblox_id, current_username, current_display_name, friend_added_date)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [user.id, friend.id, friend.name, friend.displayName]
        );

        // Get avatar and save as 'first_met' snapshot only (with delay to avoid rate limiting)
        // 'current' will be saved on subsequent syncs
        if (i > 0 && i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Delay every 5 requests
        }

        const avatarUrl = await robloxAPI.getAvatarThumbnail(friend.id);
        if (avatarUrl) {
          // Save as first_met snapshot (represents avatar when friendship started)
          await dbOperations.run(
            `INSERT INTO avatar_snapshots (friend_id, avatar_url, snapshot_type)
             VALUES (?, ?, 'first_met')`,
            [result.id, avatarUrl]
          );
          // Also save as current snapshot for immediate viewing
          await dbOperations.run(
            `INSERT INTO avatar_snapshots (friend_id, avatar_url, snapshot_type)
             VALUES (?, ?, 'current')`,
            [result.id, avatarUrl]
          );
        }

        // Save username to history
        await dbOperations.run(
          `INSERT INTO username_history (friend_id, username) VALUES (?, ?)`,
          [result.id, friend.name]
        );

        // Save display name to history
        if (friend.displayName) {
          await dbOperations.run(
            `INSERT INTO display_name_history (friend_id, display_name) VALUES (?, ?)`,
            [result.id, friend.displayName]
          );
        }

        syncedCount++;
      } else {
        // Existing friend - check for username/display name changes
        if (existingFriend.current_username !== friend.name) {
          await dbOperations.run(
            `UPDATE friends SET current_username = ? WHERE id = ?`,
            [friend.name, existingFriend.id]
          );

          // Add to username history
          await dbOperations.run(
            `INSERT INTO username_history (friend_id, username) VALUES (?, ?)`,
            [existingFriend.id, friend.name]
          );
        }

        if (existingFriend.current_display_name !== friend.displayName) {
          await dbOperations.run(
            `UPDATE friends SET current_display_name = ? WHERE id = ?`,
            [friend.displayName, existingFriend.id]
          );

          // Add to display name history
          if (friend.displayName) {
            await dbOperations.run(
              `INSERT INTO display_name_history (friend_id, display_name) VALUES (?, ?)`,
              [existingFriend.id, friend.displayName]
            );
          }
        }

        // Update current avatar snapshot
        const avatarUrl = await robloxAPI.getAvatarThumbnail(friend.id);
        if (avatarUrl) {
          // Delete old current snapshot
          await dbOperations.run(
            `DELETE FROM avatar_snapshots WHERE friend_id = ? AND snapshot_type = 'current'`,
            [existingFriend.id]
          );

          // Add new current snapshot
          await dbOperations.run(
            `INSERT INTO avatar_snapshots (friend_id, avatar_url, snapshot_type)
             VALUES (?, ?, 'current')`,
            [existingFriend.id, avatarUrl]
          );
        }
      }
    }

    res.json({
      success: true,
      totalFriends: friends.length,
      newFriends: syncedCount
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync friends' });
  }
});

/**
 * Get all friends for current user
 * GET /api/friends
 */
app.get('/api/friends', requireAuth, async (req, res) => {
  try {
    const friends = await dbOperations.all(
      `SELECT f.*,
              (SELECT avatar_url FROM avatar_snapshots
               WHERE friend_id = f.id AND snapshot_type = 'current'
               ORDER BY snapshot_date DESC LIMIT 1) as current_avatar,
              (SELECT avatar_url FROM avatar_snapshots
               WHERE friend_id = f.id AND snapshot_type = 'first_met'
               LIMIT 1) as first_met_avatar,
              fs.total_sessions, fs.last_played_together, fs.first_played_together,
              fs.average_days_between_sessions, fs.most_played_game_name, fs.likely_met_in_game_name
       FROM friends f
       LEFT JOIN friendship_stats fs ON f.id = fs.friend_id
       WHERE f.user_id = ? AND f.is_marked_for_unfriend = 0
       ORDER BY f.created_at DESC`,
      [req.session.userId]
    );

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

/**
 * Get unreviewed friends (not locked, not marked for unfriend)
 * GET /api/friends/unreviewed
 */
app.get('/api/friends/unreviewed', requireAuth, async (req, res) => {
  try {
    const friends = await dbOperations.all(
      `SELECT f.*,
              (SELECT avatar_url FROM avatar_snapshots
               WHERE friend_id = f.id AND snapshot_type = 'current'
               ORDER BY snapshot_date DESC LIMIT 1) as current_avatar,
              (SELECT avatar_url FROM avatar_snapshots
               WHERE friend_id = f.id AND snapshot_type = 'first_met'
               LIMIT 1) as first_met_avatar,
              fs.total_sessions, fs.last_played_together, fs.first_played_together,
              fs.average_days_between_sessions, fs.most_played_game_name, fs.likely_met_in_game_name
       FROM friends f
       LEFT JOIN friendship_stats fs ON f.id = fs.friend_id
       WHERE f.user_id = ? AND f.is_locked = 0 AND f.is_marked_for_unfriend = 0
       ORDER BY f.created_at DESC`,
      [req.session.userId]
    );

    res.json({ friends });
  } catch (error) {
    console.error('Get unreviewed friends error:', error);
    res.status(500).json({ error: 'Failed to get unreviewed friends' });
  }
});

/**
 * Get locked friends
 * GET /api/friends/locked
 */
app.get('/api/friends/locked', requireAuth, async (req, res) => {
  try {
    const friends = await dbOperations.all(
      `SELECT f.*,
              (SELECT avatar_url FROM avatar_snapshots
               WHERE friend_id = f.id AND snapshot_type = 'current'
               ORDER BY snapshot_date DESC LIMIT 1) as current_avatar
       FROM friends f
       WHERE f.user_id = ? AND f.is_locked = 1
       ORDER BY f.current_username ASC`,
      [req.session.userId]
    );

    res.json({ friends });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get locked friends' });
  }
});

/**
 * Get friends marked for unfriend
 * GET /api/friends/marked
 */
app.get('/api/friends/marked', requireAuth, async (req, res) => {
  try {
    const friends = await dbOperations.all(
      `SELECT f.*,
              (SELECT avatar_url FROM avatar_snapshots
               WHERE friend_id = f.id AND snapshot_type = 'current'
               ORDER BY snapshot_date DESC LIMIT 1) as current_avatar,
              fs.total_sessions, fs.last_played_together
       FROM friends f
       LEFT JOIN friendship_stats fs ON f.id = fs.friend_id
       WHERE f.user_id = ? AND f.is_marked_for_unfriend = 1
       ORDER BY f.current_username ASC`,
      [req.session.userId]
    );

    res.json({ friends });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get marked friends' });
  }
});

/**
 * Get friend details including history and stats
 * GET /api/friends/:friendId
 */
app.get('/api/friends/:friendId', requireAuth, async (req, res) => {
  try {
    const friend = await dbOperations.get(
      'SELECT * FROM friends WHERE id = ? AND user_id = ?',
      [req.params.friendId, req.session.userId]
    );

    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    // Get username history
    const usernameHistory = await dbOperations.all(
      'SELECT * FROM username_history WHERE friend_id = ? ORDER BY detected_at DESC',
      [friend.id]
    );

    // Get display name history
    const displayNameHistory = await dbOperations.all(
      'SELECT * FROM display_name_history WHERE friend_id = ? ORDER BY detected_at DESC',
      [friend.id]
    );

    // Get avatar snapshots
    const avatarSnapshots = await dbOperations.all(
      'SELECT * FROM avatar_snapshots WHERE friend_id = ? ORDER BY snapshot_date DESC',
      [friend.id]
    );

    // Get notes
    const notes = await dbOperations.all(
      'SELECT * FROM notes WHERE friend_id = ? ORDER BY created_at DESC',
      [friend.id]
    );

    // Get top games played together
    const topGames = await dbOperations.all(
      `SELECT * FROM game_stats
       WHERE friend_id = ?
       ORDER BY play_count DESC LIMIT 5`,
      [friend.id]
    );

    // Get friendship stats
    const stats = await dbOperations.get(
      'SELECT * FROM friendship_stats WHERE friend_id = ?',
      [friend.id]
    );

    res.json({
      friend,
      usernameHistory,
      displayNameHistory,
      avatarSnapshots,
      notes,
      topGames,
      stats
    });
  } catch (error) {
    console.error('Get friend details error:', error);
    res.status(500).json({ error: 'Failed to get friend details' });
  }
});

/**
 * Mark friend for unfriend (swipe left)
 * POST /api/friends/:friendId/mark
 */
app.post('/api/friends/:friendId/mark', requireAuth, async (req, res) => {
  try {
    await dbOperations.run(
      'UPDATE friends SET is_marked_for_unfriend = 1 WHERE id = ? AND user_id = ?',
      [req.params.friendId, req.session.userId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark friend' });
  }
});

/**
 * Unmark friend (undo)
 * POST /api/friends/:friendId/unmark
 */
app.post('/api/friends/:friendId/unmark', requireAuth, async (req, res) => {
  try {
    await dbOperations.run(
      'UPDATE friends SET is_marked_for_unfriend = 0 WHERE id = ? AND user_id = ?',
      [req.params.friendId, req.session.userId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unmark friend' });
  }
});

/**
 * Lock/unlock friend
 * POST /api/friends/:friendId/lock
 * Body: { locked: boolean }
 */
app.post('/api/friends/:friendId/lock', requireAuth, async (req, res) => {
  try {
    const { locked } = req.body;

    await dbOperations.run(
      'UPDATE friends SET is_locked = ? WHERE id = ? AND user_id = ?',
      [locked ? 1 : 0, req.params.friendId, req.session.userId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to lock/unlock friend' });
  }
});

/**
 * Mass unfriend marked friends
 * POST /api/friends/unfriend-marked
 */
app.post('/api/friends/unfriend-marked', requireAuth, async (req, res) => {
  try {
    const user = await dbOperations.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    const robloxAPI = new RobloxAPI(user.roblox_cookie);

    // Get all marked friends
    const markedFriends = await dbOperations.all(
      'SELECT * FROM friends WHERE user_id = ? AND is_marked_for_unfriend = 1',
      [user.id]
    );

    let successCount = 0;
    let failCount = 0;

    for (const friend of markedFriends) {
      try {
        await robloxAPI.unfriendUser(friend.friend_roblox_id);

        // Delete friend from database
        await dbOperations.run('DELETE FROM friends WHERE id = ?', [friend.id]);

        successCount++;
      } catch (error) {
        console.error(`Failed to unfriend ${friend.current_username}:`, error);
        failCount++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({
      success: true,
      unfriended: successCount,
      failed: failCount
    });
  } catch (error) {
    console.error('Mass unfriend error:', error);
    res.status(500).json({ error: 'Failed to unfriend marked friends' });
  }
});

// ==================== NOTES ROUTES ====================

/**
 * Add note to friend
 * POST /api/friends/:friendId/notes
 * Body: { noteText: string }
 */
app.post('/api/friends/:friendId/notes', requireAuth, async (req, res) => {
  try {
    const { noteText } = req.body;

    if (!noteText || noteText.trim() === '') {
      return res.status(400).json({ error: 'Note text is required' });
    }

    // Verify friend belongs to user
    const friend = await dbOperations.get(
      'SELECT * FROM friends WHERE id = ? AND user_id = ?',
      [req.params.friendId, req.session.userId]
    );

    if (!friend) {
      return res.status(404).json({ error: 'Friend not found' });
    }

    const result = await dbOperations.run(
      'INSERT INTO notes (friend_id, note_text) VALUES (?, ?)',
      [req.params.friendId, noteText]
    );

    const note = await dbOperations.get('SELECT * FROM notes WHERE id = ?', [result.id]);

    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

/**
 * Get notes for friend
 * GET /api/friends/:friendId/notes
 */
app.get('/api/friends/:friendId/notes', requireAuth, async (req, res) => {
  try {
    const notes = await dbOperations.all(
      `SELECT n.* FROM notes n
       JOIN friends f ON n.friend_id = f.id
       WHERE f.id = ? AND f.user_id = ?
       ORDER BY n.created_at DESC`,
      [req.params.friendId, req.session.userId]
    );

    res.json({ notes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

// ==================== STATISTICS ROUTES ====================

/**
 * Get dashboard statistics
 * GET /api/stats/dashboard
 */
app.get('/api/stats/dashboard', requireAuth, async (req, res) => {
  try {
    const totalFriends = await dbOperations.get(
      'SELECT COUNT(*) as count FROM friends WHERE user_id = ?',
      [req.session.userId]
    );

    const lockedFriends = await dbOperations.get(
      'SELECT COUNT(*) as count FROM friends WHERE user_id = ? AND is_locked = 1',
      [req.session.userId]
    );

    const markedForUnfriend = await dbOperations.get(
      'SELECT COUNT(*) as count FROM friends WHERE user_id = ? AND is_marked_for_unfriend = 1',
      [req.session.userId]
    );

    const unreviewedFriends = await dbOperations.get(
      'SELECT COUNT(*) as count FROM friends WHERE user_id = ? AND is_locked = 0 AND is_marked_for_unfriend = 0',
      [req.session.userId]
    );

    res.json({
      totalFriends: totalFriends.count,
      lockedFriends: lockedFriends.count,
      markedForUnfriend: markedForUnfriend.count,
      unreviewedFriends: unreviewedFriends.count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
