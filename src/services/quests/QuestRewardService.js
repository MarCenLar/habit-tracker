import { analyticsService } from '../AnalyticsService';

class QuestRewardService {
  constructor() {
    this.initializeData();
    this.rewardMultipliers = {
      streak: {
        base: 1.0,
        increment: 0.1,  // +10% per streak level
        max: 2.0
      },
      difficulty: {
        base: 1.0,
        increment: 0.2,  // +20% per difficulty level
        max: 2.5
      },
      speed: {
        base: 1.0,
        increment: 0.15, // +15% for fast completion
        max: 1.5
      },
      chain: {
        base: 1.0,
        increment: 0.05, // +5% per chain quest
        max: 1.5
      }
    };
  }

  initializeData() {
    if (!localStorage.getItem('questRewards')) {
      localStorage.setItem('questRewards', JSON.stringify({
        userRewards: {},
        rewardHistory: [],
        achievementProgress: {},
        milestoneRewards: {}
      }));
    }
  }

  async calculateQuestRewards(quest, userStats) {
    const baseRewards = this.getBaseRewards(quest);
    const multiplier = await this.calculateRewardMultiplier(quest, userStats);
    
    const rewards = {
      xp: Math.round(baseRewards.xp * multiplier),
      coins: Math.round(baseRewards.coins * multiplier),
      items: [],
      achievements: [],
      streakBonus: 0
    };

    // Add bonus rewards based on performance
    const bonusRewards = await this.calculateBonusRewards(quest, userStats);
    Object.assign(rewards, bonusRewards);

    // Add special rewards if applicable
    const specialRewards = await this.calculateSpecialRewards(quest, userStats);
    if (specialRewards) {
      Object.assign(rewards, specialRewards);
    }

    return rewards;
  }

  getBaseRewards(quest) {
    const difficultyMultiplier = 1 + ((quest.difficulty - 1) * 0.2);
    
    return {
      xp: Math.round(100 * difficultyMultiplier),
      coins: Math.round(50 * difficultyMultiplier)
    };
  }

  async calculateRewardMultiplier(quest, userStats) {
    let multiplier = 1.0;

    // Streak bonus
    if (userStats.currentStreak > 0) {
      const streakMultiplier = Math.min(
        this.rewardMultipliers.streak.base + 
        (this.rewardMultipliers.streak.increment * Math.floor(userStats.currentStreak / 3)),
        this.rewardMultipliers.streak.max
      );
      multiplier *= streakMultiplier;
    }

    // Difficulty bonus
    const difficultyMultiplier = Math.min(
      this.rewardMultipliers.difficulty.base +
      (this.rewardMultipliers.difficulty.increment * (quest.difficulty - 1)),
      this.rewardMultipliers.difficulty.max
    );
    multiplier *= difficultyMultiplier;

    // Speed completion bonus
    if (this.isSpeedCompletion(quest)) {
      multiplier *= this.rewardMultipliers.speed.max;
    }

    // Chain bonus
    if (quest.chain) {
      const chainPosition = await this.getChainPosition(quest.chain);
      const chainMultiplier = Math.min(
        this.rewardMultipliers.chain.base +
        (this.rewardMultipliers.chain.increment * chainPosition),
        this.rewardMultipliers.chain.max
      );
      multiplier *= chainMultiplier;
    }

    return multiplier;
  }

  async calculateBonusRewards(quest, userStats) {
    const bonusRewards = {
      streakBonus: 0,
      items: []
    };

    // Streak milestone rewards
    if (userStats.currentStreak > 0) {
      const streakMilestones = [7, 14, 30, 60, 90];
      for (const milestone of streakMilestones) {
        if (userStats.currentStreak >= milestone && 
            !this.hasReceivedStreakReward(userStats.id, milestone)) {
          bonusRewards.streakBonus += milestone * 10;
          bonusRewards.items.push({
            type: 'badge',
            id: `streak_${milestone}`,
            name: `${milestone} Day Streak`,
            rarity: this.getStreakBadgeRarity(milestone)
          });
          await this.recordStreakReward(userStats.id, milestone);
        }
      }
    }

    // Performance bonuses
    const performance = await analyticsService.getQuestPerformance(quest.id);
    if (performance && performance.averageCompletion > 90) {
      bonusRewards.items.push({
        type: 'achievement',
        id: `perfect_${quest.id}`,
        name: 'Perfect Performance',
        xpBonus: 50
      });
    }

    return bonusRewards;
  }

  async calculateSpecialRewards(quest, userStats) {
    if (!quest.specialRewards) return null;

    const rewards = {
      items: []
    };

    for (const reward of quest.specialRewards) {
      switch (reward.type) {
        case 'unlock':
          if (await this.checkUnlockRequirements(reward, userStats)) {
            rewards.items.push({
              type: 'feature',
              id: reward.featureId,
              name: reward.name,
              description: reward.description
            });
          }
          break;

        case 'milestone':
          if (await this.checkMilestoneAchieved(reward, userStats)) {
            rewards.items.push({
              type: 'milestone',
              id: reward.id,
              name: reward.name,
              xpBonus: reward.xpBonus || 100
            });
          }
          break;

        case 'rare':
          if (this.shouldAwardRareReward(reward, userStats)) {
            rewards.items.push({
              type: reward.itemType,
              id: reward.itemId,
              name: reward.name,
              rarity: 'rare',
              boost: reward.boost
            });
          }
          break;
      }
    }

    return rewards;
  }

  isSpeedCompletion(quest) {
    const completionTime = new Date(quest.completedAt) - new Date(quest.startedAt);
    const expectedTime = this.getExpectedCompletionTime(quest);
    return completionTime <= expectedTime * 0.7; // 30% faster than expected
  }

  getExpectedCompletionTime(quest) {
    // Base time in milliseconds
    const baseTime = 24 * 60 * 60 * 1000; // 1 day
    return baseTime * quest.difficulty;
  }

  getStreakBadgeRarity(streak) {
    if (streak >= 90) return 'legendary';
    if (streak >= 30) return 'epic';
    if (streak >= 14) return 'rare';
    return 'common';
  }

  async getChainPosition(chainId) {
    const data = this.getData();
    const chainProgress = data.userRewards.chainProgress || {};
    return chainProgress[chainId]?.position || 0;
  }

  hasReceivedStreakReward(userId, milestone) {
    const data = this.getData();
    const rewards = data.userRewards[userId]?.streakRewards || [];
    return rewards.includes(milestone);
  }

  async recordStreakReward(userId, milestone) {
    const data = this.getData();
    if (!data.userRewards[userId]) {
      data.userRewards[userId] = { streakRewards: [] };
    }
    data.userRewards[userId].streakRewards.push(milestone);
    this.saveData(data);
  }

  async awardMilestoneRewards(milestones, userId) {
    const rewards = [];
    
    for (const milestone of milestones) {
      const reward = {
        type: 'milestone',
        id: milestone.id,
        name: milestone.name,
        xp: milestone.xpReward || 50,
        coins: milestone.coinReward || 25
      };

      if (milestone.specialReward) {
        reward.special = milestone.specialReward;
      }

      rewards.push(reward);
    }

    const data = this.getData();
    data.milestoneRewards[userId] = [
      ...(data.milestoneRewards[userId] || []),
      ...rewards
    ];
    this.saveData(data);

    return rewards;
  }

  getData() {
    return JSON.parse(localStorage.getItem('questRewards'));
  }

  saveData(data) {
    localStorage.setItem('questRewards', JSON.stringify(data));
  }
}

// Change to named export
export { QuestRewardService };
