class AnalyticsService {
  constructor() {
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('analyticsData')) {
      localStorage.setItem('analyticsData', JSON.stringify({
        predictions: {},
        trends: {},
        insights: []
      }));
    }
  }

  // Detailed Analytics
  async getDetailedAnalytics(habitId) {
    const habit = await this.getHabitData(habitId);
    if (!habit) return null;

    return {
      completion: this.calculateCompletionMetrics(habit),
      patterns: this.analyzePatterns(habit),
      predictions: await this.generatePredictions(habit),
      trends: this.analyzeTrends(habit),
      heatmap: this.generateHeatmap(habit)
    };
  }

  calculateCompletionMetrics(habit) {
    const history = habit.history || [];
    const total = history.length;
    const completed = history.filter(h => h.completed).length;
    
    // Calculate completion rate by time of day
    const timeDistribution = Array(24).fill(0).map(() => ({
      total: 0,
      completed: 0
    }));

    history.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      timeDistribution[hour].total++;
      if (entry.completed) timeDistribution[hour].completed++;
    });

    return {
      overall: total ? (completed / total) * 100 : 0,
      timeDistribution: timeDistribution.map((slot, hour) => ({
        hour,
        rate: slot.total ? (slot.completed / slot.total) * 100 : 0
      }))
    };
  }

  analyzePatterns(habit) {
    const history = habit.history || [];
    
    // Analyze day of week patterns
    const dayPatterns = Array(7).fill(0).map(() => ({
      total: 0,
      completed: 0
    }));

    history.forEach(entry => {
      const day = new Date(entry.timestamp).getDay();
      dayPatterns[day].total++;
      if (entry.completed) dayPatterns[day].completed++;
    });

    // Analyze streak patterns
    const streaks = this.calculateStreakPatterns(history);

    return {
      bestDays: dayPatterns.map((day, index) => ({
        day: index,
        successRate: day.total ? (day.completed / day.total) * 100 : 0
      })),
      streakPatterns: streaks
    };
  }

  calculateStreakPatterns(history) {
    const streaks = [];
    let currentStreak = 0;
    let maxStreak = 0;
    let lastDate = null;

    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    history.forEach(entry => {
      const currentDate = new Date(entry.timestamp);
      
      if (entry.completed) {
        if (!lastDate || 
            (currentDate - lastDate) / (1000 * 60 * 60 * 24) === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        
        maxStreak = Math.max(maxStreak, currentStreak);
        streaks.push({
          length: currentStreak,
          endDate: currentDate
        });
      } else {
        currentStreak = 0;
      }
      
      lastDate = currentDate;
    });

    return {
      current: currentStreak,
      max: maxStreak,
      history: streaks
    };
  }

  async generatePredictions(habit) {
    const history = habit.history || [];
    if (history.length < 7) return null;

    // Simple prediction based on recent completion rate
    const recentHistory = history.slice(-7);
    const completionRate = recentHistory.filter(h => h.completed).length / 7;

    // Factor in time patterns
    const timePatterns = this.calculateCompletionMetrics(habit).timeDistribution;
    const bestHours = timePatterns
      .filter(t => t.rate > 70)
      .map(t => t.hour);

    // Factor in day patterns
    const dayPatterns = this.analyzePatterns(habit).bestDays;
    const bestDays = dayPatterns
      .filter(d => d.successRate > 70)
      .map(d => d.day);

    return {
      nextDayProbability: completionRate * 100,
      recommendedTimes: bestHours,
      recommendedDays: bestDays,
      predictedStreak: this.predictStreak(history)
    };
  }

  predictStreak(history) {
    if (history.length < 14) return null;

    const recentStreaks = this.calculateStreakPatterns(history).history
      .slice(-5);
    
    if (recentStreaks.length === 0) return 0;

    // Weighted average of recent streaks
    const weightedSum = recentStreaks.reduce((sum, streak, index) => {
      const weight = (index + 1) / recentStreaks.length;
      return sum + (streak.length * weight);
    }, 0);

    return Math.round(weightedSum / recentStreaks.length);
  }

  analyzeTrends(habit) {
    const history = habit.history || [];
    const periods = this.groupByPeriod(history);

    return {
      daily: this.calculateTrend(periods.daily),
      weekly: this.calculateTrend(periods.weekly),
      monthly: this.calculateTrend(periods.monthly)
    };
  }

  groupByPeriod(history) {
    const periods = {
      daily: [],
      weekly: [],
      monthly: []
    };

    // Group entries by day, week, and month
    history.forEach(entry => {
      const date = new Date(entry.timestamp);
      const day = date.toISOString().split('T')[0];
      const week = this.getWeekNumber(date);
      const month = `${date.getFullYear()}-${date.getMonth() + 1}`;

      this.addToPeriod(periods.daily, day, entry);
      this.addToPeriod(periods.weekly, week, entry);
      this.addToPeriod(periods.monthly, month, entry);
    });

    return periods;
  }

  addToPeriod(array, period, entry) {
    const existing = array.find(p => p.period === period);
    if (existing) {
      existing.total++;
      if (entry.completed) existing.completed++;
    } else {
      array.push({
        period,
        total: 1,
        completed: entry.completed ? 1 : 0
      });
    }
  }

  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNumber}`;
  }

  calculateTrend(periodData) {
    if (periodData.length < 2) return null;

    const rates = periodData.map(p => ({
      period: p.period,
      rate: (p.completed / p.total) * 100
    }));

    // Calculate trend line using simple linear regression
    const n = rates.length;
    const sumX = rates.reduce((sum, _, i) => sum + i, 0);
    const sumY = rates.reduce((sum, rate) => sum + rate.rate, 0);
    const sumXY = rates.reduce((sum, rate, i) => sum + (i * rate.rate), 0);
    const sumXX = rates.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      slope,
      intercept,
      direction: slope > 0 ? 'improving' : slope < 0 ? 'declining' : 'stable',
      data: rates
    };
  }

  generateHeatmap(habit) {
    const history = habit.history || [];
    const heatmap = {};
    
    // Create 52-week x 7-day heatmap
    const today = new Date();
    const yearAgo = new Date();
    yearAgo.setFullYear(today.getFullYear() - 1);

    // Initialize empty heatmap
    for (let d = new Date(yearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      heatmap[d.toISOString().split('T')[0]] = {
        completed: false,
        intensity: 0
      };
    }

    // Fill in completion data
    history.forEach(entry => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      if (heatmap[date]) {
        heatmap[date].completed = entry.completed;
        heatmap[date].intensity = this.calculateIntensity(entry);
      }
    });

    return heatmap;
  }

  calculateIntensity(entry) {
    // Calculate intensity based on completion metrics
    let intensity = entry.completed ? 1 : 0;
    
    if (entry.metrics) {
      // Factor in additional metrics if available
      if (entry.metrics.duration) {
        intensity += entry.metrics.duration / 60; // Duration in minutes
      }
      if (entry.metrics.quality) {
        intensity += entry.metrics.quality / 5; // Quality rating (1-5)
      }
    }

    return Math.min(intensity, 4); // Cap intensity at 4 levels
  }

  // Helper method to get habit data
  async getHabitData(habitId) {
    // In a real app, this would fetch from an API
    const habits = JSON.parse(localStorage.getItem('habits') || '[]');
    return habits.find(h => h.id === habitId);
  }
}

export const analyticsService = new AnalyticsService();
