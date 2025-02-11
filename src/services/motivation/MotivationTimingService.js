import { analyticsService } from '../AnalyticsService';

class MotivationTimingService {
  constructor() {
    this.defaultTimings = {
      morning: {
        start: '06:00',
        end: '10:00',
        priority: ['planning', 'encouragement']
      },
      afternoon: {
        start: '12:00',
        end: '17:00',
        priority: ['progress_check', 'reminder']
      },
      evening: {
        start: '18:00',
        end: '22:00',
        priority: ['reflection', 'celebration']
      }
    };

    this.activityFactors = {
      habitsCompleted: { weight: 0.3, threshold: 0.7 },
      userEngagement: { weight: 0.3, threshold: 0.6 },
      timeSpent: { weight: 0.2, threshold: 300 }, // seconds
      responseRate: { weight: 0.2, threshold: 0.8 }
    };
  }

  async getOptimalDeliveryTime(params) {
    const {
      userProfile,
      currentContext,
      messageType
    } = params;

    const timeSlots = await this.generateTimeSlots(userProfile.userId);
    const scoredSlots = await this.scoreTimeSlots(timeSlots, {
      userProfile,
      currentContext,
      messageType
    });

    return this.selectBestTimeSlot(scoredSlots, currentContext);
  }

  async generateTimeSlots(userId) {
    const userPreferences = await this.getUserPreferences(userId);
    const activeHours = await this.getActiveHours(userId);
    const slots = [];

    // Generate 30-minute slots during active hours
    for (let hour = activeHours.start; hour <= activeHours.end; hour++) {
      for (let minute of [0, 30]) {
        const time = this.formatTime(hour, minute);
        if (this.isWithinPreferredTime(time, userPreferences)) {
          slots.push({
            time,
            period: this.getPeriod(hour),
            isPreferred: this.isPreferredTime(time, userPreferences)
          });
        }
      }
    }

    return slots;
  }

  async scoreTimeSlots(slots, context) {
    const activityPatterns = await analyticsService.getUserActivityPatterns(context.userProfile.userId);
    const scoredSlots = [];

    for (const slot of slots) {
      const score = await this.calculateSlotScore(slot, {
        activityPatterns,
        context
      });

      scoredSlots.push({
        ...slot,
        score
      });
    }

    return scoredSlots.sort((a, b) => b.score - a.score);
  }

  async calculateSlotScore(slot, { activityPatterns, context }) {
    let score = 0;
    const weights = {
      activityPattern: 0.3,
      messageType: 0.2,
      userPreference: 0.3,
      contextual: 0.2
    };

    // Activity pattern matching
    score += weights.activityPattern * this.getActivityScore(slot, activityPatterns);

    // Message type appropriateness
    score += weights.messageType * this.getMessageTypeScore(slot, context.messageType);

    // User preference alignment
    score += weights.userPreference * this.getPreferenceScore(slot, context.userProfile);

    // Contextual factors
    score += weights.contextual * this.getContextualScore(slot, context.currentContext);

    return Math.min(score, 1);
  }

  getActivityScore(slot, patterns) {
    const timeKey = this.getTimeKey(slot.time);
    const pattern = patterns[timeKey] || {};

    return Object.entries(this.activityFactors).reduce((score, [factor, config]) => {
      const value = pattern[factor] || 0;
      return score + (config.weight * Math.min(value / config.threshold, 1));
    }, 0);
  }

  getMessageTypeScore(slot, messageType) {
    const period = this.getPeriod(parseInt(slot.time));
    const priorities = this.defaultTimings[period].priority;
    
    if (priorities.includes(messageType)) {
      return priorities.indexOf(messageType) === 0 ? 1 : 0.7;
    }
    
    return 0.3;
  }

  getPreferenceScore(slot, userProfile) {
    let score = 0;

    // Preferred time bonus
    if (slot.isPreferred) {
      score += 0.5;
    }

    // Previous engagement success
    const engagementHistory = userProfile.messageEngagement || {};
    const timeKey = this.getTimeKey(slot.time);
    if (engagementHistory[timeKey]?.successRate > 0.7) {
      score += 0.5;
    }

    return Math.min(score, 1);
  }

  getContextualScore(slot, context) {
    let score = 0;

    // Available time windows
    if (context.availableTimeWindows?.includes(this.getTimeKey(slot.time))) {
      score += 0.4;
    }

    // Energy level alignment
    const periodEnergyLevel = this.getPeriodEnergyLevel(slot.time);
    if (periodEnergyLevel === context.userEnergyLevel) {
      score += 0.3;
    }

    // Habit completion proximity
    if (context.upcomingHabits?.some(h => this.isNearHabitTime(slot.time, h.preferredTime))) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  selectBestTimeSlot(scoredSlots, currentContext) {
    // Filter out past times
    const now = new Date();
    const validSlots = scoredSlots.filter(slot => {
      const slotTime = this.parseTime(slot.time);
      return slotTime > now;
    });

    // Consider immediate delivery if conditions are met
    if (this.shouldDeliverImmediately(currentContext)) {
      return {
        time: new Date().toISOString(),
        immediate: true,
        reason: 'urgent_context'
      };
    }

    // Get highest scored future slot
    const bestSlot = validSlots[0];
    if (!bestSlot) {
      return this.getFallbackTime(currentContext);
    }

    return {
      time: this.parseTime(bestSlot.time).toISOString(),
      score: bestSlot.score,
      reason: 'optimal_timing'
    };
  }

  shouldDeliverImmediately(context) {
    return (
      context.urgentMotivationNeeded ||
      context.missedStreak ||
      (context.userEnergyLevel === 'high' && context.currentActivity === 'active')
    );
  }

  getFallbackTime(context) {
    // Default to next hour during active period
    const now = new Date();
    const hour = now.getHours();
    
    if (hour < 22) {
      now.setHours(hour + 1, 0, 0, 0);
    } else {
      // Next day morning
      now.setDate(now.getDate() + 1);
      now.setHours(9, 0, 0, 0);
    }

    return {
      time: now.toISOString(),
      reason: 'fallback'
    };
  }

  // Utility functions
  formatTime(hour, minute) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  getTimeKey(time) {
    return time.replace(':', '');
  }

  getPeriod(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    return 'evening';
  }

  getPeriodEnergyLevel(time) {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 11) return 'high';
    if (hour >= 11 && hour < 15) return 'moderate';
    if (hour >= 15 && hour < 19) return 'moderate';
    return 'low';
  }

  isNearHabitTime(slotTime, habitTime, threshold = 30) {
    if (!habitTime) return false;
    
    const slot = this.parseTime(slotTime);
    const habit = this.parseTime(habitTime);
    const diffMinutes = Math.abs(slot - habit) / (1000 * 60);
    
    return diffMinutes <= threshold;
  }

  async getUserPreferences(userId) {
    return JSON.parse(localStorage.getItem(`userPreferences_${userId}`) || '{}');
  }

  async getActiveHours(userId) {
    const preferences = await this.getUserPreferences(userId);
    return {
      start: preferences.activeHours?.start || 6,
      end: preferences.activeHours?.end || 22
    };
  }
}

export default MotivationTimingService;
