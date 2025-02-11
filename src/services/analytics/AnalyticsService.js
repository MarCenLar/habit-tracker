import HabitCorrelationService from './HabitCorrelationService';
import PatternRecognitionService from './PatternRecognitionService';
import PredictionModelService from './PredictionModelService';
import TrendAnalysisService from './TrendAnalysisService';

class AnalyticsService {
  constructor() {
    this.correlation = new HabitCorrelationService();
    this.recognition = new PatternRecognitionService();
    this.prediction = new PredictionModelService();
    this.trends = new TrendAnalysisService();
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('analyticsData')) {
      localStorage.setItem('analyticsData', JSON.stringify({
        predictions: {},
        trends: {},
        insights: [],
        correlations: {},
        patterns: {},
        metrics: {}
      }));
    }
  }

  async getDetailedAnalytics(habitId) {
    const habit = await this.getHabitData(habitId);
    if (!habit) return null;

    const [correlations, patterns, predictions, trends] = await Promise.all([
      this.correlation.analyzeHabitCorrelations(habit),
      this.recognition.detectPatterns(habit),
      this.prediction.generatePredictions(habit),
      this.trends.analyzeTrends(habit)
    ]);

    return {
      completion: this.calculateCompletionMetrics(habit),
      correlations,
      patterns,
      predictions,
      trends,
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
      completed: 0,
      efficiency: 0,
      quality: 0
    }));

    history.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      timeDistribution[hour].total++;
      if (entry.completed) {
        timeDistribution[hour].completed++;
        timeDistribution[hour].efficiency += entry.metrics?.duration || 0;
        timeDistribution[hour].quality += entry.metrics?.quality || 0;
      }
    });

    // Calculate averages
    timeDistribution.forEach(slot => {
      if (slot.completed) {
        slot.efficiency /= slot.completed;
        slot.quality /= slot.completed;
      }
    });

    return {
      overall: total ? (completed / total) * 100 : 0,
      timeDistribution: timeDistribution.map((slot, hour) => ({
        hour,
        rate: slot.total ? (slot.completed / slot.total) * 100 : 0,
        efficiency: slot.efficiency,
        quality: slot.quality
      }))
    };
  }

  async trackHabitCompletion(habitId, data) {
    const metrics = {
      timestamp: new Date().toISOString(),
      completed: data.completed,
      metrics: {
        duration: data.duration,
        quality: data.quality,
        difficulty: data.difficulty,
        mood: data.mood,
        energy: data.energy,
        context: {
          location: data.location,
          weather: data.weather,
          dayType: this.getDayType(),
          timeOfDay: this.getTimeOfDay()
        }
      }
    };

    await this.updateHabitMetrics(habitId, metrics);
    await this.updateAnalyticsData(habitId, metrics);

    // Trigger pattern recognition
    const patterns = await this.recognition.detectPatternsFromMetrics(metrics);
    if (patterns.length > 0) {
      await this.storePatterns(habitId, patterns);
    }

    // Update predictions
    await this.prediction.updatePredictions(habitId, metrics);

    return metrics;
  }

  async updateHabitMetrics(habitId, metrics) {
    const data = this.getData();
    if (!data.metrics[habitId]) {
      data.metrics[habitId] = {
        history: [],
        aggregates: this.initializeAggregates()
      };
    }

    data.metrics[habitId].history.push(metrics);
    this.updateAggregates(data.metrics[habitId].aggregates, metrics);
    
    // Keep only last 90 days of detailed history
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    data.metrics[habitId].history = data.metrics[habitId].history.filter(
      m => new Date(m.timestamp) >= ninetyDaysAgo
    );

    this.saveData(data);
  }

  initializeAggregates() {
    return {
      daily: {},
      weekly: {},
      monthly: {},
      timeOfDay: Array(24).fill(0).map(() => ({
        attempts: 0,
        completions: 0,
        totalDuration: 0,
        totalQuality: 0
      })),
      dayOfWeek: Array(7).fill(0).map(() => ({
        attempts: 0,
        completions: 0,
        totalDuration: 0,
        totalQuality: 0
      }))
    };
  }

  updateAggregates(aggregates, metrics) {
    const date = new Date(metrics.timestamp);
    
    // Update daily aggregate
    const dayKey = date.toISOString().split('T')[0];
    if (!aggregates.daily[dayKey]) {
      aggregates.daily[dayKey] = { attempts: 0, completions: 0 };
    }
    aggregates.daily[dayKey].attempts++;
    if (metrics.completed) aggregates.daily[dayKey].completions++;

    // Update weekly aggregate
    const weekKey = this.getWeekNumber(date);
    if (!aggregates.weekly[weekKey]) {
      aggregates.weekly[weekKey] = { attempts: 0, completions: 0 };
    }
    aggregates.weekly[weekKey].attempts++;
    if (metrics.completed) aggregates.weekly[weekKey].completions++;

    // Update monthly aggregate
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (!aggregates.monthly[monthKey]) {
      aggregates.monthly[monthKey] = { attempts: 0, completions: 0 };
    }
    aggregates.monthly[monthKey].attempts++;
    if (metrics.completed) aggregates.monthly[monthKey].completions++;

    // Update time of day aggregates
    const hour = date.getHours();
    aggregates.timeOfDay[hour].attempts++;
    if (metrics.completed) {
      aggregates.timeOfDay[hour].completions++;
      aggregates.timeOfDay[hour].totalDuration += metrics.metrics.duration || 0;
      aggregates.timeOfDay[hour].totalQuality += metrics.metrics.quality || 0;
    }

    // Update day of week aggregates
    const day = date.getDay();
    aggregates.dayOfWeek[day].attempts++;
    if (metrics.completed) {
      aggregates.dayOfWeek[day].completions++;
      aggregates.dayOfWeek[day].totalDuration += metrics.metrics.duration || 0;
      aggregates.dayOfWeek[day].totalQuality += metrics.metrics.quality || 0;
    }
  }

  async storePatterns(habitId, patterns) {
    const data = this.getData();
    if (!data.patterns[habitId]) {
      data.patterns[habitId] = [];
    }

    // Add new patterns and remove duplicates
    patterns.forEach(pattern => {
      const existingIndex = data.patterns[habitId].findIndex(
        p => p.type === pattern.type && p.value === pattern.value
      );
      
      if (existingIndex >= 0) {
        data.patterns[habitId][existingIndex].confidence = pattern.confidence;
        data.patterns[habitId][existingIndex].lastUpdated = new Date().toISOString();
      } else {
        data.patterns[habitId].push({
          ...pattern,
          discovered: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
      }
    });

    this.saveData(data);
  }

  generateHeatmap(habit) {
    const history = habit.history || [];
    const heatmap = {};
    
    history.forEach(entry => {
      const date = entry.timestamp.split('T')[0];
      if (!heatmap[date]) {
        heatmap[date] = { count: 0, completed: 0 };
      }
      heatmap[date].count++;
      if (entry.completed) heatmap[date].completed++;
    });

    return Object.entries(heatmap).map(([date, data]) => ({
      date,
      value: data.completed / data.count,
      count: data.count,
      completed: data.completed
    }));
  }

  // Utility functions
  getData() {
    return JSON.parse(localStorage.getItem('analyticsData'));
  }

  saveData(data) {
    localStorage.setItem('analyticsData', JSON.stringify(data));
  }

  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNumber}`;
  }

  getDayType() {
    const now = new Date();
    return now.getDay() === 0 || now.getDay() === 6 ? 'weekend' : 'weekday';
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  async getHabitData(habitId) {
    const habits = JSON.parse(localStorage.getItem('habits') || '[]');
    return habits.find(h => h.id === habitId);
  }
}

const analyticsService = new AnalyticsService();
export { analyticsService };
export default AnalyticsService;
