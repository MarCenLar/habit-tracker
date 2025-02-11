// src/services/quests/QuestService.js
import { QuestProgressionService } from './QuestProgressionService';
import { QuestGeneratorService } from './QuestGeneratorService'; 
import { QuestRewardService } from './QuestRewardService';
import { reminderService } from '../reminders/ReminderService';

class QuestService {
  constructor() {
    this.progression = new QuestProgressionService();
    this.generator = new QuestGeneratorService();
    this.rewards = new QuestRewardService();
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('quests')) {
      localStorage.setItem('quests', JSON.stringify({
        active: [],
        completed: [],
        storylines: {},
        chains: {},
        userPreferences: {},
        metrics: {}
      }));
    }
  }

  async getAvailableQuests(userId, stats) {
    const data = this.getData();
    const userProgress = this.progression.getUserProgress(userId);
    const completedQuests = new Set(userProgress.completedQuests);
    
    // Get base quests filtered by completion
    let availableQuests = this.generator.generateQuests(stats).filter(quest => 
      !completedQuests.has(quest.id)
    );

    // Add storyline quests if available
    const activeStorylines = Object.entries(data.storylines)
      .filter(([_, story]) => story.active && !story.completed);
      
    for (const [storyId, story] of activeStorylines) {
      const nextQuest = this.progression.getNextStorylineQuest(storyId, userId);
      if (nextQuest) {
        availableQuests.push({
          ...nextQuest,
          storyline: storyId,
          chapter: story.currentChapter
        });
      }
    }

    // Add chain quests if requirements met
    const availableChains = Object.entries(data.chains)
      .filter(([_, chain]) => 
        this.progression.checkChainRequirements(chain, userProgress)
      );

    for (const [chainId, chain] of availableChains) {
      const nextQuest = this.progression.getNextChainQuest(chainId, userId);
      if (nextQuest) {
        availableQuests.push({
          ...nextQuest,
          chain: chainId,
          position: chain.currentPosition
        });
      }
    }

    // Sort by difficulty and user preferences
    availableQuests = this.sortQuestsByRelevance(availableQuests, userId, stats);

    return availableQuests;
  }

  sortQuestsByRelevance(quests, userId, stats) {
    const userPrefs = this.getData().userPreferences[userId] || {};
    const questMetrics = this.getData().metrics;
    
    return quests.sort((a, b) => {
      // Priority factors
      const aScore = this.calculateQuestScore(a, userPrefs, questMetrics, stats);
      const bScore = this.calculateQuestScore(b, userPrefs, questMetrics, stats);
      
      return bScore - aScore;
    });
  }

  calculateQuestScore(quest, userPrefs, metrics, stats) {
    let score = 0;
    
    // Dynamic difficulty adjustment
    const difficultyMatch = Math.abs(quest.difficulty - stats.averageCompletion);
    const timeOfDay = new Date().getHours();
    const isUserActiveTime = timeOfDay >= userPrefs.activeHoursStart && timeOfDay <= userPrefs.activeHoursEnd;
    
    // Base difficulty score with time-based adjustment
    score += (1 - difficultyMatch) * (isUserActiveTime ? 2.5 : 1.5);

    // User preferences with weighted categories
    if (userPrefs.preferredTypes?.includes(quest.type)) {
      score += userPrefs.typeWeights?.[quest.type] || 1;
    }
    if (userPrefs.favoriteCategories?.includes(quest.category)) {
      score += userPrefs.categoryWeights?.[quest.category] || 1;
    }

    // Recent success rate influence
    const recentSuccess = stats.recentCompletionRate || 0.5;
    score += (recentSuccess * 1.5);

    // Quest metrics with engagement factors
    const questStats = metrics[quest.id];
    if (questStats) {
      score += questStats.completionRate * 0.5;
      score += questStats.averageRating * 0.3;
      score += (1 - questStats.abandonmentRate) * 0.4;
      
      // Engagement trend bonus
      if (questStats.recentEngagement > questStats.averageEngagement) {
        score += 0.5;
      }
    }

    // Special quest bonuses with streak multipliers
    if (quest.storyline) {
      const storylineStreak = this.getStorylineStreak(quest.storyline);
      score += 2 * (1 + (storylineStreak * 0.1));
    }
    if (quest.chain) {
      const chainStreak = this.getChainStreak(quest.chain);
      score += 1.5 * (1 + (chainStreak * 0.15));
    }

    // Time-sensitive bonus
    if (quest.duration && quest.duration < stats.averageQuestDuration) {
      score += 0.5;
    }

    // Variety bonus (encourage diverse quest types)
    const activeQuestTypes = new Set(stats.recentQuests?.map(q => q.type) || []);
    if (!activeQuestTypes.has(quest.type)) {
      score += 0.7;
    }

    return score;
  }

  async acceptQuest(questId, userId) {
    const data = this.getData();
    const quest = await this.generator.getQuestById(questId);
    
    if (!quest) throw new Error('Quest not found');

    // Check if quest is already active for this user
    const isAlreadyActive = data.active.some(
      q => q.id === questId && q.userId === userId
    );
    if (isAlreadyActive) {
      throw new Error('Quest is already active');
    }

    // Validate quest requirements
    if (!this.progression.checkQuestRequirements(quest, userId)) {
      throw new Error('Quest requirements not met');
    }

    // Add to active quests with proper initialization
    const activeQuest = {
      ...quest,
      acceptedAt: new Date().toISOString(),
      progress: 0,
      userId,
      status: 'active',
      lastUpdated: new Date().toISOString()
    };

    data.active.push(activeQuest);
    this.saveData(data);

    // Set up tracking and reminders
    try {
      await this.progression.initializeQuestTracking(activeQuest);
      await this.setupQuestReminders(activeQuest);
    } catch (error) {
      // Rollback if setup fails
      data.active = data.active.filter(q => q.id !== questId);
      this.saveData(data);
      throw new Error(`Failed to initialize quest: ${error.message}`);
    }

    return activeQuest;
  }

  async updateQuestProgress(questId, userId, progress) {
    const data = this.getData();
    const quest = data.active.find(q => q.id === questId && q.userId === userId);
    
    if (!quest) throw new Error('Quest not found');

    // Validate progress value
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      throw new Error('Invalid progress value. Must be between 0 and 100');
    }

    const oldProgress = quest.progress;
    quest.progress = progress;
    quest.lastUpdated = new Date().toISOString();

    try {
      // Check milestones
      const milestones = await this.progression.checkMilestones(quest, oldProgress);
      if (milestones.length > 0) {
        await this.rewards.awardMilestoneRewards(milestones, userId);
      }

      // Check for regressions (if progress decreased significantly)
      if (progress < oldProgress - 10) {
        this.updateQuestMetrics(quest, { regression: true });
      }

      // Check completion
      if (progress >= 100) {
        return await this.completeQuest(quest);
      }

      this.saveData(data);
      return quest;
    } catch (error) {
      // Restore old progress on error
      quest.progress = oldProgress;
      this.saveData(data);
      throw new Error(`Failed to update quest progress: ${error.message}`);
    }
  }

  async completeQuest(quest) {
    const data = this.getData();
    const completionTime = new Date();
    
    // Calculate performance metrics
    const timeSpent = completionTime - new Date(quest.acceptedAt);
    const efficiency = this.calculateEfficiencyScore(quest, timeSpent);
    const accuracy = this.calculateAccuracyScore(quest);
    
    // Enhanced completion data
    data.completed.push({
      ...quest,
      completedAt: completionTime.toISOString(),
      performance: {
        timeSpent,
        efficiency,
        accuracy,
        streakMaintained: true
      }
    });
    data.active = data.active.filter(q => q.id !== quest.id);

    // Update progression with enhanced tracking
    if (quest.storyline) {
      const storylineProgress = await this.progression.advanceStoryline(quest.storyline, quest.userId);
      this.updateStorylineStreak(quest.storyline, true);
      
      // Unlock bonus content if streak maintained
      if (storylineProgress.streak >= 3) {
        await this.unlockBonusContent(quest.storyline);
      }
    }
    
    if (quest.chain) {
      const chainProgress = await this.progression.advanceChain(quest.chain, quest.userId);
      this.updateChainStreak(quest.chain, true);
      
      // Apply chain bonuses
      if (chainProgress.streak >= 5) {
        await this.applyChainBonus(quest.chain);
      }
    }

    // Calculate dynamic rewards based on performance
    const baseRewards = await this.rewards.calculateQuestRewards(quest);
    const finalRewards = this.applyPerformanceMultipliers(baseRewards, {
      efficiency,
      accuracy,
      streak: Math.max(
        this.getStorylineStreak(quest.storyline),
        this.getChainStreak(quest.chain)
      )
    });

    await this.rewards.grantRewards(finalRewards, quest.userId);

    // Update comprehensive metrics
    this.updateQuestMetrics(quest, {
      efficiency,
      accuracy,
      timeSpent,
      finalRewards
    });

    this.saveData(data);
    
    // Return enhanced completion data
    return {
      rewards: finalRewards,
      performance: {
        efficiency,
        accuracy,
        timeSpent,
        streakMaintained: true
      }
    };
  }

  async setupQuestReminders(quest) {
    if (!quest.reminderPreference) return;

    const reminder = {
      id: `quest_${quest.id}`,
      type: 'quest',
      title: quest.title,
      message: `Time to work on your quest: ${quest.title}`,
      schedule: quest.reminderPreference,
      data: { questId: quest.id }
    };

    await reminderService.scheduleReminder(reminder);
  }

  updateQuestMetrics(quest, performance) {
    const data = this.getData();
    const metrics = data.metrics[quest.id] || {
      attempts: 0,
      completions: 0,
      averageTime: 0,
      completionRate: 0,
      averageRating: 0,
      ratings: [],
      abandonmentRate: 0,
      averageEfficiency: 0,
      averageAccuracy: 0,
      recentEngagement: 0,
      streakHistory: [],
      difficultyAdjustments: [],
      completionTimeDistribution: [],
      userFeedback: []
    };

    // Update basic metrics
    metrics.attempts++;
    if (quest.progress >= 100) {
      metrics.completions++;
    }

    // Performance metrics
    metrics.averageTime = this.calculateMovingAverage(
      metrics.averageTime,
      performance.timeSpent,
      metrics.attempts
    );
    metrics.averageEfficiency = this.calculateMovingAverage(
      metrics.averageEfficiency,
      performance.efficiency,
      metrics.completions
    );
    metrics.averageAccuracy = this.calculateMovingAverage(
      metrics.averageAccuracy,
      performance.accuracy,
      metrics.completions
    );

    // Engagement metrics
    metrics.completionRate = (metrics.completions / metrics.attempts) * 100;
    metrics.recentEngagement = this.calculateRecentEngagement(quest.id);
    
    // Time distribution for analytics
    metrics.completionTimeDistribution.push({
      time: performance.timeSpent,
      date: new Date().toISOString()
    });

    // Keep last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    metrics.completionTimeDistribution = metrics.completionTimeDistribution
      .filter(entry => new Date(entry.date) > thirtyDaysAgo);

    data.metrics[quest.id] = metrics;
    this.saveData(data);

    // Trigger difficulty adjustment if needed
    if (this.shouldAdjustDifficulty(metrics)) {
      this.adjustQuestDifficulty(quest.id, metrics);
    }
  }

  async getActiveQuests(userId = null) {
    const data = this.getData();
    if (!userId) {
      return data.active;
    }
    return data.active.filter(quest => quest.userId === userId);
  }

  getData() {
    return JSON.parse(localStorage.getItem('quests'));
  }

  saveData(data) {
    localStorage.setItem('quests', JSON.stringify(data));
  }

  // Streak Management
  getStorylineStreak(storylineId) {
    const data = this.getData();
    return data.storylines[storylineId]?.streak || 0;
  }

  getChainStreak(chainId) {
    const data = this.getData();
    return data.chains[chainId]?.streak || 0;
  }

  updateStorylineStreak(storylineId, maintained) {
    const data = this.getData();
    if (!data.storylines[storylineId]) {
      data.storylines[storylineId] = { streak: 0 };
    }
    if (maintained) {
      data.storylines[storylineId].streak++;
    } else {
      data.storylines[storylineId].streak = 0;
    }
    this.saveData(data);
  }

  updateChainStreak(chainId, maintained) {
    const data = this.getData();
    if (!data.chains[chainId]) {
      data.chains[chainId] = { streak: 0 };
    }
    if (maintained) {
      data.chains[chainId].streak++;
    } else {
      data.chains[chainId].streak = 0;
    }
    this.saveData(data);
  }

  // Performance Metrics
  calculateEfficiencyScore(quest, timeSpent) {
    const expectedTime = quest.expectedDuration || 3600000; // default 1 hour
    const timeFactor = Math.min(expectedTime / timeSpent, 2); // cap at 2x efficiency
    return Math.round((timeFactor * 100) * 10) / 10; // round to 1 decimal place
  }

  calculateAccuracyScore(quest) {
    // Calculate accuracy based on quest requirements and completion quality
    const requiredSteps = quest.requirements?.length || 1;
    const completedSteps = quest.progress || 0;
    return Math.round((completedSteps / requiredSteps * 100) * 10) / 10;
  }

  calculateMovingAverage(currentAvg, newValue, totalCount) {
    return (currentAvg * (totalCount - 1) + newValue) / totalCount;
  }

  calculateRecentEngagement(questId) {
    const data = this.getData();
    const metrics = data.metrics[questId];
    if (!metrics) return 0;

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Count completions in last 7 days
    const recentEntries = metrics.completionTimeDistribution
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= sevenDaysAgo && entryDate <= now;
      });

    // If less than 7 days of data, adjust average calculation
    const daysWithData = new Set(
      recentEntries.map(entry => entry.date.split('T')[0])
    ).size;

    if (daysWithData === 0) return 0;

    // Calculate average based on actual days with data
    return recentEntries.length / Math.min(daysWithData, 7);
  }

  // Reward Calculations
  applyPerformanceMultipliers(baseRewards, performance) {
    const multiplier = this.calculateRewardMultiplier(performance);
    return Object.entries(baseRewards).reduce((acc, [key, value]) => {
      acc[key] = Math.round(value * multiplier);
      return acc;
    }, {});
  }

  calculateRewardMultiplier(performance) {
    let multiplier = 1;

    // Efficiency bonus (up to 50% bonus)
    if (performance.efficiency > 100) {
      multiplier += (performance.efficiency - 100) / 200;
    }

    // Accuracy bonus (up to 30% bonus)
    multiplier += (performance.accuracy / 100) * 0.3;

    // Streak bonus (up to 100% bonus)
    if (performance.streak > 0) {
      multiplier += Math.min(performance.streak * 0.1, 1);
    }

    return Math.min(multiplier, 3); // Cap at 3x rewards
  }

  // Difficulty Adjustment
  shouldAdjustDifficulty(metrics) {
    const recentCompletionRate = metrics.completionTimeDistribution
      .slice(-5)
      .filter(entry => entry.time < metrics.averageTime).length / 5;

    return recentCompletionRate > 0.8 || recentCompletionRate < 0.2;
  }

  async adjustQuestDifficulty(questId, metrics) {
    const quest = await this.generator.getQuestById(questId);
    if (!quest) return;

    const recentCompletionRate = metrics.completionTimeDistribution
      .slice(-5)
      .filter(entry => entry.time < metrics.averageTime).length / 5;

    // Adjust difficulty based on recent completion rate
    let difficultyDelta = 0;
    if (recentCompletionRate > 0.8) {
      difficultyDelta = 0.1; // Increase difficulty
    } else if (recentCompletionRate < 0.2) {
      difficultyDelta = -0.1; // Decrease difficulty
    }

    const newDifficulty = Math.max(0.1, Math.min(1, quest.difficulty + difficultyDelta));
    
    // Store difficulty adjustment
    const data = this.getData();
    if (!data.metrics[questId].difficultyAdjustments) {
      data.metrics[questId].difficultyAdjustments = [];
    }

    data.metrics[questId].difficultyAdjustments.push({
      date: new Date().toISOString(),
      oldDifficulty: quest.difficulty,
      newDifficulty,
      reason: recentCompletionRate > 0.8 ? 'too_easy' : 'too_hard'
    });

    this.saveData(data);
    await this.generator.updateQuestDifficulty(questId, newDifficulty);
  }

  // Bonus Content
  async unlockBonusContent(storylineId) {
    const data = this.getData();
    if (!data.storylines[storylineId].bonusContent) {
      data.storylines[storylineId].bonusContent = {
        unlockedAt: new Date().toISOString(),
        type: 'achievement',
        reward: {
          gems: 500,
          title: 'Storyline Master',
          badge: `storyline_${storylineId}_master`
        }
      };
      this.saveData(data);
      await this.rewards.grantBonusReward(data.storylines[storylineId].bonusContent.reward);
    }
  }

  async applyChainBonus(chainId) {
    const data = this.getData();
    const chain = data.chains[chainId];
    if (!chain.bonusApplied) {
      const bonus = {
        type: 'chain_mastery',
        multiplier: 1.5,
        duration: 24 * 60 * 60 * 1000, // 24 hours
        activatedAt: new Date().toISOString()
      };
      
      data.chains[chainId].bonusApplied = true;
      data.chains[chainId].activeBonus = bonus;
      this.saveData(data);
      
      await this.rewards.activateChainBonus(chainId, bonus);
    }
  }
}

export const questService = new QuestService();
