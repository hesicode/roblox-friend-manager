import React, { useState, useEffect } from 'react';
import { useSpring, animated } from 'react-spring';
import { useGesture } from 'react-use-gesture';
import { friendsAPI } from '../utils/api';

function FriendCard({ friend, onSwipeLeft, onSwipeRight, onLock, onAddNote }) {
  const [friendDetails, setFriendDetails] = useState(null);
  const [avatarView, setAvatarView] = useState('current');
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    loadFriendDetails();
  }, [friend.id]);

  const loadFriendDetails = async () => {
    try {
      const data = await friendsAPI.getFriendDetails(friend.id);
      setFriendDetails(data);
    } catch (error) {
      console.error('Failed to load friend details:', error);
    }
  };

  const [{ x, rotate }, api] = useSpring(() => ({
    x: 0,
    rotate: 0
  }));

  const bind = useGesture({
    onDrag: ({ down, movement: [mx], velocity, direction: [xDir] }) => {
      // Close expanded panel if user starts swiping
      if (expanded && Math.abs(mx) > 10) {
        setExpanded(false);
      }

      const trigger = velocity > 0.2;

      if (Math.abs(mx) > 50) {
        setSwipeDirection(mx > 0 ? 'right' : 'left');
      } else {
        setSwipeDirection(null);
      }

      if (!down && trigger) {
        const direction = Math.abs(mx) > 200 || velocity > 0.5 ? xDir : 0;
        if (direction > 0) {
          api.start({ x: 1000, rotate: 30, immediate: false });
          setTimeout(onSwipeRight, 300);
        } else if (direction < 0) {
          api.start({ x: -1000, rotate: -30, immediate: false });
          setTimeout(onSwipeLeft, 300);
        } else {
          api.start({ x: 0, rotate: 0 });
        }
      } else {
        api.start({
          x: down ? mx : 0,
          rotate: down ? mx / 20 : 0,
          immediate: down
        });
      }
    }
  });

  const handleAddNote = async () => {
    if (newNote.trim()) {
      try {
        await onAddNote(newNote);
        setNewNote('');
        loadFriendDetails();
      } catch (error) {
        alert('Failed to add note');
      }
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

  const getAvatarUrl = () => {
    if (!friendDetails) return friend.current_avatar;

    const snapshots = friendDetails.avatarSnapshots || [];
    const currentSnapshot = snapshots.find(s => s.snapshot_type === 'current');
    const firstMetSnapshot = snapshots.find(s => s.snapshot_type === 'first_met');

    switch (avatarView) {
      case 'first_met':
        return firstMetSnapshot?.avatar_url || friend.first_met_avatar || friend.current_avatar;
      default:
        return currentSnapshot?.avatar_url || friend.current_avatar;
    }
  };

  const playFrequency = friendDetails?.stats?.average_days_between_sessions;
  const lastPlayed = friendDetails?.stats?.last_played_together;
  const daysSinceLastPlayed = lastPlayed ? getDaysSince(lastPlayed) : null;

  return (
    <animated.div
      className={`friend-card ${expanded ? 'expanded' : ''}`}
      {...bind()}
      style={{
        x: expanded ? 0 : x,
        rotate: expanded ? '0deg' : rotate.to(r => `${r}deg`),
        touchAction: 'none'
      }}
    >
      {/* Swipe feedback */}
      {!expanded && (
        <>
          <div className={`swipe-feedback left ${swipeDirection === 'left' ? 'visible' : ''}`}></div>
          <div className={`swipe-feedback right ${swipeDirection === 'right' ? 'visible' : ''}`}></div>
        </>
      )}

      {/* Avatar */}
      <div className="avatar-container">
        {!imageLoaded && <div className="avatar-loading"></div>}
        <img
          src={getAvatarUrl() || 'https://via.placeholder.com/400x400?text=No+Avatar'}
          alt={friend.current_username}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400x400?text=No+Avatar';
            setImageLoaded(true);
          }}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />

        {friendDetails && imageLoaded && (
          <div className="avatar-toggle">
            <button
              className={`avatar-toggle-btn ${avatarView === 'current' ? 'active' : ''}`}
              onClick={() => setAvatarView('current')}
            >
              Now
            </button>
            <button
              className={`avatar-toggle-btn ${avatarView === 'first_met' ? 'active' : ''}`}
              onClick={() => setAvatarView('first_met')}
            >
              First Met
            </button>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="card-content">
        {/* Expand Toggle Button */}
        <button
          className="expand-toggle"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '×' : '→'}
        </button>

        {/* Main Content */}
        <div className={`card-content-main ${expanded ? 'shifted' : ''}`}>
          <h2 className="friend-name">{friend.current_display_name || friend.current_username}</h2>
          <p className="friend-username">@{friend.current_username}</p>

          <div className="info-section">
            <h4>Friends Since</h4>
            <p>{formatDate(friend.friend_added_date)}</p>
          </div>

          {lastPlayed && (
            <div className="info-section">
              <h4>Last Played Together</h4>
              <p>{formatDate(lastPlayed)}</p>
              {daysSinceLastPlayed && (
                <p style={{fontSize: '0.85rem', color: '#888', marginTop: '0.25rem'}}>
                  {daysSinceLastPlayed} days ago
                </p>
              )}
            </div>
          )}
        </div>

        {/* Expandable Details Panel */}
        <div className={`card-details ${expanded ? 'open' : ''}`}>
          <div className="details-content">
            {/* Play Frequency */}
            {playFrequency && (
              <div className="detail-section">
                <h3>Play Frequency</h3>
                <p>Every {Math.round(playFrequency)} days on average</p>
              </div>
            )}

            {/* Total Sessions */}
            {friendDetails?.stats?.total_sessions > 0 && (
              <div className="detail-section">
                <h3>Total Sessions</h3>
                <p>{friendDetails.stats.total_sessions} times played together</p>
              </div>
            )}

            {/* Likely Met In */}
            {friendDetails?.stats?.likely_met_in_game_name && (
              <div className="detail-section">
                <h3>Likely Met In</h3>
                <p>{friendDetails.stats.likely_met_in_game_name}</p>
              </div>
            )}

            {/* Top Games */}
            {friendDetails?.topGames && friendDetails.topGames.length > 0 && (
              <div className="detail-section">
                <h3>Top Games Together</h3>
                {friendDetails.topGames.slice(0, 5).map((game, index) => (
                  <p key={index} style={{marginBottom: '0.5rem'}}>
                    {game.game_name || `Game ${game.game_id}`} - {game.play_count}x
                  </p>
                ))}
              </div>
            )}

            {/* Username History */}
            {friendDetails?.usernameHistory && friendDetails.usernameHistory.length > 1 && (
              <div className="detail-section">
                <h3>Previous Usernames</h3>
                {friendDetails.usernameHistory.slice(1).map((history, index) => (
                  <span key={index} className="username-badge">
                    {history.username}
                  </span>
                ))}
              </div>
            )}

            {/* Display Name History */}
            {friendDetails?.displayNameHistory && friendDetails.displayNameHistory.length > 1 && (
              <div className="detail-section">
                <h3>Previous Display Names</h3>
                {friendDetails.displayNameHistory.slice(1).map((history, index) => (
                  <span key={index} className="username-badge">
                    {history.display_name}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="detail-section">
              <h3>Notes ({friendDetails?.notes?.length || 0})</h3>

              {friendDetails?.notes && friendDetails.notes.length > 0 && (
                <div className="notes-list">
                  {friendDetails.notes.map((note) => (
                    <div key={note.id} className="note-item">
                      <div className="note-date">{formatDate(note.created_at)}</div>
                      <div className="note-text">{note.note_text}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="add-note-form">
                <input
                  type="text"
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddNote();
                    }
                  }}
                />
                <button className="btn btn-primary" onClick={handleAddNote}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </animated.div>
  );
}

export default FriendCard;
