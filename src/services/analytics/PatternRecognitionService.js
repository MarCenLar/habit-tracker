class PatternRecognitionService {
  constructor() {
    this.patternTypes = {
      temporal: {
        weight: 0.3,
        minConfidence: 0.7,
        timeFrames: ['daily', 'weekly', 'monthly']
      },
      behavioral: {
        weight: 0.25,
        minConfidence: 0.65,
        aspects: ['motivation', 'energy', 'difficulty', 'mood']
      },
      contextual: {
        weight: 0.25,
        minConfidence: 0.6,
        factors: ['location', 'weather', 'dayType', 'timeOfDay']
      },
      sequential: {
        weight: 0.2,
        minConfidence: 0.75,
        maxGap: 3600000 // 1 hour in milliseconds
      }
    };
  }

  async detectPatterns(habit) {
    const patterns = [];

    const [temporal, behavioral, contextual, sequential] = await Promise.all([
      this.detectTemporalPatterns(habit),
      this.detectBehavioralPatterns(habit),
      this.detectContextualPatterns(habit),
      this.detectSequentialPatterns(habit)
    ]);

    patterns.push(...temporal, ...behavioral, ...contextual, ...sequential);

    return {
      patterns: this.filterSignificantPatterns(patterns),
      insights: this.generatePatternInsights(patterns),
      recommendations: this.generateRecommendations(patterns, habit)
    };
  }

  async detectPatternsFromMetrics(metrics) {
    const patterns = [];
    const timestamp = new Date(metrics.timestamp);

    // Check for time-based patterns
    if (metrics.completed) {
      patterns.push({
        type: 'completion_time',
        value: {
          hour: timestamp.getHours(),
          dayOfWeek: timestamp.getDay()
        },
        metadata: {
          quality: metrics.metrics?.quality || null,
          duration: metrics.metrics?.duration || null
        }
      });
    }

    // Check for context patterns
    if (metrics.metrics?.context) {
      patterns.push({
        type: 'completion_context',
        value: metrics.metrics.context,
        metadata: {
          success: metrics.completed,
          quality: metrics.metrics?.quality || null
        }
      });
    }

    // Check for performance patterns
    if (metrics.metrics) {
      const performance = this.analyzePerformanceMetrics(metrics.metrics);
      if (performance.isSignificant) {
        patterns.push({
          type: 'performance_pattern',
          value: performance.level,
          metadata: performance.factors
        });
      }
    }

    return this.filterSignificantPatterns(patterns);
  }

  analyzePerformanceMetrics(metrics) {
    const factors = {};
    let totalScore = 0;
    let validFactors = 0;

    // Analyze each metric
    if (typeof metrics.quality === 'number') {
      factors.quality = metrics.quality;
      totalScore += metrics.quality;
      validFactors++;
    }

    if (typeof metrics.energy === 'number') {
      factors.energy = metrics.energy;
      totalScore += metrics.energy;
      validFactors++;
    }

    if (typeof metrics.difficulty === 'number') {
      factors.difficulty = metrics.difficulty;
      totalScore += (5 - metrics.difficulty); // Invert difficulty
      validFactors++;
    }

    if (typeof metrics.duration === 'number') {
      // Normalize duration to 0-5 scale
      const normalizedDuration = Math.min(metrics.duration / 60, 5); // Cap at 5 minutes
      factors.duration = normalizedDuration;
      totalScore += normalizedDuration;
      validFactors++;
    }

    const averageScore = validFactors > 0 ? totalScore / validFactors : 0;

    return {
      isSignificant: validFactors >= 2 && averageScore >= 3.5,
      level: this.getPerformanceLevel(averageScore),
      factors
    };
  }

  getPerformanceLevel(score) {
    if (score >= 4.5) return 'exceptional';
    if (score >= 4.0) return 'excellent';
    if (score >= 3.5) return 'good';
    if (score >= 3.0) return 'average';
    return 'below_average';
  }

  generatePatternInsights(patterns) {
    return patterns.map(pattern => ({
      type: 'pattern_insight',
      category: this.categorizePattern(pattern),
      title: this.getPatternTitle(pattern),
      description: this.generateDescription(pattern),
      strength: this.calculatePatternStrength(pattern),
      confidence: pattern.confidence,
      applicability: this.determineApplicability(pattern)
    }));
  }

  categorizePattern(pattern) {
    const categories = {
      temporal: ['peak_hours', 'optimal_days', 'streak_timing'],
      behavioral: ['mood_correlation', 'energy_correlation', 'performance_pattern'],
      contextual: ['location_pattern', 'weather_pattern', 'completion_context'],
      sequential: ['sequence_pattern', 'chain_pattern']
    };

    return Object.entries(categories).find(([, types]) => 
      types.includes(pattern.type)
    )?.[0] || 'other';
  }

  generateDescription(pattern) {
    const templates = {
      peak_hours: `Most successful completions occur between ${this.formatTimeRange(pattern.value)}`,
      optimal_days: `Highest success rate on ${this.formatDays(pattern.value)}`,
      mood_correlation: `Performance peaks when feeling ${pattern.value.join(', ')}`,
      energy_correlation: `Best results with ${pattern.value} energy levels`,
      location_pattern: `Most effective at ${pattern.value.join(', ')}`,
      weather_pattern: `Optimal conditions: ${pattern.value.join(', ')}`,
      performance_pattern: `Consistently ${pattern.value} performance when ${this.formatFactors(pattern.metadata.factors)}`
    };

    return templates[pattern.type] || 'Pattern detected';
  }

  generateRecommendations(patterns, habit) {
    const recommendations = [];

    // Group patterns by category
    const groupedPatterns = patterns.reduce((groups, pattern) => {
      const category = this.categorizePattern(pattern);
      if (!groups[category]) groups[category] = [];
      groups[category].push(pattern);
      return groups;
    }, {});

    // Generate timing recommendations
    if (groupedPatterns.temporal) {
      recommendations.push(...this.generateTimingRecommendations(groupedPatterns.temporal));
    }

    // Generate behavioral recommendations
    if (groupedPatterns.behavioral) {
      recommendations.push(...this.generateBehavioralRecommendations(groupedPatterns.behavioral));
    }

    // Generate context recommendations
    if (groupedPatterns.contextual) {
      recommendations.push(...this.generateContextRecommendations(groupedPatterns.contextual));
    }

    // Generate sequence recommendations
    if (groupedPatterns.sequential) {
      recommendations.push(...this.generateSequenceRecommendations(groupedPatterns.sequential, habit));
    }

    return this.prioritizeRecommendations(recommendations);
  }

  prioritizeRecommendations(recommendations) {
    return recommendations
      .sort((a, b) => {
        // Sort by actionability and impact
        const scoreA = a.actionability * 0.6 + a.impact * 0.4;
        const scoreB = b.actionability * 0.6 + b.impact * 0.4;
        return scoreB - scoreA;
      })
      .slice(0, 5); // Return top 5 recommendations
  }

  // Utility methods
  formatTimeRange(times) {
    return times
      .map(t => `${t}:00`)
      .join('-');
  }

  formatDays(days) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.map(d => dayNames[d]).join(', ');
  }

  formatFactors(factors) {
    return Object.entries(factors)
      .map(([factor, value]) => `${factor}: ${value}`)
      .join(', ');
  }

  calculatePatternStrength(pattern) {
    const baseStrength = pattern.confidence || 0;
    const consistencyBonus = pattern.metadata?.consistency || 0;
    return Math.min(baseStrength + (consistencyBonus * 0.2), 1);
  }

  determineApplicability(pattern) {
    return {
      immediate: this.isImmediatelyApplicable(pattern),
      longTerm: this.hasLongTermValue(pattern),
      constraints: this.identifyConstraints(pattern)
    };
  }

  isImmediatelyApplicable(pattern) {
    return ['peak_hours', 'location_pattern', 'energy_correlation'].includes(pattern.type);
  }

  hasLongTermValue(pattern) {
    return pattern.confidence > 0.8 && pattern.metadata?.sampleSize > 20;
  }

  identifyConstraints(pattern) {
    const constraints = [];
    
    if (pattern.type.includes('location')) {
      constraints.push('location_dependent');
    }
    if (pattern.type.includes('weather')) {
      constraints.push('weather_dependent');
    }
    if (pattern.metadata?.timeSpecific) {
      constraints.push('time_sensitive');
    }

    return constraints;
  }
}

export default PatternRecognitionService;
