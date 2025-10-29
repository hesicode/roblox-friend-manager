import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ==================== AUTH API ====================

export const authAPI = {
  login: async (robloxCookie) => {
    const response = await api.post('/api/auth/login', { robloxCookie });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },

  checkStatus: async () => {
    const response = await api.get('/api/auth/status');
    return response.data;
  }
};

// ==================== FRIENDS API ====================

export const friendsAPI = {
  syncFriends: async () => {
    const response = await api.post('/api/friends/sync');
    return response.data;
  },

  getAllFriends: async () => {
    const response = await api.get('/api/friends');
    return response.data;
  },

  getUnreviewedFriends: async () => {
    const response = await api.get('/api/friends/unreviewed');
    return response.data;
  },

  getLockedFriends: async () => {
    const response = await api.get('/api/friends/locked');
    return response.data;
  },

  getMarkedFriends: async () => {
    const response = await api.get('/api/friends/marked');
    return response.data;
  },

  getFriendDetails: async (friendId) => {
    const response = await api.get(`/api/friends/${friendId}`);
    return response.data;
  },

  markForUnfriend: async (friendId) => {
    const response = await api.post(`/api/friends/${friendId}/mark`);
    return response.data;
  },

  unmarkForUnfriend: async (friendId) => {
    const response = await api.post(`/api/friends/${friendId}/unmark`);
    return response.data;
  },

  lockFriend: async (friendId, locked) => {
    const response = await api.post(`/api/friends/${friendId}/lock`, { locked });
    return response.data;
  },

  unfriendMarked: async () => {
    const response = await api.post('/api/friends/unfriend-marked');
    return response.data;
  }
};

// ==================== NOTES API ====================

export const notesAPI = {
  addNote: async (friendId, noteText) => {
    const response = await api.post(`/api/friends/${friendId}/notes`, { noteText });
    return response.data;
  },

  getNotes: async (friendId) => {
    const response = await api.get(`/api/friends/${friendId}/notes`);
    return response.data;
  }
};

// ==================== STATS API ====================

export const statsAPI = {
  getDashboardStats: async () => {
    const response = await api.get('/api/stats/dashboard');
    return response.data;
  }
};

export default api;
