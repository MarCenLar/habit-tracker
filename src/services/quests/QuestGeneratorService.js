import { reminderService } from '../reminders/ReminderService';
import { analyticsService } from '../AnalyticsService';

class QuestGeneratorService {
  constructor() {
    this.questTemplates = {
      habit: [
        {
          type: 'streak',
          templates: [
            {
              title: '{habitName} Streak Master',
              description: 'Complete {habitName} for {days} days in a row',
              difficulty: (days) => Math.min(Math.ceil(days / 3), 5),
              params: { days: [3, 5, 7, 14, 30] }
            }
          ]
        },
        {
          type: 'completion',
          templates: [
            {
              title: 'Perfect Week: {habitName}',
              description: 'Complete {habitName} every day this week',
              difficulty: 3,
              duration: '7d'
            }
          ]
        }
      ],
      category: [
        {
          type: 'mastery',
          templates: [
            {
              title: '{category} Master',
              description: 'Complete all {category} habits for {days} days',
              difficulty: (days) => Math.min(Math.ceil(days / 2), 5),
              params: { days: [3, 5, 7] }
            }
          ]
        }
      ],
      social: [
        {
          type: 'challenge',
          templates: [
            {
              title: 'Social Butterfly',
              description: 'Join {count} group challenges',
              difficulty: (count) => Math.min(count, 4),
              params: { count: [1, 3, 5] }
            }
          ]
        }
      ],
      special: [
        {
          type: 'milestone',
          templates: [
            {
              title: 'Rising Star',
              description: 'Reach level {level}',
              difficulty: (level) => level,
              params: { level: [5, 10, 20, 50] }
            }
          ]
        }
      ]
    };

    this.difficultyFactors = {
      completionRate: {
        weight: 0.4,
        threshold: 0.7
      },
      streakLength: {
        weight: 0.3,
        threshold: 5
      },
      habitCount: {
        weight: 0.2,
        threshold: 5
      },
      activeTime: {
        weight: 0.1,
        threshold: 14 // days
      }
    };
  }

  generateQuests(userStats) {
    const quests = [];
    const userLevel = this.calculateUserLevel(userStats);
    const difficultyRange = this.calculateDifficultyRange(userStats);

    // Generate habit-specific quests
    for (const habit of userStats.habits) {
      if (this.shouldGenerateQuestForHabit(habit)) {
        const questType = this.selectQuestType(habit);
        const template = this.selectTemplate(questType, difficultyRange);
        quests.push(this.createQuest(template, { habit, userLevel }));
      }
    }

    // Generate category quests
    for (const category of Object.keys(userStats.categoryProgress)) {
      if (this.shouldGenerateQuestForCategory(category, userStats)) {
        const template = this.selectTemplate('category', difficultyRange);
        quests.push(this.createQuest(template, { category, userLevel }));
      }
    }

    // Generate special quests based on user progress
    const specialQuests = this.generateSpecialQuests(userStats, difficultyRange);
    quests.push(...specialQuests);

    return this.prioritizeAndFilter(quests, userStats);
  }

  calculateUserLevel(stats) {
    const baseXP = stats.totalCompletions * 10;
    const streakBonus = stats.longestStreak * 5;
    const categoryBonus = Object.keys(stats.categoryProgress).length * 20;
    const totalXP = baseXP + streakBonus + categoryBonus;
    
    return Math.floor(Math.sqrt(totalXP / 100)) + 1;
  }

  calculateDifficultyRange(stats) {
    let baseScore = 0;
    
    for (const [factor, config] of Object.entries(this.difficultyFactors)) {
      const value = stats[factor];
      const normalized = Math.min(value / config.threshold, 1);
      baseScore += normalized * config.weight;
    }

    // Scale to 1-5 range
    const avgDifficulty = Math.max(1, Math.min(5, Math.round(baseScore * 5)));
    
    return {
      min: Math.max(1, avgDifficulty - 1),
      target: avgDifficulty,
      max: Math.min(5, avgDifficulty + 1)
    };
  }

  shouldGenerateQuestForHabit(habit) {
    const lastQuestTime = habit.lastQuestGenerated || 0;
    const timeSinceLastQuest = Date.now() - lastQuestTime;
    const minInterval = 24 * 60 * 60 * 1000; // 24 hours

    return timeSinceLastQuest >= minInterval && 
           habit.completionRate >= 0.3; // Only generate for somewhat active habits
  }

  shouldGenerateQuestForCategory(category, stats) {
    const categoryStats = stats.categoryProgress[category];
    const hasActiveHabits = categoryStats.activeHabits > 0;
    const hasRecentActivity = (Date.now() - categoryStats.lastActivity) < 7 * 24 * 60 * 60 * 1000;
    
    return hasActiveHabits && hasRecentActivity;
  }

  selectQuestType(habit) {
    const types = ['streak', 'completion', 'mastery'];
    const weights = {
      streak: habit.streakCount > 0 ? 0.4 : 0.2,
      completion: 0.3,
      mastery: habit.completionRate >= 0.7 ? 0.3 : 0.1
    };

    return this.weightedRandom(types, weights);
  }

  selectTemplate(type, difficultyRange) {
    const validTemplates = this.questTemplates[type].filter(template => 
      template.difficulty >= difficultyRange.min && 
      template.difficulty <= difficultyRange.max
    );

    if (validTemplates.length === 0) {
      return this.questTemplates[type][0]; // Fallback to first template
    }

    return validTemplates[Math.floor(Math.random() * validTemplates.length)];
  }

  createQuest(template, context) {
    const quest = {
      id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      title: this.formatTemplate(template.title, context),
      description: this.formatTemplate(template.description, context),
      difficulty: typeof template.difficulty === 'function' 
        ? template.difficulty(context.userLevel)
        : template.difficulty,
      requirements: this.generateRequirements(template, context),
      rewards: this.generateRewards(template, context),
      duration: template.duration || null,
      createdAt: new Date().toISOString()
    };

    return quest;
  }

  formatTemplate(template, context) {
    return template.replace(/\{(\w+)\}/g, (match, key) => context[key] || match);
  }

  generateRequirements(template, context) {
    const requirements = [];

    if (template.type === 'streak') {
      requirements.push({
        type: 'streak',
        count: this.selectParameterValue(template.params.days, context.userLevel),
        habitId: context.habit?.id
      });
    } else if (template.type === 'completion') {
      requirements.push({
        type: 'completion',
        count: this.selectParameterValue(template.params?.count || [7], context.userLevel),
        period: template.duration || '7d',
        habitId: context.habit?.id
      });
    }

    return requirements;
  }

  generateRewards(template, context) {
    const baseReward = template.difficulty * 100;
    const levelMultiplier = 1 + (context.userLevel - 1) * 0.1;
    
    return {
      xp: Math.round(baseReward * levelMultiplier),
      coins: Math.round(baseReward * levelMultiplier * 0.5),
      special: template.specialReward || null
    };
  }

  selectParameterValue(values, userLevel) {
    const index = Math.min(
      Math.floor((userLevel - 1) / 5),
      values.length - 1
    );
    return values[index];
  }

  weightedRandom(items, weights) {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= weights[item];
      if (random <= 0) return item;
    }
    
    return items[0];
  }

  prioritizeAndFilter(quests, userStats) {
    return quests
      .sort((a, b) => {
        // Prioritize based on multiple factors
        const aScore = this.calculateQuestPriority(a, userStats);
        const bScore = this.calculateQuestPriority(b, userStats);
        return bScore - aScore;
      })
      .slice(0, 5); // Limit to top 5 most relevant quests
  }

  calculateQuestPriority(quest, userStats) {
    let score = 0;

    // Base difficulty alignment
    score += (5 - Math.abs(quest.difficulty - userStats.averageDifficulty)) * 2;

    // Habit activity bonus
    if (quest.habitId) {
      const habit = userStats.habits.find(h => h.id === quest.habitId);
      if (habit) {
        score += habit.completionRate * 3;
      }
    }

    // Category engagement bonus
    if (quest.category) {
      const categoryStats = userStats.categoryProgress[quest.category];
      if (categoryStats) {
        score += categoryStats.engagementScore * 2;
      }
    }

    return score;
  }
}

export { QuestGeneratorService };
