class ProgressionService {
  constructor() {
    this.initializeData();
  }

  initializeData() {
    const savedData = localStorage.getItem('progressionData');
    if (savedData) {
      const data = JSON.parse(savedData);
      this.level = data.level || 1;
      this.experience = data.experience || 0;
      this.completedAchievements = data.completedAchievements || [];
      this.streaks = data.streaks || {};
    } else {
      this.level = 1;
      this.experience = 0;
      this.completedAchievements = [];
      this.streaks = {};
      this.saveData();
    }
  }

  saveData() {
    const data = {
      level: this.level,
      experience: this.experience,
      completedAchievements: this.completedAchievements,
      streaks: this.streaks
    };
    localStorage.setItem('progressionData', JSON.stringify(data));
  }

  getAllAchievements() {
    return [
      {
        id: 'first_habit',
        name: 'Getting Started',
        description: 'Create your first habit',
        icon: '🌱',
        requirement: { type: 'habit_count', count: 1 }
      },
      {
        id: 'habit_master',
        name: 'Habit Master',
        description: 'Complete 100 habit check-ins',
        icon: '⭐',
        requirement: { type: 'completion_count', count: 100 }
      },
      {
        id: 'streak_warrior',
        name: 'Streak Warrior',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        requirement: { type: 'streak_days', count: 7 }
      },
      {
        id: 'diversity_champion',
        name: 'Diversity Champion',
        description: 'Have active habits in 5 different categories',
        icon: '🌈',
        requirement: { type: 'category_count', count: 5 }
      },
      {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Complete 10 habits before 9 AM',
        icon: '🌅',
        requirement: { type: 'morning_completions', count: 10 }
      },
      {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Achieve 100% completion rate for a week',
        icon: '💯',
        requirement: { type: 'perfect_week', count: 1 }
      }
    ];
  }

  getAvailableAchievements() {
    return this.getAllAchievements().filter(achievement => 
      !this.completedAchievements.includes(achievement.id)
    );
  }

  getCompletedAchievements() {
    return this.getAllAchievements().filter(achievement => 
      this.completedAchievements.includes(achievement.id)
    );
  }

  async checkAchievements(habitData) {
    const newAchievements = [];
    const available = this.getAvailableAchievements();

    for (const achievement of available) {
      if (await this.checkAchievementRequirement(achievement, habitData)) {
        this.completedAchievements.push(achievement.id);
        newAchievements.push(achievement);
        this.awardExperience(100); // Award XP for achievement
      }
    }

    if (newAchievements.length > 0) {
      this.saveData();
    }

    return newAchievements;
  }

  async checkAchievementRequirement(achievement, habitData) {
    switch (achievement.requirement.type) {
      case 'habit_count':
        return habitData.totalHabits >= achievement.requirement.count;
      case 'completion_count':
        return habitData.totalCompletions >= achievement.requirement.count;
      case 'streak_days':
        return Object.values(this.streaks).some(streak => 
          streak >= achievement.requirement.count
        );
      case 'category_count':
        return new Set(habitData.categories).size >= achievement.requirement.count;
      case 'morning_completions':
        return habitData.morningCompletions >= achievement.requirement.count;
      case 'perfect_week':
        return habitData.perfectWeeks >= achievement.requirement.count;
      default:
        return false;
    }
  }

  updateStreak(habitId, completed) {
    const today = new Date().toISOString().split('T')[0];
    
    if (!this.streaks[habitId]) {
      this.streaks[habitId] = {
        count: completed ? 1 : 0,
        lastUpdate: today
      };
    } else {
      const lastUpdate = new Date(this.streaks[habitId].lastUpdate);
      const currentDate = new Date(today);
      const daysDiff = Math.floor((currentDate - lastUpdate) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1 && completed) {
        this.streaks[habitId].count++;
      } else if (daysDiff > 1 || !completed) {
        this.streaks[habitId].count = completed ? 1 : 0;
      }
      this.streaks[habitId].lastUpdate = today;
    }

    this.saveData();
    return this.streaks[habitId].count;
  }

  awardExperience(amount) {
    this.experience += amount;
    
    // Check for level up
    const nextLevelThreshold = this.level * 1000;
    if (this.experience >= nextLevelThreshold) {
      this.level++;
      this.experience -= nextLevelThreshold;
    }

    this.saveData();
    return {
      level: this.level,
      experience: this.experience,
      nextLevelThreshold
    };
  }

  getProgress() {
    return {
      level: this.level,
      experience: this.experience,
      nextLevelThreshold: this.level * 1000,
      completedAchievements: this.getCompletedAchievements(),
      streaks: this.streaks
    };
  }

  resetProgress() {
    this.level = 1;
    this.experience = 0;
    this.completedAchievements = [];
    this.streaks = {};
    this.saveData();
  }
}

const progressionService = new ProgressionService();
export { progressionService };
export default ProgressionService;
