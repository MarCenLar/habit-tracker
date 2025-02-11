import React, { useState, useEffect } from 'react';
import { socialService } from '../../services/SocialService';
import { habitService } from '../../services/HabitService';
import './SocialFeed.css';

const SocialFeed = () => {
  const [sharedHabits, setSharedHabits] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [userId] = useState('user123'); // In a real app, this would come from auth

  useEffect(() => {
    loadSocialContent();
  }, []);

  const loadSocialContent = () => {
    setSharedHabits(socialService.getSharedHabits());
    setChallenges(socialService.getGroupChallenges());
  };

  const handleShare = (habit) => {
    socialService.shareHabit(habit, userId);
    loadSocialContent();
  };

  const handleLike = (habitId) => {
    socialService.likeSharedHabit(habitId, userId);
    loadSocialContent();
  };

  const handleComment = (habitId, comment) => {
    socialService.commentOnHabit(habitId, userId, comment);
    loadSocialContent();
  };

  const handleJoinChallenge = (challengeId) => {
    socialService.joinChallenge(challengeId, userId);
    loadSocialContent();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="social-feed">
      <div className="shared-habits">
        <h2>Community Habits</h2>
        {sharedHabits.map((habit) => (
          <div key={habit.id} className="shared-habit-card">
            <div className="habit-header">
              <h3>{habit.title}</h3>
              <span className="shared-by">Shared by User {habit.sharedBy}</span>
            </div>
            <p className="habit-description">{habit.description}</p>
            <div className="habit-stats">
              <span>{habit.streak} day streak</span>
              <span>{habit.likes} likes</span>
            </div>
            <div className="habit-actions">
              <button
                onClick={() => handleLike(habit.id)}
                className={`like-button ${habit.likedBy?.includes(userId) ? 'liked' : ''}`}
              >
                ❤️ Like
              </button>
              <button onClick={() => handleShare(habit)} className="share-button">
                📤 Share
              </button>
            </div>
            <div className="comments-section">
              {habit.comments?.map((comment) => (
                <div key={comment.id} className="comment">
                  <span className="comment-user">User {comment.userId}: </span>
                  <span className="comment-text">{comment.text}</span>
                  <span className="comment-date">{formatDate(comment.createdAt)}</span>
                </div>
              ))}
              <div className="comment-form">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleComment(habit.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="group-challenges">
        <h2>Active Challenges</h2>
        {challenges.map((challenge) => (
          <div key={challenge.id} className="challenge-card">
            <div className="challenge-header">
              <h3>{challenge.title}</h3>
              <span className="challenge-duration">
                {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
              </span>
            </div>
            <p className="challenge-description">{challenge.description}</p>
            <div className="challenge-stats">
              <span>{challenge.participants.length} participants</span>
              <div className="progress-bar">
                <div
                  className="progress"
                  style={{
                    width: `${(challenge.progress[userId] || 0) * 100}%`
                  }}
                />
              </div>
            </div>
            {!challenge.participants.includes(userId) && (
              <button
                onClick={() => handleJoinChallenge(challenge.id)}
                className="join-button"
              >
                Join Challenge
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocialFeed;
