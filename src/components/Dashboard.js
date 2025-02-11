import React, { useState, useEffect } from 'react';
import { habitService } from '../services/HabitService';
import ProgressionService from '../services/ProgressionService';
import { questService } from '../services/quests/QuestService'; // Updated import
import './Dashboard.css';

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [quote, setQuote] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [userStats, setUserStats] = useState({
    xp: 0,
    coins: 0,
    level: 1,
    completedQuests: [],
    completedAchievements: [],
    currentStreak: 0,
    longestStreak: 0,
    completedDays: 0,
    totalHabits: 0,
    socialActions: [],
    monthlyProgress: 0,
    weeklyProgress: 0,
    name: 'User', // Replace with actual user name from auth
    id: '1', // Replace with actual user ID from auth
    premium: false,
    lastLogin: null
  });

  const [activeQuests, setActiveQuests] = useState([]);
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);

  useEffect(() => {
    updateDashboard();
    // Refresh quote every day
    const interval = setInterval(() => {
      setQuote(habitService.getRandomQuote());
    }, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const updateDashboard = async () => {
    try {
      const analytics = await habitService.getAnalytics();
      setAnalytics(analytics);
      setQuote(await habitService.getRandomQuote());
      
      // Load achievements
      const userAchievements = await habitService.getAchievements();
      const achievementDetails = userAchievements.map(id => 
        habitService.getCategories()
          .flatMap(cat => cat.achievements)
          .find(a => a.id === id)
      ).filter(Boolean);
      setAchievements(achievementDetails);

      // Load active quests with some defaults if none exist
      let quests = await questService.getActiveQuests(userStats.id);
      if (!quests || quests.length === 0) {
        quests = [
          {
            id: 'default_quest_1',
            icon: '🎯',
            title: 'Getting Started',
            description: 'Complete your first habit tracking day',
            progress: 0,
            target: 1,
            rewards: { xp: 100, coins: 50 }
          },
          {
            id: 'default_quest_2',
            icon: '🔥',
            title: 'Streak Builder',
            description: 'Maintain a 3-day streak',
            progress: Math.min(userStats.currentStreak, 3),
            target: 3,
            rewards: { xp: 200, coins: 100 }
          }
        ];
      }
      setActiveQuests(quests);

      // Check daily reward
      const lastLoginDate = localStorage.getItem('lastLoginDate');
      const today = new Date().toDateString();
      setDailyRewardClaimed(lastLoginDate === today);

      // Calculate weekly and monthly progress
      let weeklyProgress = 0;
      let monthlyProgress = 0;
      
      try {
        weeklyProgress = await habitService.getWeeklyProgress();
        monthlyProgress = await habitService.getMonthlyProgress();
      } catch (error) {
        console.warn('Progress calculation error:', error);
        weeklyProgress = userStats.completedDays / 7 * 100;
        monthlyProgress = userStats.completedDays / 30 * 100;
      }

      // Update user stats with proper error handling and defaults
      setUserStats(prev => {
        const completedDays = analytics.totalCompletedDays ?? 0;
        const totalHabits = analytics.totalHabits ?? 0;
        const longestStreak = analytics.longestStreak ?? 0;
        const currentStreak = analytics.currentStreak ?? 0;
        
        // Validate and sanitize values
        return {
          ...prev,
          currentStreak: Math.max(0, currentStreak),
          longestStreak: Math.max(0, longestStreak),
          completedDays: Math.max(0, completedDays),
          totalHabits: Math.max(0, totalHabits),
          completedAchievements: userAchievements || [],
          weeklyProgress: Math.min(100, Math.max(0, weeklyProgress)),
          monthlyProgress: Math.min(100, Math.max(0, monthlyProgress)),
          xp: analytics.xp || prev.xp,
          coins: analytics.coins || prev.coins,
          level: analytics.level || prev.level,
          lastLogin: today
        };
      });

      // Store last login date
      localStorage.setItem('lastLoginDate', today);
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  };

  const handleDailyReward = () => {
    if (!dailyRewardClaimed) {
      const reward = {
        xp: 100,
        coins: Math.floor(Math.random() * 50) + 50
      };

      setUserStats(prev => ({
        ...prev,
        xp: prev.xp + reward.xp,
        coins: prev.coins + reward.coins
      }));

      setDailyRewardClaimed(true);
      localStorage.setItem('lastLoginDate', new Date().toDateString());
    }
  };

  const handleQuestComplete = (questId) => {
    const reward = questService.completeQuest(questId, userStats); // Updated to use questService
    if (reward) {
      setUserStats(prev => ({
        ...prev,
        xp: prev.xp + reward.xp,
        coins: prev.coins + reward.coins,
        completedQuests: [...prev.completedQuests, questId]
      }));

      // Check for level-up rewards
      const newLevel = Math.floor(userStats.xp / 1000) + 1;
      const currentLevel = Math.floor((userStats.xp - reward.xp) / 1000) + 1;
      if (newLevel > currentLevel) {
        // Level up rewards
        setUserStats(prev => ({
          ...prev,
          coins: prev.coins + 100 * newLevel, // Bonus coins for leveling up
        }));
      }
    }
  };

  const handlePurchasePremium = () => {
    if (userStats.coins >= 1000) { // Premium costs 1000 coins
      setUserStats(prev => ({
        ...prev,
        coins: prev.coins - 1000,
        premium: true
      }));
    }
  };

  const handleShareAchievement = async (achievement) => {
    try {
      // Generate share content
      const shareData = {
        title: 'Achievement Unlocked!',
        text: `I just unlocked the "${achievement.title}" achievement in Habit Master! 🎉`,
        url: 'https://habitmaster.app'
      };

      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share(shareData);
        
        // Reward user for sharing
        setUserStats(prev => ({
          ...prev,
          socialActions: [...prev.socialActions, 'share'],
          coins: prev.coins + 25,
          xp: prev.xp + 50
        }));
      }
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  if (!analytics) return null;

  return (
    <div className="dashboard">
      {!dailyRewardClaimed && (
        <div className="daily-reward" onClick={handleDailyReward}>
          <span className="reward-icon">🎁</span>
          <div className="reward-text">
            <h3>Daily Reward Available!</h3>
            <p>Click to claim your bonus XP and coins</p>
          </div>
        </div>
      )}
      <div className="dashboard-header">
        <div className="user-stats">
          <div className="stat-item">
            <div className="stat-icon-wrapper level">
              <span className="stat-icon" role="img" aria-label="Level">⚔️</span>
            </div>
            <span className="stat-value">{Math.floor(userStats.xp / 1000) + 1}</span>
            <span className="stat-label">Level</span>
            <div className="stat-progress">
              <div 
                className="stat-progress-bar" 
                style={{width: `${(userStats.xp % 1000) / 10}%`}}
              />
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon-wrapper xp">
              <span className="stat-icon" role="img" aria-label="Experience points">✨</span>
            </div>
            <span className="stat-value">{userStats.xp}</span>
            <span className="stat-label">Experience</span>
          </div>
          <div className="stat-item">
            <div className="stat-icon-wrapper coins">
              <span className="stat-icon" role="img" aria-label="Coins">💎</span>
            </div>
            <span className="stat-value">{userStats.coins}</span>
            <span className="stat-label">Gems</span>
          </div>
          <div className="stat-item">
            <div className="stat-icon-wrapper streak">
              <span className="stat-icon" role="img" aria-label="Streak">🔥</span>
            </div>
            <span className="stat-value">{userStats.currentStreak}</span>
            <span className="stat-label">Day Streak</span>
            {userStats.currentStreak > 0 && (
              <div className="streak-bonus">+{Math.min(50, userStats.currentStreak * 5)}% XP Bonus</div>
            )}
          </div>
        </div>
        
        <div className="quote-container">
          {quote && (
            <blockquote className="motivational-quote">
              {quote.quote}
              <footer>— {quote.author}</footer>
            </blockquote>
          )}
        </div>
      </div>

      {activeQuests.length > 0 && (
        <section className="quests-section">
          <h2>Active Quests</h2>
          <div className="quests-grid">
            {activeQuests.map(quest => (
              <div key={quest.id} className="quest-card">
                <div className="quest-header">
                  <span className="quest-icon">{quest.icon}</span>
                  <h3>{quest.title}</h3>
                </div>
                <p>{quest.description}</p>
                <div className="quest-progress">
                  <div 
                    className="quest-progress-bar"
                    style={{width: `${(quest.progress / quest.target) * 100}%`}}
                  />
                  <span>{quest.progress}/{quest.target}</span>
                </div>
                <div className="quest-rewards">
                  <span>🏆 {quest.rewards.xp} XP</span>
                  <span>💎 {quest.rewards.coins} coins</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="dashboard-grid">
        <section className="achievements-section">
          <h2>Recent Achievements</h2>
          <div className="achievements-grid">
            {achievements.slice(0, 3).map(achievement => (
              <div key={achievement.id} className="achievement-card">
                <div className="achievement-icon">{achievement.icon}</div>
                <div className="achievement-content">
                  <h3>{achievement.title}</h3>
                  <p>{achievement.description}</p>
                  <button 
                    className="share-button"
                    onClick={() => handleShareAchievement(achievement)}
                  >
                    Share 🔗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="analytics-section">
          <h2>Your Progress</h2>
          <div className="analytics-grid">
            <div className="analytics-card" title="Total number of habits you're tracking">
              <span className="analytics-icon" role="img" aria-label="Total Habits">📝</span>
              <h3>Total Habits</h3>
              <p className="analytics-value">{userStats.totalHabits || 0}</p>
            </div>
            <div className="analytics-card" title="Total days with completed habits">
              <span className="analytics-icon" role="img" aria-label="Completed Days">✅</span>
              <h3>Completed Days</h3>
              <p className="analytics-value">{userStats.completedDays || 0}</p>
            </div>
            <div className="analytics-card" title="Your longest streak of completing habits">
              <span className="analytics-icon" role="img" aria-label="Longest Streak">⚡️</span>
              <h3>Longest Streak</h3>
              <p className="analytics-value">{userStats.longestStreak || 0} days</p>
            </div>
            <div className="analytics-card" title="Total achievements unlocked">
              <span className="analytics-icon" role="img" aria-label="Achievements">🏆</span>
              <h3>Achievements</h3>
              <p className="analytics-value">{(userStats.completedAchievements || []).length}</p>
            </div>
          </div>
        </div>

        {!userStats.premium && (
          <section className="premium-section">
            <h2>Premium Features</h2>
            <div className="premium-features">
              <ul>
                <li>Custom Habit Icons</li>
                <li>Advanced Analytics</li>
                <li>Priority Support</li>
                <li>Exclusive Themes</li>
              </ul>
              <button 
                className={`premium-button ${userStats.coins >= 1000 ? 'available' : ''}`}
                onClick={handlePurchasePremium}
                disabled={userStats.coins < 1000}
              >
                Unlock Premium (1000 coins)
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
