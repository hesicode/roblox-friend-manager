import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { friendsAPI, notesAPI } from '../utils/api';

function Review() {
  const [markedFriends, setMarkedFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [friendNotes, setFriendNotes] = useState({});
  const [unfriending, setUnfriending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadMarkedFriends();
  }, []);

  useEffect(() => {
    if (showNotes && markedFriends.length > 0) {
      loadAllNotes();
    }
  }, [showNotes, markedFriends]);

  const loadMarkedFriends = async () => {
    try {
      const data = await friendsAPI.getMarkedFriends();
      setMarkedFriends(data.friends);
    } catch (error) {
      console.error('Failed to load marked friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllNotes = async () => {
    const notes = {};
    for (const friend of markedFriends) {
      try {
        const data = await notesAPI.getNotes(friend.id);
        notes[friend.id] = data.notes;
      } catch (error) {
        console.error(`Failed to load notes for ${friend.current_username}:`, error);
      }
    }
    setFriendNotes(notes);
  };

  const handleUnmark = async (friendId) => {
    try {
      await friendsAPI.unmarkForUnfriend(friendId);
      setMarkedFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (error) {
      console.error('Failed to unmark friend:', error);
    }
  };

  const handleUnfriendAll = async () => {
    if (!window.confirm(`Are you sure you want to unfriend ${markedFriends.length} friends? This action cannot be undone!`)) {
      return;
    }

    setUnfriending(true);

    try {
      const result = await friendsAPI.unfriendMarked();
      alert(`Successfully unfriended ${result.unfriended} friends!${result.failed > 0 ? ` Failed: ${result.failed}` : ''}`);
      navigate('/dashboard');
    } catch (error) {
      alert('Failed to unfriend. Please try again.');
    } finally {
      setUnfriending(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysSince = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="review-container">
      <div className="review-header">
        <h1>Review Marked Friends</h1>
        <p>
          You've marked <strong>{markedFriends.length}</strong> friends for unfriending.
          Review the list below and click "Unfriend All" when ready.
        </p>

        <div className="review-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showNotes}
              onChange={(e) => setShowNotes(e.target.checked)}
            />
            <span>Show notes for all friends</span>
          </label>
        </div>

        {markedFriends.length > 0 && (
          <div style={{marginTop: '1.5rem', display: 'flex', gap: '1rem'}}>
            <button
              className="btn btn-danger"
              onClick={handleUnfriendAll}
              disabled={unfriending}
            >
              {unfriending ? 'Unfriending...' : `Unfriend All (${markedFriends.length})`}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {markedFriends.length === 0 ? (
        <div className="empty-message">
          <p>No friends marked for unfriending.</p>
          <button className="btn btn-primary" onClick={() => navigate('/swipe')}>
            Start Swiping
          </button>
        </div>
      ) : (
        <div className="friends-list">
          {markedFriends.map((friend) => {
            const daysSinceLastPlayed = friend.last_played_together
              ? getDaysSince(friend.last_played_together)
              : null;

            return (
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
                    {friend.total_sessions > 0 && (
                      <div>
                        <strong>Play sessions:</strong> {friend.total_sessions}
                      </div>
                    )}
                    {friend.last_played_together && (
                      <div>
                        <strong>Last played:</strong> {formatDate(friend.last_played_together)}
                        {daysSinceLastPlayed && (
                          <span style={{
                            marginLeft: '0.5rem',
                            color: daysSinceLastPlayed > 90 ? '#e74c3c' : daysSinceLastPlayed > 30 ? '#f39c12' : '#2ecc71'
                          }}>
                            ({daysSinceLastPlayed} days ago)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Show notes if enabled */}
                  {showNotes && friendNotes[friend.id] && friendNotes[friend.id].length > 0 && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      background: '#f9f9f9',
                      borderRadius: '8px'
                    }}>
                      <strong>Notes:</strong>
                      {friendNotes[friend.id].map((note) => (
                        <div key={note.id} style={{marginTop: '0.5rem'}}>
                          <div style={{fontSize: '0.85rem', color: '#999'}}>
                            {formatDate(note.created_at)}
                          </div>
                          <div>{note.note_text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="friend-item-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleUnmark(friend.id)}
                  >
                    Keep Friend
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Review;
