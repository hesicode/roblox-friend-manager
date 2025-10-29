import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { statsAPI, friendsAPI } from '../utils/api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await statsAPI.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');

    try {
      const result = await friendsAPI.syncFriends();
      setSyncMessage(`Sync complete! Total friends: ${result.totalFriends}, New friends: ${result.newFriends}`);
      loadStats();
    } catch (error) {
      setSyncMessage('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Roblox Friend Manager</h1>
      <p>Swipe through your friends</p>

      <div style={{display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem'}}>
        <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Friends'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/swipe')}>
          Start Swiping
        </button>
      </div>

      {syncMessage && (
        <div style={{
          padding: '0.75rem',
          background: '#111',
          border: '1px solid #333',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '2rem',
          fontSize: '0.9rem'
        }}>
          {syncMessage}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Friends</h3>
          <div className="stat-value">{stats?.totalFriends || 0}</div>
        </div>

        <div className="stat-card">
          <h3>Locked Friends</h3>
          <div className="stat-value" style={{color: '#f39c12'}}>
            {stats?.lockedFriends || 0}
          </div>
        </div>

        <div className="stat-card">
          <h3>Marked for Unfriend</h3>
          <div className="stat-value" style={{color: '#e74c3c'}}>
            {stats?.markedForUnfriend || 0}
          </div>
        </div>

        <div className="stat-card">
          <h3>Unreviewed</h3>
          <div className="stat-value" style={{color: '#2ecc71'}}>
            {stats?.unreviewedFriends || 0}
          </div>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;
