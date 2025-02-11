import React, { useState, useEffect } from 'react';
import { rewardsService } from '../services/RewardsService';
import './Rewards.css';

const Rewards = () => {
  const [progress, setProgress] = useState(null);
  const [showNewAchievement, setShowNewAchievement] = useState(null);
  const [lastPoints, setLastPoints] = useState(0);

  useEffect(() => {
    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateProgress = () => {
    const newProgress = rewardsService.getProgress();
    if (lastPoints < newProgress.points) {
      // Points animation
      animatePointsGain(newProgress.points - lastPoints);
    }
    setLastPoints(newProgress.points);
    setProgress(newProgress);
  };

  const animatePointsGain = (amount) => {
    const pointsPopup = document.createElement('div');
    pointsPopup.className = 'points-popup';
    pointsPopup.textContent = `+${amount} points`;
    document.body.appendChild(pointsPopup);

    // Random position near the top of the screen
    const randomX = Math.random() * (window.innerWidth - 100);
    pointsPopup.style.left = `${randomX}px`;

    setTimeout(() => {
      document.body.removeChild(pointsPopup);
    }, 1000);
  };

  if (!progress) return null;

  const levelProgress = rewardsService.getLevelProgress();
  const nextLevelPoints = rewardsService.getPointsForNextLevel();

  return (
    <div className="rewards-container">
      <div className="level-info">
        <div className="level-header">
          <h2>Level {progress.level}</h2>
          <div className="points-display">
            <span className="points-icon">⭐</span>
            <span className="points-value">{progress.points}</span>
          </div>
        </div>

        <div className="level-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="progress-text">
            {Math.round(nextLevelPoints - progress.points)} points to next level
          </div>
        </div>
      </div>

      <div className="achievements-section">
        <h3>Achievements</h3>
        <div className="achievements-grid">
          {progress.achievements.map(achievement => (
            <div 
              key={achievement.id} 
              className={`achievement-card ${showNewAchievement?.id === achievement.id ? 'new' : ''}`}
            >
              <div className="achievement-icon">🏆</div>
              <div className="achievement-info">
                <h4>{achievement.title}</h4>
                <p>{achievement.description}</p>
                <span className="achievement-date">
                  Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          {/* Coming soon achievements */}
          {[
            { id: 'coming-soon-1', title: '???', description: 'Keep going to unlock more achievements!' },
            { id: 'coming-soon-2', title: '???', description: 'More challenges await!' }
          ].map(achievement => (
            <div key={achievement.id} className="achievement-card locked">
              <div className="achievement-icon">🔒</div>
              <div className="achievement-info">
                <h4>{achievement.title}</h4>
                <p>{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Progress */}
      <div className="milestones-section">
        <h3>Current Goals</h3>
        <div className="milestones-list">
          {[
            { points: 100, title: 'First Steps' },
            { points: 1000, title: 'Getting Serious' },
            { points: 5000, title: 'Habit Master' },
            { points: 10000, title: 'Consistency King' }
          ].map(milestone => {
            const completed = progress.points >= milestone.points;
            const percentage = Math.min((progress.points / milestone.points) * 100, 100);
            
            return (
              <div key={milestone.title} className={`milestone-item ${completed ? 'completed' : ''}`}>
                <div className="milestone-info">
                  <h4>{milestone.title}</h4>
                  <span>{milestone.points} points</span>
                </div>
                <div className="milestone-progress">
                  <div 
                    className="milestone-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Level Benefits */}
      <div className="benefits-section">
        <h3>Level Benefits</h3>
        <div className="benefits-grid">
          {[
            { level: 5, benefit: 'Unlock custom themes', icon: '🎨' },
            { level: 10, benefit: 'Unlock detailed analytics', icon: '📊' },
            { level: 15, benefit: 'Unlock habit sharing', icon: '🤝' },
            { level: 20, benefit: 'Unlock premium features', icon: '👑' }
          ].map(benefit => (
            <div 
              key={benefit.level} 
              className={`benefit-card ${progress.level >= benefit.level ? 'unlocked' : 'locked'}`}
            >
              <div className="benefit-icon">{benefit.icon}</div>
              <div className="benefit-info">
                <h4>Level {benefit.level}</h4>
                <p>{benefit.benefit}</p>
              </div>
              {progress.level < benefit.level && (
                <div className="levels-remaining">
                  {benefit.level - progress.level} levels to go
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showNewAchievement && (
        <div className="achievement-popup" onClick={() => setShowNewAchievement(null)}>
          <div className="achievement-popup-content">
            <h3>🎉 New Achievement!</h3>
            <div className="achievement-icon">🏆</div>
            <h4>{showNewAchievement.title}</h4>
            <p>{showNewAchievement.description}</p>
            <button>Awesome!</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rewards;
