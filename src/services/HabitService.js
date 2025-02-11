import categories from '../data/categories.json';
import quotes from '../data/quotes.json';

class HabitService {
  constructor() {
    this.initializeData();
    this.levelThresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000];
  }

  initializeData() {
    if (!localStorage.getItem('habits')) {
      localStorage.setItem('habits', JSON.stringify([]));
    }
    if (!localStorage.getItem('achievements')) {
      localStorage.setItem('achievements', JSON.stringify([]));
    }
    if (!localStorage.getItem('streaks')) {
      localStorage.setItem('streaks', JSON.stringify({}));
    }
    if (!localStorage.getItem('userProgress')) {
      localStorage.setItem('userProgress', JSON.stringify({
        level: 1,
        xp: 0,
        coins: 0,
        rewards: []
      }));
    }
  }

  getUserProgress() {
    return JSON.parse(localStorage.getItem('userProgress'));
  }

  updateUserProgress(updates) {
    const progress = this.getUserProgress();
    const updatedProgress = { ...progress, ...updates };
    
    // Check for level up
    if (updates.xp) {
      const totalXP = progress.xp + updates.xp;
      let level = progress.level;
      
      while (level < this.levelThresholds.length && totalXP >= this.levelThresholds[level]) {
        level++;
      }
      
      updatedProgress.xp = totalXP;
      if (level > progress.level) {
        updatedProgress.level = level;
        // Award level-up bonus
        updatedProgress.coins = (progress.coins || 0) + (level * 100);
      }
    }
    
    localStorage.setItem('userProgress', JSON.stringify(updatedProgress));
    return updatedProgress;
  }

  unlockReward(rewardId) {
    const progress = this.getUserProgress();
    if (!progress.rewards.includes(rewardId)) {
      progress.rewards.push(rewardId);
      localStorage.setItem('userProgress', JSON.stringify(progress));
    }
    return progress;
  }

  // Habit Operations
  getHabits() {
    return JSON.parse(localStorage.getItem('habits'));
  }

  addHabit(habit) {
    const habits = this.getHabits();
    const newHabit = {
      ...habit,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      streak: 0,
      history: []
    };
    habits.push(newHabit);
    localStorage.setItem('habits', JSON.stringify(habits));
    return newHabit;
  }

  updateHabit(habitId, updates) {
    const habits = this.getHabits();
    const index = habits.findIndex(h => h.id === habitId);
    if (index !== -1) {
      habits[index] = { ...habits[index], ...updates };
      localStorage.setItem('habits', JSON.stringify(habits));
      return habits[index];
    }
    return null;
  }

  deleteHabit(habitId) {
    const habits = this.getHabits().filter(h => h.id !== habitId);
    localStorage.setItem('habits', JSON.stringify(habits));
  }

  // Progress Tracking
  trackProgress(habitId, date, completed) {
    const habits = this.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return null;

    const today = new Date(date).toISOString().split('T')[0];
    const history = habit.history || [];
    const existingEntry = history.findIndex(h => h.date === today);

    if (existingEntry !== -1) {
      history[existingEntry].completed = completed;
    } else {
      history.push({ date: today, completed });
    }

    // Calculate streak considering the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    let lastDate = new Date(today);
    
    for (const entry of sortedHistory) {
      const entryDate = new Date(entry.date);
      if (entryDate < thirtyDaysAgo) break;
      
      const daysDifference = Math.floor(
        (lastDate - entryDate) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDifference > 1) break; // Break streak if more than 1 day gap
      if (!entry.completed) break; // Break streak if habit not completed
      
      streak++;
      lastDate = entryDate;
    }

    if (completed) {
      streak = Math.max(1, streak); // Ensure at least 1 if completed today
      this.checkAchievements(streak);
    }

    return this.updateHabit(habitId, { history, streak });
  }

  // Achievements
  getAchievements() {
    return JSON.parse(localStorage.getItem('achievements'));
  }

  checkAchievements(streak) {
    const achievements = this.getAchievements();
    const streakAchievements = {
      7: 'streak-7',
      30: 'streak-30'
    };

    if (streakAchievements[streak] && !achievements.includes(streakAchievements[streak])) {
      achievements.push(streakAchievements[streak]);
      localStorage.setItem('achievements', JSON.stringify(achievements));
      return quotes.achievements.find(a => a.id === streakAchievements[streak]);
    }
    return null;
  }

  // Categories and Suggestions
  getCategories() {
    return categories.categories;
  }

  getSuggestions(categoryId) {
    const category = categories.categories.find(c => c.id === categoryId);
    return category ? category.suggestions : [];
  }

  // Motivational Quotes
  getRandomQuote() {
    const quotesList = quotes.motivationalQuotes;
    return quotesList[Math.floor(Math.random() * quotesList.length)];
  }

  // Analytics
  getAnalytics() {
    const habits = this.getHabits();
    const today = new Date().toISOString().split('T')[0];
    const progress = this.getUserProgress();
    
    // Calculate completion rate per category
    const categoryCompletions = {};
    habits.forEach(habit => {
      if (!categoryCompletions[habit.category]) {
        categoryCompletions[habit.category] = {
          total: 0,
          completed: 0
        };
      }
      const todayEntry = habit.history?.find(h => h.date === today);
      categoryCompletions[habit.category].total++;
      if (todayEntry?.completed) {
        categoryCompletions[habit.category].completed++;
      }
    });

    // Calculate total completed days
    const allCompletedDays = new Set();
    habits.forEach(habit => {
      habit.history?.forEach(entry => {
        if (entry.completed) {
          allCompletedDays.add(entry.date);
        }
      });
    });

    // Calculate current streak
    const sortedDates = [...allCompletedDays].sort((a, b) => b.localeCompare(a));
    let currentStreak = 0;
    let lastDate = new Date(today);

    for (const date of sortedDates) {
      const currentDate = new Date(date);
      const daysDifference = Math.floor(
        (lastDate - currentDate) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDifference > 1) break;
      currentStreak++;
      lastDate = currentDate;
    }

    // Calculate longest streak
    let longestStreak = 0;
    let currentCount = 0;
    let prevDate = null;

    sortedDates.reverse().forEach(date => {
      if (!prevDate) {
        currentCount = 1;
      } else {
        const daysDiff = Math.floor(
          (new Date(date) - new Date(prevDate)) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff === 1) {
          currentCount++;
        } else {
          currentCount = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentCount);
      prevDate = date;
    });

    // Calculate habit correlations
    const correlations = this.calculateHabitCorrelations(habits);
    
    return {
      totalHabits: habits.length,
      activeStreaks: habits.filter(h => h.streak > 0).length,
      completedToday: habits.filter(h => 
        h.history?.some(entry => entry.date === today && entry.completed)
      ).length,
      currentStreak,
      longestStreak,
      totalCompletedDays: allCompletedDays.size,
      achievements: this.getAchievements().length,
      level: progress.level,
      xp: progress.xp,
      coins: progress.coins,
      categoryCompletions,
      correlations
    };
  }

  calculateHabitCorrelations(habits) {
    const correlations = [];
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    // Create a map for faster lookups
    const habitHistoryMap = new Map();
    habits.forEach(habit => {
      const historyMap = new Map();
      (habit.history || [])
        .filter(entry => new Date(entry.date) >= last30Days)
        .forEach(entry => historyMap.set(entry.date, entry.completed));
      habitHistoryMap.set(habit.id, historyMap);
    });
    
    // Compare each pair of habits
    for (let i = 0; i < habits.length; i++) {
      for (let j = i + 1; j < habits.length; j++) {
        const habit1History = habitHistoryMap.get(habits[i].id);
        const habit2History = habitHistoryMap.get(habits[j].id);
        
        let matching = 0;
        let total = 0;
        
        // Only check dates that exist in both histories
        const commonDates = new Set([...habit1History.keys()].filter(date => 
          habit2History.has(date)
        ));
        
        commonDates.forEach(date => {
          total++;
          if (habit1History.get(date) === habit2History.get(date)) {
            matching++;
          }
        });
        
        if (total >= 7) { // Only include correlations with sufficient data
          correlations.push({
            habit1: habits[i].id,
            habit2: habits[j].id,
            correlation: matching / total,
            sampleSize: total
          });
        }
      }
    }
    
    return correlations.sort((a, b) => b.correlation - a.correlation);
  }
}

export const habitService = new HabitService();
