import React, { useState, useEffect } from 'react';
import { questService } from '../../services/quests/QuestService'; // Updated import
import './QuestLog.css';

const QuestLog = ({ userProgress = {}, onQuestComplete }) => {
  const [quests, setQuests] = useState([]);
  const [dailyQuests, setDailyQuests] = useState([]);
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    if (userProgress && userProgress.id) {
      updateQuests();
    }
  }, [userProgress]);

  const updateQuests = async () => {
    try {
      const stats = {
        level: userProgress.level || 1,
        experience: userProgress.experience || 0,
        completedQuests: userProgress.completedQuests || [],
        currentStreak: userProgress.currentStreak || 0,
        categoryCompletions: userProgress.categoryCompletions || {},
        socialActions: userProgress.socialActions || []
      };

      const available = await questService.getAvailableQuests(userProgress.id, stats);
      const daily = await questService.getDailyQuests?.(userProgress.id) || [];
      
      // Check completion status
      const questsWithStatus = available.map(quest => ({
        ...quest,
        isComplete: questService.checkQuestCompletion(quest, stats),
        progress: calculateProgress(quest, stats)
      }));

      const dailyWithStatus = daily.map(quest => ({
        ...quest,
        isComplete: questService.checkQuestCompletion(quest, stats),
        progress: calculateProgress(quest, stats)
      }));

      setQuests(questsWithStatus);
      setDailyQuests(dailyWithStatus);
    } catch (error) {
      console.error('Error updating quests:', error);
    }
  };

  const calculateProgress = (quest, stats) => {
    if (!quest || !stats) return 0;
    
    switch (quest.type) {
      case 'streak':
        return Math.min(100, (stats.currentStreak / quest.requirement) * 100);
      case 'completion':
        return Math.min(100, (stats.completedDays / quest.requirement) * 100);
      case 'category':
        return Math.min(100, ((stats.categoryCompletions?.[quest.category] || 0) / quest.requirement) * 100);
      case 'social':
        return Math.min(100, ((stats.socialActions?.length || 0) / quest.requirement) * 100);
      default:
        return 0;
    }
  };

  const handleQuestClaim = (quest) => {
    if (quest.isComplete) {
      onQuestComplete(quest.id);
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'var(--legendary-color, #ffd700)';
      case 'epic': return 'var(--epic-color, #a335ee)';
      case 'rare': return 'var(--rare-color, #0070dd)';
      default: return 'var(--common-color, #9d9d9d)';
    }
  };

  const displayQuests = activeTab === 'daily' ? dailyQuests : quests;

  return (
    <div className="quest-log">
      <div className="quest-header">
        <h2>Quest Log</h2>
        <div className="quest-tabs">
          <button 
            className={`tab-button ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            Daily
          </button>
          <button 
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Quests
          </button>
        </div>
      </div>

      <div className="quests-container">
        {displayQuests.map(quest => (
          <div 
            key={quest.id} 
            className={`quest-card ${quest.isComplete ? 'complete' : ''}`}
            style={{ '--rarity-color': getRarityColor(quest.rarity) }}
          >
            <div className="quest-content">
              <div className="quest-icon">{quest.icon}</div>
              <div className="quest-info">
                <h3>
                  {quest.title}
                  <span className={`rarity-badge ${quest.rarity}`}>
                    {quest.rarity}
                  </span>
                </h3>
                <p>{quest.description}</p>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${quest.progress}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="quest-rewards">
              <div className="reward-item">
                <span role="img" aria-label="XP">✨</span>
                {quest.reward.xp} XP
              </div>
              <div className="reward-item">
                <span role="img" aria-label="Coins">🪙</span>
                {quest.reward.coins}
              </div>
              <button
                className={`claim-button ${quest.isComplete ? 'ready' : ''}`}
                onClick={() => handleQuestClaim(quest)}
                disabled={!quest.isComplete}
              >
                {quest.isComplete ? 'Claim' : 'In Progress'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestLog;
