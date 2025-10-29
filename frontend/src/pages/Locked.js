import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { friendsAPI } from '../utils/api';

function Locked() {
  const [lockedFriends, setLockedFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLockedFriends();
  }, []);

  const loadLockedFriends = async () => {
    try {
      const data = await friendsAPI.getLockedFriends();
      setLockedFriends(data.friends);
    } catch (error) {
      console.error('Failed to load locked friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (friendId) => {
    if (window.confirm('Are you sure you want to unlock this friend? They will appear in your swipe queue again.')) {
      try {
        await friendsAPI.lockFriend(friendId, false);
        setLockedFriends(prev => prev.filter(f => f.id !== friendId));
      } catch (error) {
        console.error('Failed to unlock friend:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="locked-container">
      <div className="review-header">
        <h1>🔒 Locked Friends</h1>
        <p>
          These friends are protected and will never appear in your swipe queue.
          You have <strong>{lockedFriends.length}</strong> locked friends.
        </p>

        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>

      {lockedFriends.length === 0 ? (
        <div className="empty-message">
          <p>No locked friends yet.</p>
          <p>Lock friends during swiping to protect them from being unfriended.</p>
          <button className="btn btn-primary" onClick={() => navigate('/swipe')}>
            Start Swiping
          </button>
        </div>
      ) : (
        <div className="friends-list">
          {lockedFriends.map((friend) => (
            <div key={friend.id} className="friend-item">
              <img
                src={friend.current_avatar || 'https://via.placeholder.com/100'}
                alt={friend.current_username}
                className="friend-item-avatar"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/100';
                }}
              />

              <div className="friend-item-info">
                <h3 className="friend-item-name">
                  {friend.current_display_name || friend.current_username}
                </h3>
                <p className="friend-item-username">@{friend.current_username}</p>

                <div className="friend-item-stats">
                  <div>
                    <strong>Friends since:</strong> {formatDate(friend.friend_added_date)}
                  </div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span style={{color: '#f39c12', fontWeight: 'bold'}}>
                      🔒 Locked (Protected)
                    </span>
                  </div>
                </div>
              </div>

              <div className="friend-item-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleUnlock(friend.id)}
                >
                  Unlock Friend
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Locked;
