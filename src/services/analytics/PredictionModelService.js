class PredictionModelService {
  constructor() {
    this.modelTypes = {
      success: {
        metrics: ['completion', 'quality', 'consistency'],
        timeframes: ['day', 'week', 'month'],
        minDataPoints: 7
      },
      timing: {
        factors: ['timeOfDay', 'dayOfWeek', 'interval'],
        contexts: ['work', 'leisure', 'travel'],
        minDataPoints: 5
      },
      difficulty: {
        aspects: ['energy', 'motivation', 'complexity'],
        conditions: ['normal', 'stressed', 'optimal'],
        minDataPoints: 10
      }
    };

    this.weightings = {
      recency: { max: 1.0, falloff: 0.1 },
      consistency: { threshold: 0.7, bonus: 0.2 },
      confidence: { baseline: 0.6, increment: 0.05 }
    };
  }

  async generatePredictions(habit) {
    const [success, timing, difficulty] = await Promise.all([
      this.predictSuccess(habit),
      this.predictOptimalTiming(habit),
      this.predictDifficulty(habit)
    ]);

    return {
      success,
      timing,
      difficulty,
      insights: this.generatePredictionInsights({ success, timing, difficulty }),
      recommendations: this.generateRecommendations(habit, { success, timing, difficulty })
    };
  }

  async predictSuccess(habit) {
    const recentHistory = this.getRecentHistory(habit, 30); // Last 30 days
    if (recentHistory.length < this.modelTypes.success.minDataPoints) {
      return this.generateBasePrediction();
    }

    const predictions = {
      nextDay: this.predictNextDaySuccess(recentHistory),
      nextWeek: this.predictNextWeekSuccess(recentHistory),
      longTerm: this.predictLongTermSuccess(recentHistory)
    };

    return {
      predictions,
      confidence: this.calculateSuccessConfidence(predictions, recentHistory),
      factors: this.identifySuccessFactors(recentHistory),
      risks: this.assessSuccessRisks(recentHistory)
    };
  }

  predictNextDaySuccess(history) {
    const recentCompletion = this.calculateRecentCompletionRate(history, 7);
    const momentum = this.calculateMomentum(history);
    const dayOfWeekFactor = this.calculateDayOfWeekEffect(history);

    return {
      probability: this.combineFactors([
        recentCompletion * 0.5,
        momentum * 0.3,
        dayOfWeekFactor * 0.2
      ]),
      confidence: this.calculateConfidence(history.length, 7),
      factors: {
        recentCompletion,
        momentum,
        dayOfWeekFactor
      }
    };
  }

  predictNextWeekSuccess(history) {
    const weeklyPattern = this.analyzeWeeklyPattern(history);
    const recentTrend = this.calculateTrend(history);
    const consistencyScore = this.calculateConsistencyScore(history);

    return {
      probability: this.combineFactors([
        weeklyPattern.score * 0.4,
        recentTrend * 0.3,
        consistencyScore * 0.3
      ]),
      confidence: this.calculateConfidence(history.length, 14),
      breakdown: {
        weekdayProbabilities: weeklyPattern.dayScores,
        trendDirection: recentTrend >= 0 ? 'improving' : 'declining',
        consistencyLevel: this.getConsistencyLevel(consistencyScore)
      }
    };
  }

  predictLongTermSuccess(history) {
    const trend = this.calculateLongTermTrend(history);
    const habitStrength = this.calculateHabitStrength(history);
    const adaptability = this.calculateAdaptabilityScore(history);

    return {
      probability: this.combineFactors([
        trend.score * 0.4,
        habitStrength * 0.4,
        adaptability * 0.2
      ]),
      confidence: this.calculateConfidence(history.length, 30),
      projections: {
        threeMonths: this.projectSuccess(trend, habitStrength, 90),
        sixMonths: this.projectSuccess(trend, habitStrength, 180)
      }
    };
  }

  async predictOptimalTiming(habit) {
    const history = habit.history || [];
    if (history.length < this.modelTypes.timing.minDataPoints) {
      return this.generateBaseTimingPrediction();
    }

    const timeAnalysis = this.analyzeTimingPatterns(history);
    const contextualFactors = await this.analyzeContextualFactors(habit);

    return {
      optimalTimes: this.identifyOptimalTimes(timeAnalysis),
      contextualRecommendations: this.generateTimingRecommendations(contextualFactors),
      flexibility: this.assessTimingFlexibility(history),
      confidence: this.calculateTimingConfidence(timeAnalysis)
    };
  }

  analyzeTimingPatterns(history) {
    const timeSlots = Array(24).fill(0).map(() => ({
      attempts: 0,
      successes: 0,
      quality: 0
    }));

    history.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      timeSlots[hour].attempts++;
      if (entry.completed) {
        timeSlots[hour].successes++;
        timeSlots[hour].quality += entry.metrics?.quality || 0;
      }
    });

    return timeSlots.map((slot, hour) => ({
      hour,
      successRate: slot.attempts > 0 ? slot.successes / slot.attempts : 0,
      averageQuality: slot.successes > 0 ? slot.quality / slot.successes : 0,
      volume: slot.attempts
    }));
  }

  identifyOptimalTimes(timeAnalysis) {
    return timeAnalysis
      .filter(slot => slot.volume >= 5 && slot.successRate >= 0.7)
      .sort((a, b) => {
        const scoreA = a.successRate * 0.7 + (a.averageQuality / 5) * 0.3;
        const scoreB = b.successRate * 0.7 + (b.averageQuality / 5) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 3)
      .map(slot => ({
        hour: slot.hour,
        confidence: this.calculateSlotConfidence(slot),
        score: slot.successRate * 0.7 + (slot.averageQuality / 5) * 0.3
      }));
  }

  async predictDifficulty(habit) {
    const history = habit.history || [];
    if (history.length < this.modelTypes.difficulty.minDataPoints) {
      return this.generateBaseDifficultyPrediction();
    }

    const patterns = this.analyzeDifficultyPatterns(history);
    const contextual = await this.assessContextualDifficulty(habit);
    const userMetrics = await this.analyzeUserMetrics(habit);

    return {
      baseline: this.calculateBaselineDifficulty(patterns),
      variability: this.calculateDifficultyVariability(patterns),
      factors: this.identifyDifficultyFactors(patterns, contextual),
      projections: this.projectDifficulty(patterns, userMetrics),
      confidence: this.calculateDifficultyConfidence(patterns)
    };
  }

  analyzeDifficultyPatterns(history) {
    return history.reduce((patterns, entry) => {
      if (!entry.metrics?.difficulty) return patterns;

      const timeOfDay = this.getTimeOfDay(entry.timestamp);
      const dayOfWeek = new Date(entry.timestamp).getDay();

      // Update time-based patterns
      patterns.timeOfDay[timeOfDay] = patterns.timeOfDay[timeOfDay] || [];
      patterns.timeOfDay[timeOfDay].push(entry.metrics.difficulty);

      // Update day-based patterns
      patterns.dayOfWeek[dayOfWeek] = patterns.dayOfWeek[dayOfWeek] || [];
      patterns.dayOfWeek[dayOfWeek].push(entry.metrics.difficulty);

      // Track sequential patterns
      if (patterns.sequential.length > 0) {
        const lastEntry = patterns.sequential[patterns.sequential.length - 1];
        const hoursDiff = (new Date(entry.timestamp) - new Date(lastEntry.timestamp)) / 3600000;
        
        if (hoursDiff <= 24) {
          patterns.sequential.push({
            timestamp: entry.timestamp,
            difficulty: entry.metrics.difficulty,
            delta: entry.metrics.difficulty - lastEntry.difficulty
          });
        }
      } else {
        patterns.sequential.push({
          timestamp: entry.timestamp,
          difficulty: entry.metrics.difficulty,
          delta: 0
        });
      }

      return patterns;
    }, {
      timeOfDay: {},
      dayOfWeek: {},
      sequential: []
    });
  }

  calculateBaselineDifficulty(patterns) {
    // Calculate the weighted average of difficulties
    let totalWeight = 0;
    let weightedSum = 0;

    Object.values(patterns.timeOfDay).forEach(difficulties => {
      difficulties.forEach((difficulty, index) => {
        const weight = Math.exp(-0.1 * (difficulties.length - 1 - index)); // More recent entries have higher weight
        weightedSum += difficulty * weight;
        totalWeight += weight;
      });
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 3; // Default to medium difficulty
  }

  projectDifficulty(patterns, userMetrics) {
    const baseline = this.calculateBaselineDifficulty(patterns);
    const trend = this.calculateDifficultyTrend(patterns.sequential);
    const adaptation = this.calculateAdaptationRate(patterns.sequential);

    return {
      oneWeek: this.projectDifficultyValue(baseline, trend, adaptation, 7),
      oneMonth: this.projectDifficultyValue(baseline, trend, adaptation, 30),
      threeMonths: this.projectDifficultyValue(baseline, trend, adaptation, 90)
    };
  }

  projectDifficultyValue(baseline, trend, adaptation, days) {
    const projectedChange = trend * days * adaptation;
    const projectedDifficulty = Math.max(1, Math.min(5, baseline + projectedChange));
    
    return {
      value: projectedDifficulty,
      confidence: this.calculateProjectionConfidence(days, adaptation),
      range: this.calculateDifficultyRange(projectedDifficulty, days)
    };
  }

  calculateDifficultyRange(predicted, days) {
    const uncertainty = Math.min(0.5, 0.1 * Math.sqrt(days));
    return {
      min: Math.max(1, predicted - uncertainty),
      max: Math.min(5, predicted + uncertainty)
    };
  }

  // Utility methods
  combineFactors(factors) {
    return factors.reduce((sum, factor) => sum + factor, 0);
  }

  calculateConfidence(sampleSize, minRequired) {
    const baseConfidence = Math.min(sampleSize / minRequired, 1);
    return Math.min(this.weightings.confidence.baseline + 
      (baseConfidence * this.weightings.confidence.increment), 1);
  }

  getTimeOfDay(timestamp) {
    const hour = new Date(timestamp).getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  generateBasePrediction() {
    return {
      probability: 0.5,
      confidence: this.weightings.confidence.baseline,
      note: 'Insufficient data for accurate prediction'
    };
  }
}

export default PredictionModelService;
