class TrendAnalysisService {
  constructor() {
    this.trendTypes = {
      completion: {
        periods: ['daily', 'weekly', 'monthly'],
        metrics: ['rate', 'consistency', 'quality'],
        minSamples: 7
      },
      performance: {
        aspects: ['duration', 'quality', 'difficulty'],
        contexts: ['time', 'location', 'energy'],
        minSamples: 5
      },
      behavior: {
        patterns: ['sequence', 'timing', 'adaptation'],
        factors: ['motivation', 'context', 'obstacles'],
        minSamples: 10
      }
    };

    this.analysisWindows = {
      short: 7,    // 1 week
      medium: 30,  // 1 month
      long: 90     // 3 months
    };
  }

  async analyzeTrends(habit) {
    const history = habit.history || [];
    if (history.length < this.trendTypes.completion.minSamples) {
      return this.generateBaseTrendAnalysis();
    }

    const [completion, performance, behavior] = await Promise.all([
      this.analyzeCompletionTrends(history),
      this.analyzePerformanceTrends(history),
      this.analyzeBehavioralTrends(history)
    ]);

    return {
      trends: {
        completion,
        performance,
        behavior
      },
      insights: this.generateTrendInsights({
        completion,
        performance,
        behavior
      }),
      indicators: this.identifyKeyIndicators(history),
      projections: this.generateTrendProjections(history)
    };
  }

  async analyzeCompletionTrends(history) {
    const windows = this.getAnalysisWindows(history);
    const trends = {};

    // Analyze each time window
    for (const [period, entries] of Object.entries(windows)) {
      trends[period] = {
        overall: this.calculateCompletionMetrics(entries),
        patterns: this.identifyCompletionPatterns(entries),
        momentum: this.calculateMomentum(entries),
        riskFactors: this.identifyRiskFactors(entries)
      };
    }

    return {
      metrics: this.aggregateCompletionMetrics(trends),
      patterns: this.synthesizeCompletionPatterns(trends),
      trajectory: this.determineCompletionTrajectory(trends)
    };
  }

  calculateCompletionMetrics(entries) {
    const total = entries.length;
    const completed = entries.filter(e => e.completed).length;
    const rate = total > 0 ? completed / total : 0;

    const streaks = this.calculateStreakMetrics(entries);
    const consistency = this.calculateConsistencyScore(entries);

    return {
      rate,
      completed,
      total,
      streaks,
      consistency,
      quality: this.calculateQualityMetrics(entries)
    };
  }

  calculateStreakMetrics(entries) {
    let currentStreak = 0;
    let longestStreak = 0;
    let streaks = [];
    let lastDate = null;

    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const isConsecutive = lastDate && 
        (date - lastDate) / (1000 * 60 * 60 * 24) === 1;

      if (entry.completed && (currentStreak === 0 || isConsecutive)) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else if (!entry.completed) {
        if (currentStreak > 0) {
          streaks.push(currentStreak);
        }
        currentStreak = 0;
      }

      lastDate = date;
    });

    if (currentStreak > 0) {
      streaks.push(currentStreak);
    }

    return {
      current: currentStreak,
      longest: longestStreak,
      average: streaks.length > 0 
        ? streaks.reduce((sum, s) => sum + s, 0) / streaks.length 
        : 0,
      distribution: this.calculateStreakDistribution(streaks)
    };
  }

  calculateStreakDistribution(streaks) {
    const distribution = new Map();
    streaks.forEach(streak => {
      distribution.set(streak, (distribution.get(streak) || 0) + 1);
    });

    return Array.from(distribution.entries())
      .sort(([a], [b]) => a - b)
      .reduce((obj, [streak, count]) => {
        obj[streak] = count;
        return obj;
      }, {});
  }

  calculateConsistencyScore(entries) {
    if (entries.length < 2) return 1;

    const intervals = [];
    let lastCompletion = null;

    entries.forEach(entry => {
      if (!entry.completed) return;

      if (lastCompletion) {
        const interval = (new Date(entry.timestamp) - lastCompletion) / 
          (1000 * 60 * 60 * 24); // Convert to days
        intervals.push(interval);
      }
      lastCompletion = new Date(entry.timestamp);
    });

    if (intervals.length === 0) return 0;

    const averageInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - averageInterval, 2), 0) / 
      intervals.length;

    return Math.max(0, 1 - Math.sqrt(variance) / averageInterval);
  }

  calculateQualityMetrics(entries) {
    const qualityEntries = entries.filter(e => 
      e.completed && e.metrics?.quality !== undefined
    );

    if (qualityEntries.length === 0) return null;

    const qualities = qualityEntries.map(e => e.metrics.quality);
    const average = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const variance = qualities.reduce((sum, q) => sum + Math.pow(q - average, 2), 0) / 
      qualities.length;

    return {
      average,
      variance,
      trend: this.calculateQualityTrend(qualityEntries)
    };
  }

  calculateQualityTrend(entries) {
    if (entries.length < 2) return 'stable';

    const recentAvg = entries.slice(-3).reduce((sum, e) => sum + e.metrics.quality, 0) / 3;
    const historicalAvg = entries.slice(0, -3).reduce((sum, e) => sum + e.metrics.quality, 0) / 
      (entries.length - 3);

    const difference = recentAvg - historicalAvg;
    if (Math.abs(difference) < 0.5) return 'stable';
    return difference > 0 ? 'improving' : 'declining';
  }

  async analyzePerformanceTrends(history) {
    const windows = this.getAnalysisWindows(history);
    const performanceData = {};

    // Analyze performance metrics for each time window
    for (const [period, entries] of Object.entries(windows)) {
      performanceData[period] = {
        metrics: this.calculatePerformanceMetrics(entries),
        patterns: this.identifyPerformancePatterns(entries),
        factors: this.analyzePerformanceFactors(entries)
      };
    }

    return {
      current: this.assessCurrentPerformance(performanceData),
      progression: this.analyzePerformanceProgression(performanceData),
      patterns: this.synthesizePerformancePatterns(performanceData)
    };
  }

  calculatePerformanceMetrics(entries) {
    const completedEntries = entries.filter(e => e.completed && e.metrics);
    if (completedEntries.length === 0) return null;

    return {
      duration: this.analyzeMetricTrend(completedEntries, 'duration'),
      quality: this.analyzeMetricTrend(completedEntries, 'quality'),
      difficulty: this.analyzeMetricTrend(completedEntries, 'difficulty'),
      energy: this.analyzeMetricTrend(completedEntries, 'energy')
    };
  }

  analyzeMetricTrend(entries, metric) {
    const values = entries
      .filter(e => e.metrics[metric] !== undefined)
      .map(e => ({
        value: e.metrics[metric],
        timestamp: new Date(e.timestamp)
      }));

    if (values.length < 2) return null;

    const sorted = [...values].sort((a, b) => a.timestamp - b.timestamp);
    const trend = this.calculateTrendLine(sorted);

    return {
      current: values[values.length - 1].value,
      average: values.reduce((sum, v) => sum + v.value, 0) / values.length,
      trend: trend.slope,
      confidence: this.calculateTrendConfidence(values.length)
    };
  }

  calculateTrendLine(points) {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.timestamp.getTime(), 0);
    const sumY = points.reduce((sum, p) => sum + p.value, 0);
    const sumXY = points.reduce((sum, p) => sum + p.timestamp.getTime() * p.value, 0);
    const sumXX = points.reduce((sum, p) => sum + Math.pow(p.timestamp.getTime(), 2), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  async analyzeBehavioralTrends(history) {
    const windows = this.getAnalysisWindows(history);
    const behaviorData = {};

    // Analyze behavioral patterns for each time window
    for (const [period, entries] of Object.entries(windows)) {
      behaviorData[period] = {
        patterns: this.identifyBehavioralPatterns(entries),
        adaptations: this.analyzeBehavioralAdaptations(entries),
        context: this.analyzeBehavioralContext(entries)
      };
    }

    return {
      current: this.assessCurrentBehavior(behaviorData),
      evolution: this.analyzeBehaviorEvolution(behaviorData),
      insights: this.generateBehavioralInsights(behaviorData)
    };
  }

  getAnalysisWindows(history) {
    const now = new Date();
    const windows = {};

    for (const [window, days] of Object.entries(this.analysisWindows)) {
      const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
      windows[window] = history.filter(entry => 
        new Date(entry.timestamp) >= cutoff
      );
    }

    return windows;
  }

  generateTrendInsights(trends) {
    return {
      primary: this.identifyPrimaryTrends(trends),
      patterns: this.identifyRecurringPatterns(trends),
      anomalies: this.detectTrendAnomalies(trends),
      recommendations: this.generateTrendBasedRecommendations(trends)
    };
  }

  identifyPrimaryTrends(trends) {
    return Object.entries(trends).map(([category, data]) => ({
      category,
      direction: this.determineTrendDirection(data),
      strength: this.calculateTrendStrength(data),
      reliability: this.assessTrendReliability(data)
    }));
  }

  determineTrendDirection(data) {
    // Analyze trend direction based on recent vs historical performance
    if (data.metrics?.rate?.trend > 0.1) return 'improving';
    if (data.metrics?.rate?.trend < -0.1) return 'declining';
    return 'stable';
  }

  calculateTrendStrength(data) {
    // Normalize trend strength to 0-1 scale
    return Math.min(Math.abs(data.metrics?.rate?.trend || 0), 1);
  }

  assessTrendReliability(data) {
    return data.metrics?.rate?.confidence || 0;
  }

  generateBaseTrendAnalysis() {
    return {
      trends: {
        completion: null,
        performance: null,
        behavior: null
      },
      insights: [],
      indicators: [],
      projections: {
        shortTerm: null,
        mediumTerm: null,
        longTerm: null
      }
    };
  }
}

export default TrendAnalysisService;
