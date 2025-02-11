class HabitCorrelationService {
  constructor() {
    this.correlationTypes = {
      completion: { weight: 0.4, threshold: 0.7 },
      timing: { weight: 0.3, threshold: 0.6 },
      performance: { weight: 0.2, threshold: 0.6 },
      context: { weight: 0.1, threshold: 0.5 }
    };

    this.timeWindow = {
      recent: 7, // days
      medium: 30, // days
      long: 90 // days
    };
  }

  async analyzeHabitCorrelations(targetHabit) {
    const allHabits = await this.getAllHabits();
    const correlations = [];

    for (const habit of allHabits) {
      if (habit.id === targetHabit.id) continue;

      const correlation = await this.calculateCorrelation(targetHabit, habit);
      if (this.isSignificantCorrelation(correlation)) {
        correlations.push(correlation);
      }
    }

    return {
      correlations: this.rankCorrelations(correlations),
      insights: this.generateCorrelationInsights(correlations),
      dependencies: this.identifyDependencies(correlations)
    };
  }

  async calculateCorrelation(habitA, habitB) {
    const [completionCorr, timingCorr, performanceCorr, contextCorr] = await Promise.all([
      this.calculateCompletionCorrelation(habitA, habitB),
      this.calculateTimingCorrelation(habitA, habitB),
      this.calculatePerformanceCorrelation(habitA, habitB),
      this.calculateContextCorrelation(habitA, habitB)
    ]);

    const overallScore = this.calculateOverallScore({
      completion: completionCorr,
      timing: timingCorr,
      performance: performanceCorr,
      context: contextCorr
    });

    return {
      habitA: habitA.id,
      habitB: habitB.id,
      overallScore,
      details: {
        completion: completionCorr,
        timing: timingCorr,
        performance: performanceCorr,
        context: contextCorr
      },
      type: this.determineCorrelationType({
        completion: completionCorr,
        timing: timingCorr,
        performance: performanceCorr,
        context: contextCorr
      }),
      confidence: this.calculateConfidence({
        completion: completionCorr,
        timing: timingCorr,
        performance: performanceCorr,
        context: contextCorr
      })
    };
  }

  async calculateCompletionCorrelation(habitA, habitB) {
    const timeframes = [
      { days: this.timeWindow.recent, weight: 0.5 },
      { days: this.timeWindow.medium, weight: 0.3 },
      { days: this.timeWindow.long, weight: 0.2 }
    ];

    let weightedCorrelation = 0;

    for (const timeframe of timeframes) {
      const correlation = await this.getCompletionCorrelationForTimeframe(
        habitA,
        habitB,
        timeframe.days
      );
      weightedCorrelation += correlation * timeframe.weight;
    }

    return {
      score: weightedCorrelation,
      timeframes: timeframes.map(t => ({
        days: t.days,
        correlation: this.getCompletionCorrelationForTimeframe(habitA, habitB, t.days)
      }))
    };
  }

  async getCompletionCorrelationForTimeframe(habitA, habitB, days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const historyA = habitA.history.filter(h => 
      new Date(h.timestamp) >= startDate
    );
    const historyB = habitB.history.filter(h => 
      new Date(h.timestamp) >= startDate
    );

    // Group by day for fair comparison
    const dailyA = this.groupByDay(historyA);
    const dailyB = this.groupByDay(historyB);

    // Get matching days
    const dates = new Set([
      ...Object.keys(dailyA),
      ...Object.keys(dailyB)
    ]);

    let correlationSum = 0;
    let count = 0;

    dates.forEach(date => {
      const completionA = dailyA[date]?.completed ? 1 : 0;
      const completionB = dailyB[date]?.completed ? 1 : 0;

      if (typeof completionA === 'number' && typeof completionB === 'number') {
        correlationSum += completionA === completionB ? 1 : 0;
        count++;
      }
    });

    return count > 0 ? correlationSum / count : 0;
  }

  async calculateTimingCorrelation(habitA, habitB) {
    const timingPatterns = {
      sameTime: 0,
      sequential: 0,
      total: 0
    };

    const timeThreshold = 30 * 60 * 1000; // 30 minutes
    const sequentialThreshold = 2 * 60 * 60 * 1000; // 2 hours

    // Compare completed entries
    habitA.history.forEach(entryA => {
      if (!entryA.completed) return;

      const timeA = new Date(entryA.timestamp).getTime();
      
      habitB.history.forEach(entryB => {
        if (!entryB.completed) return;

        const timeB = new Date(entryB.timestamp).getTime();
        const timeDiff = Math.abs(timeA - timeB);

        if (timeDiff <= timeThreshold) {
          timingPatterns.sameTime++;
        } else if (timeDiff <= sequentialThreshold) {
          timingPatterns.sequential++;
        }
        timingPatterns.total++;
      });
    });

    return {
      score: timingPatterns.total > 0 ? 
        (timingPatterns.sameTime + 0.5 * timingPatterns.sequential) / timingPatterns.total : 0,
      patterns: timingPatterns
    };
  }

  async calculatePerformanceCorrelation(habitA, habitB) {
    const performances = [];

    // Match days where both habits were completed
    habitA.history.forEach(entryA => {
      if (!entryA.completed || !entryA.metrics) return;

      const dateA = new Date(entryA.timestamp).toDateString();
      const matchingB = habitB.history.find(entryB => 
        entryB.completed &&
        entryB.metrics &&
        new Date(entryB.timestamp).toDateString() === dateA
      );

      if (matchingB) {
        performances.push({
          A: this.calculatePerformanceScore(entryA.metrics),
          B: this.calculatePerformanceScore(matchingB.metrics)
        });
      }
    });

    return {
      score: this.calculatePerformanceCorrelationScore(performances),
      sampleSize: performances.length
    };
  }

  calculatePerformanceScore(metrics) {
    const weights = {
      quality: 0.4,
      duration: 0.3,
      difficulty: 0.2,
      energy: 0.1
    };

    let score = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([metric, weight]) => {
      if (typeof metrics[metric] === 'number') {
        score += metrics[metric] * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  calculatePerformanceCorrelationScore(performances) {
    if (performances.length < 2) return 0;

    const n = performances.length;
    const sumA = performances.reduce((sum, p) => sum + p.A, 0);
    const sumB = performances.reduce((sum, p) => sum + p.B, 0);
    const meanA = sumA / n;
    const meanB = sumB / n;

    const covariance = performances.reduce((sum, p) => 
      sum + (p.A - meanA) * (p.B - meanB), 0
    ) / (n - 1);

    const stdDevA = Math.sqrt(
      performances.reduce((sum, p) => 
        sum + Math.pow(p.A - meanA, 2), 0
      ) / (n - 1)
    );

    const stdDevB = Math.sqrt(
      performances.reduce((sum, p) => 
        sum + Math.pow(p.B - meanB, 2), 0
      ) / (n - 1)
    );

    return covariance / (stdDevA * stdDevB);
  }

  async calculateContextCorrelation(habitA, habitB) {
    const contextFactors = {
      location: 0,
      weather: 0,
      timeOfDay: 0,
      dayType: 0,
      total: 0
    };

    habitA.history.forEach(entryA => {
      if (!entryA.completed || !entryA.metrics?.context) return;

      const dateA = new Date(entryA.timestamp).toDateString();
      const matchingB = habitB.history.find(entryB => 
        entryB.completed &&
        entryB.metrics?.context &&
        new Date(entryB.timestamp).toDateString() === dateA
      );

      if (matchingB) {
        const contextA = entryA.metrics.context;
        const contextB = matchingB.metrics.context;

        if (contextA.location === contextB.location) contextFactors.location++;
        if (contextA.weather === contextB.weather) contextFactors.weather++;
        if (contextA.timeOfDay === contextB.timeOfDay) contextFactors.timeOfDay++;
        if (contextA.dayType === contextB.dayType) contextFactors.dayType++;
        contextFactors.total++;
      }
    });

    return {
      score: contextFactors.total > 0 ? 
        (contextFactors.location + contextFactors.weather + 
         contextFactors.timeOfDay + contextFactors.dayType) / 
        (contextFactors.total * 4) : 0,
      factors: contextFactors
    };
  }

  calculateOverallScore(correlations) {
    return Object.entries(this.correlationTypes).reduce((score, [type, config]) => {
      return score + (correlations[type].score * config.weight);
    }, 0);
  }

  determineCorrelationType(correlations) {
    // Find the strongest correlation type
    return Object.entries(correlations)
      .sort(([,a], [,b]) => b.score - a.score)[0][0];
  }

  calculateConfidence(correlations) {
    const sampleSizes = Object.values(correlations)
      .map(c => c.sampleSize || 0);
    
    const minSampleSize = Math.min(...sampleSizes);
    const scaledConfidence = Math.min(minSampleSize / 30, 1); // 30 days as baseline

    return scaledConfidence;
  }

  isSignificantCorrelation(correlation) {
    return correlation.overallScore >= 0.5 && correlation.confidence >= 0.6;
  }

  rankCorrelations(correlations) {
    return correlations.sort((a, b) => {
      // Weight both score and confidence
      const scoreA = a.overallScore * 0.7 + a.confidence * 0.3;
      const scoreB = b.overallScore * 0.7 + b.confidence * 0.3;
      return scoreB - scoreA;
    });
  }

  generateCorrelationInsights(correlations) {
    return correlations.map(correlation => ({
      type: 'correlation',
      habitIds: [correlation.habitA, correlation.habitB],
      strength: this.getCorrelationStrength(correlation.overallScore),
      description: this.generateCorrelationDescription(correlation),
      recommendations: this.generateCorrelationRecommendations(correlation)
    }));
  }

  getCorrelationStrength(score) {
    if (score >= 0.8) return 'strong';
    if (score >= 0.6) return 'moderate';
    return 'weak';
  }

  generateCorrelationDescription(correlation) {
    const templates = {
      completion: "These habits are often completed together",
      timing: "These habits are usually performed at similar times",
      performance: "Success in one habit often predicts success in the other",
      context: "These habits share similar environmental conditions"
    };

    return templates[correlation.type];
  }

  generateCorrelationRecommendations(correlation) {
    const recommendations = [];
    
    if (correlation.details.timing.score > 0.7) {
      recommendations.push("Consider scheduling these habits together");
    }

    if (correlation.details.performance.score > 0.7) {
      recommendations.push("Try to maintain consistent energy levels for both habits");
    }

    if (correlation.details.context.score > 0.7) {
      recommendations.push("The environmental conditions are ideal for both habits");
    }

    return recommendations;
  }

  identifyDependencies(correlations) {
    return correlations
      .filter(c => c.overallScore > 0.8)
      .map(c => ({
        primary: c.habitA,
        dependent: c.habitB,
        strength: c.overallScore,
        type: this.getDependencyType(c)
      }));
  }

  getDependencyType(correlation) {
    if (correlation.details.timing.score > 0.9) return 'sequential';
    if (correlation.details.completion.score > 0.9) return 'coupled';
    if (correlation.details.context.score > 0.9) return 'contextual';
    return 'related';
  }

  groupByDay(history) {
    return history.reduce((days, entry) => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      days[date] = entry;
      return days;
    }, {});
  }

  async getAllHabits() {
    return JSON.parse(localStorage.getItem('habits') || '[]');
  }
}

export default HabitCorrelationService;
