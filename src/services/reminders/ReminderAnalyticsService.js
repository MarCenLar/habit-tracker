class ReminderAnalyticsService {
  constructor() {
    this.minDataPoints = 5;
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('reminderAnalytics')) {
      localStorage.setItem('reminderAnalytics', JSON.stringify({
        patterns: {},
        effectiveness: {},
        lastAnalysis: null
      }));
    }
  }

  async analyzeUserPatterns(habitId) {
    const history = this.getReminderHistory(habitId);
    
    if (history.length < this.minDataPoints) {
      return null;
    }

    const timePatterns = this.analyzeTimePatterns(history);
    const dayPatterns = this.analyzeDayPatterns(history);
    const contextPatterns = await this.analyzeContextPatterns(history);
    const completionRate = this.calculateCompletionRate(history);

    const analysis = {
      habitId,
      timePatterns,
      dayPatterns,
      contextPatterns,
      completionRate,
      timestamp: new Date().toISOString()
    };

    this.saveAnalysis(habitId, analysis);
    return analysis;
  }

  getReminderHistory(habitId) {
    const history = JSON.parse(localStorage.getItem('reminderHistory') || '[]');
    return history.filter(h => h.habitId === habitId);
  }

  analyzeTimePatterns(history) {
    const timeSlots = Array(24).fill(0).map(() => ({
      total: 0,
      completed: 0,
      ignored: 0
    }));

    history.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      timeSlots[hour].total++;
      
      if (entry.completed) {
        timeSlots[hour].completed++;
      } else if (entry.ignored) {
        timeSlots[hour].ignored++;
      }
    });

    return timeSlots.map((slot, hour) => ({
      hour,
      completionRate: slot.total ? (slot.completed / slot.total) * 100 : 0,
      ignoredRate: slot.total ? (slot.ignored / slot.total) * 100 : 0,
      total: slot.total
    }));
  }

  analyzeDayPatterns(history) {
    const dayStats = Array(7).fill(0).map(() => ({
      total: 0,
      completed: 0,
      ignored: 0
    }));

    history.forEach(entry => {
      const day = new Date(entry.timestamp).getDay();
      dayStats[day].total++;
      
      if (entry.completed) {
        dayStats[day].completed++;
      } else if (entry.ignored) {
        dayStats[day].ignored++;
      }
    });

    return dayStats.map((stat, day) => ({
      day,
      completionRate: stat.total ? (stat.completed / stat.total) * 100 : 0,
      ignoredRate: stat.total ? (stat.ignored / stat.total) * 100 : 0,
      total: stat.total
    }));
  }

  async analyzeContextPatterns(history) {
    const contextStats = {
      location: {},
      activity: {},
      weather: {},
      mood: {}
    };

    for (const entry of history) {
      if (entry.context) {
        // Location patterns
        if (entry.context.location) {
          const location = entry.context.location;
          contextStats.location[location] = contextStats.location[location] || {
            total: 0,
            completed: 0
          };
          contextStats.location[location].total++;
          if (entry.completed) {
            contextStats.location[location].completed++;
          }
        }

        // Activity patterns
        if (entry.context.activity) {
          const activity = entry.context.activity;
          contextStats.activity[activity] = contextStats.activity[activity] || {
            total: 0,
            completed: 0
          };
          contextStats.activity[activity].total++;
          if (entry.completed) {
            contextStats.activity[activity].completed++;
          }
        }

        // Weather patterns
        if (entry.context.weather) {
          const weather = entry.context.weather;
          contextStats.weather[weather] = contextStats.weather[weather] || {
            total: 0,
            completed: 0
          };
          contextStats.weather[weather].total++;
          if (entry.completed) {
            contextStats.weather[weather].completed++;
          }
        }

        // Mood patterns
        if (entry.context.mood) {
          const mood = entry.context.mood;
          contextStats.mood[mood] = contextStats.mood[mood] || {
            total: 0,
            completed: 0
          };
          contextStats.mood[mood].total++;
          if (entry.completed) {
            contextStats.mood[mood].completed++;
          }
        }
      }
    }

    return this.calculateContextSuccessRates(contextStats);
  }

  calculateContextSuccessRates(contextStats) {
    const result = {};
    
    for (const [contextType, stats] of Object.entries(contextStats)) {
      result[contextType] = {};
      
      for (const [value, counts] of Object.entries(stats)) {
        result[contextType][value] = {
          successRate: counts.total ? (counts.completed / counts.total) * 100 : 0,
          total: counts.total
        };
      }
    }
    
    return result;
  }

  calculateCompletionRate(history) {
    const completed = history.filter(h => h.completed).length;
    return history.length ? (completed / history.length) * 100 : 0;
  }

  saveAnalysis(habitId, analysis) {
    const analytics = JSON.parse(localStorage.getItem('reminderAnalytics'));
    analytics.patterns[habitId] = analysis;
    analytics.lastAnalysis = new Date().toISOString();
    localStorage.setItem('reminderAnalytics', JSON.stringify(analytics));
  }

  getOptimalReminderTime(habitId) {
    const analytics = JSON.parse(localStorage.getItem('reminderAnalytics'));
    const patterns = analytics.patterns[habitId];
    
    if (!patterns) return null;

    const timePatterns = patterns.timePatterns;
    const bestTime = timePatterns.reduce((best, current) => {
      if (current.total < this.minDataPoints) return best;
      return current.completionRate > best.completionRate ? current : best;
    }, { completionRate: -1 });

    return bestTime.completionRate > 0 ? bestTime.hour : null;
  }

  shouldAdjustReminder(habitId) {
    const analytics = JSON.parse(localStorage.getItem('reminderAnalytics'));
    const effectiveness = analytics.effectiveness[habitId];
    
    if (!effectiveness) return false;

    const recentReminders = effectiveness.slice(-5);
    const avgEffectiveness = recentReminders.reduce((sum, e) => sum + e.rating, 0) / recentReminders.length;
    
    return avgEffectiveness < 3; // Scale of 1-5
  }
}

export { ReminderAnalyticsService };
