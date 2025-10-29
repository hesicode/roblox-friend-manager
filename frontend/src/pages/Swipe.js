import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { friendsAPI, notesAPI } from '../utils/api';
import FriendCard from '../components/FriendCard';

function Swipe() {
  const [friends, setFriends] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (currentIndex >= friends.length) return;

      const currentFriend = friends[currentIndex];
      if (!currentFriend) return;

      if (e.key === 'ArrowLeft') {
        handleSwipeLeft(currentFriend.id);
      } else if (e.key === 'ArrowRight') {
        handleSwipeRight();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, friends]);

  const loadFriends = async () => {
    try {
      const data = await friendsAPI.getUnreviewedFriends();
      setFriends(data.friends);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeLeft = async (friendId) => {
    try {
      await friendsAPI.markForUnfriend(friendId);
      nextCard();
    } catch (error) {
      console.error('Failed to mark friend:', error);
    }
  };

  const handleSwipeRight = () => {
    // Just skip to next card (keeping the friend)
    nextCard();
  };

  const handleLock = async (friendId) => {
    try {
      await friendsAPI.lockFriend(friendId, true);
      nextCard();
    } catch (error) {
      console.error('Failed to lock friend:', error);
    }
  };

  const handleAddNote = async (friendId, noteText) => {
    try {
      await notesAPI.addNote(friendId, noteText);
    } catch (error) {
      console.error('Failed to add note:', error);
      throw error;
    }
  };

  const nextCard = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleUndo = async () => {
    if (currentIndex > 0) {
      const previousFriend = friends[currentIndex - 1];

      try {
        // Unmark and unlock the previous friend
        await friendsAPI.unmarkForUnfriend(previousFriend.id);
        await friendsAPI.lockFriend(previousFriend.id, false);

        setCurrentIndex(prev => prev - 1);
      } catch (error) {
        console.error('Failed to undo:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="completion-message">
        <h2>No friends to review!</h2>
        <p>Sync your friends from the dashboard to get started.</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (currentIndex >= friends.length) {
    return (
      <div className="completion-message">
        <h2>All done! 🎉</h2>
        <p>You've reviewed all your friends.</p>
        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem'}}>
          <button className="btn btn-primary" onClick={() => navigate('/review')}>
            Review Marked Friends
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentFriend = friends[currentIndex];
  const nextFriend = friends[currentIndex + 1];
  const nextNextFriend = friends[currentIndex + 2];

  return (
    <div className="swipe-container">
      <div className="swipe-header">
        <div style={{fontSize: '1.1rem', marginBottom: '0.5rem'}}>
          {currentIndex + 1} / {friends.length}
        </div>
        {currentIndex > 0 && (
          <button
            className="btn btn-secondary"
            onClick={handleUndo}
            style={{fontSize: '0.85rem', padding: '0.5rem 1rem'}}
          >
            Undo
          </button>
        )}
      </div>

      <div className="card-stack">
        {/* Third card in stack */}
        {nextNextFriend && (
          <div className="stack-card stack-card-3">
            <div className="friend-card-preview">
              <div className="preview-name">{nextNextFriend.current_display_name || nextNextFriend.current_username}</div>
            </div>
          </div>
        )}

        {/* Second card in stack */}
        {nextFriend && (
          <div className="stack-card stack-card-2">
            <div className="friend-card-preview">
              <div className="preview-name">{nextFriend.current_display_name || nextFriend.current_username}</div>
            </div>
          </div>
        )}

        {/* Current active card */}
        <FriendCard
          key={currentFriend.id}
          friend={currentFriend}
          onSwipeLeft={() => handleSwipeLeft(currentFriend.id)}
          onSwipeRight={handleSwipeRight}
          onLock={() => handleLock(currentFriend.id)}
          onAddNote={(noteText) => handleAddNote(currentFriend.id, noteText)}
        />
      </div>

      <div className="swipe-actions">
        <button
          className="action-button dislike"
          onClick={() => handleSwipeLeft(currentFriend.id)}
          title="Mark for unfriend"
        >
          ✕
        </button>

        <button
          className="action-button lock"
          onClick={() => handleLock(currentFriend.id)}
          title="Lock friend (protect)"
        >
          🔒
        </button>

        <button
          className="action-button like"
          onClick={handleSwipeRight}
          title="Keep friend"
        >
          ✓
        </button>
      </div>
    </div>
  );
}

export default Swipe;
