class RewardsService {
  constructor() {
    this.loadRewardsData();
  }

  loadRewardsData() {
    const savedData = localStorage.getItem('rewards');
    this.rewards = savedData ? JSON.parse(savedData) : {
      points: 0,
      level: 1,
      achievements: [],
      milestones: [],
      streakRecords: {},
      lastUpdate: new Date().toISOString()
    };
  }

  saveRewardsData() {
    localStorage.setItem('rewards', JSON.stringify(this.rewards));
  }

  calculateLevelFromPoints(points) {
    // Level formula: level = 1 + sqrt(points / 100)
    return Math.floor(1 + Math.sqrt(points / 100));
  }

  getPointsForNextLevel() {
    const nextLevel = this.rewards.level + 1;
    return Math.pow(nextLevel - 1, 2) * 100;
  }

  addPoints(amount, reason) {
    this.rewards.points += amount;
    const newLevel = this.calculateLevelFromPoints(this.rewards.points);
    
    const event = {
      type: 'points',
      amount,
      reason,
      timestamp: new Date().toISOString()
    };

    if (newLevel > this.rewards.level) {
      this.rewards.level = newLevel;
      event.levelUp = true;
    }

    this.checkMilestones();
    this.saveRewardsData();
    return event;
  }

  handleHabitCompletion(habit) {
    let points = 10; // Base points
    
    // Streak bonus
    if (habit.streak > 0) {
      points += Math.min(habit.streak * 2, 50); // Max 50 points from streak
    }

    // Consistency bonus
    const consistencyBonus = this.calculateConsistencyBonus(habit);
    points += consistencyBonus;

    return this.addPoints(points, `Completed: ${habit.name}`);
  }

  calculateConsistencyBonus(habit) {
    if (!habit.history) return 0;

    const last7Days = new Array(7).fill(null).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    });

    const completedDays = last7Days.filter(date =>
      habit.history.some(entry => entry.date === date && entry.completed)
    ).length;

    return Math.floor((completedDays / 7) * 20); // Up to 20 points for consistency
  }

  checkMilestones() {
    const milestones = [
      { id: 'first-habit', points: 100, title: 'First Steps', description: 'Earn your first 100 points' },
      { id: 'level-5', points: 1000, title: 'Getting Serious', description: 'Reach level 5' },
      { id: 'level-10', points: 5000, title: 'Habit Master', description: 'Reach level 10' },
      { id: 'consistent', points: 10000, title: 'Consistency King', description: 'Earn 10,000 points' },
    ];

    milestones.forEach(milestone => {
      if (!this.rewards.milestones.includes(milestone.id)) {
        if (
          (milestone.id.startsWith('level-') && this.rewards.level >= parseInt(milestone.id.split('-')[1])) ||
          this.rewards.points >= milestone.points
        ) {
          this.rewards.milestones.push(milestone.id);
          this.addAchievement(milestone);
        }
      }
    });
  }

  addAchievement(achievement) {
    const newAchievement = {
      ...achievement,
      unlockedAt: new Date().toISOString()
    };
    this.rewards.achievements.push(newAchievement);
    this.addPoints(50, `Achievement: ${achievement.title}`);
    return newAchievement;
  }

  updateStreakRecord(habit) {
    if (!this.rewards.streakRecords[habit.id] || habit.streak > this.rewards.streakRecords[habit.id]) {
      this.rewards.streakRecords[habit.id] = habit.streak;
      
      // Check streak achievements
      const streakAchievements = [
        { id: 'streak-7', streak: 7, title: 'Week Warrior', description: '7 day streak' },
        { id: 'streak-30', streak: 30, title: 'Monthly Master', description: '30 day streak' },
        { id: 'streak-100', streak: 100, title: 'Centurion', description: '100 day streak' },
      ];

      streakAchievements.forEach(achievement => {
        if (
          habit.streak >= achievement.streak &&
          !this.rewards.achievements.some(a => a.id === achievement.id)
        ) {
          this.addAchievement(achievement);
        }
      });

      this.saveRewardsData();
    }
  }

  // Get user progress data
  getProgress() {
    return {
      points: this.rewards.points,
      level: this.rewards.level,
      nextLevelPoints: this.getPointsForNextLevel(),
      achievements: this.rewards.achievements,
      milestones: this.rewards.milestones,
      streakRecords: this.rewards.streakRecords
    };
  }

  // Get level progress percentage
  getLevelProgress() {
    const currentLevelPoints = Math.pow(this.rewards.level - 1, 2) * 100;
    const nextLevelPoints = this.getPointsForNextLevel();
    const levelPoints = this.rewards.points - currentLevelPoints;
    const pointsNeeded = nextLevelPoints - currentLevelPoints;
    return (levelPoints / pointsNeeded) * 100;
  }
}

export const rewardsService = new RewardsService();
