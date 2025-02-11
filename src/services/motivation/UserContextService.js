import { analyticsService } from '../AnalyticsService';

class UserContextService {
  constructor() {
    this.contextFactors = {
      time: {
        weight: 0.2,
        categories: {
          morning: { start: 5, end: 11 },
          afternoon: { start: 12, end: 17 },
          evening: { start: 18, end: 23 }
        }
      },
      activity: {
        weight: 0.3,
        states: ['active', 'idle', 'busy', 'resting']
      },
      productivity: {
        weight: 0.25,
        levels: ['high', 'moderate', 'low']
      },
      engagement: {
        weight: 0.25,
        metrics: ['interaction_rate', 'response_time', 'completion_rate']
      }
    };
  }

  async getUserProfile(userId) {
    const storedProfile = this.getStoredProfile(userId);
    const activityData = await analyticsService.getUserActivityData(userId);
    
    return {
      ...storedProfile,
      activityPatterns: this.analyzeActivityPatterns(activityData),
      motivationProfile: await this.generateMotivationProfile(userId),
      contextualPreferences: this.extractContextualPreferences(storedProfile, activityData)
    };
  }

  async getCurrentContext(userId) {
    const recentActivity = await analyticsService.getUserRecentActivity(userId);
    const habitData = await analyticsService.getUserHabitData(userId);
    const deviceContext = await this.getDeviceContext();

    return {
      timeContext: this.getTimeContext(),
      activityContext: this.getActivityContext(recentActivity),
      habitContext: this.getHabitContext(habitData),
      environmentalContext: this.getEnvironmentalContext(deviceContext),
      cognitiveLoad: this.estimateCognitiveLoad(recentActivity, habitData)
    };
  }

  getTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    return {
      timeOfDay: this.getTimeOfDay(hour),
      dayType: this.getDayType(dayOfWeek),
      isWorkHours: this.isWorkingHours(hour, dayOfWeek),
      timeAwareness: {
        rushHour: this.isRushHour(hour),
        mealTime: this.isMealTime(hour),
        leisureTime: this.isLeisureTime(hour, dayOfWeek)
      }
    };
  }

  getTimeOfDay(hour) {
    for (const [period, range] of Object.entries(this.contextFactors.time.categories)) {
      if (hour >= range.start && hour <= range.end) {
        return period;
      }
    }
    return 'night';
  }

  getDayType(dayOfWeek) {
    return dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'workday';
  }

  isWorkingHours(hour, dayOfWeek) {
    return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour <= 17;
  }

  isRushHour(hour) {
    return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  }

  isMealTime(hour) {
    return [7, 8, 12, 13, 18, 19].includes(hour);
  }

  isLeisureTime(hour, dayOfWeek) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return isWeekend || hour >= 18 || hour <= 5;
  }

  getActivityContext(recentActivity) {
    return {
      currentState: this.determineActivityState(recentActivity),
      intensity: this.calculateActivityIntensity(recentActivity),
      patterns: this.identifyActivityPatterns(recentActivity),
      transitions: this.detectStateTransitions(recentActivity)
    };
  }

  determineActivityState(recentActivity) {
    const activeThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const lastActivity = recentActivity.lastInteraction;
    
    if (now - lastActivity < activeThreshold) {
      return 'active';
    } else if (recentActivity.isInMeeting) {
      return 'busy';
    } else if (recentActivity.screenLocked) {
      return 'away';
    }
    return 'idle';
  }

  calculateActivityIntensity(recentActivity) {
    const factors = {
      interactionFrequency: 0.4,
      taskCompletion: 0.3,
      focusDuration: 0.3
    };

    let intensity = 0;
    
    // Interaction frequency
    const interactionsPerHour = recentActivity.interactions / 
      (recentActivity.duration / (60 * 60 * 1000));
    intensity += (interactionsPerHour / 60) * factors.interactionFrequency;

    // Task completion
    const completionRate = recentActivity.completedTasks / recentActivity.totalTasks;
    intensity += completionRate * factors.taskCompletion;

    // Focus duration
    const focusRatio = recentActivity.focusTime / recentActivity.duration;
    intensity += focusRatio * factors.focusDuration;

    return Math.min(intensity, 1);
  }

  getHabitContext(habitData) {
    return {
      activeHabits: this.getActiveHabits(habitData),
      upcomingHabits: this.getUpcomingHabits(habitData),
      streakStatus: this.getStreakStatus(habitData),
      completionContext: this.getCompletionContext(habitData)
    };
  }

  getActiveHabits(habitData) {
    const now = new Date();
    return habitData.habits.filter(habit => {
      const scheduleTime = new Date(habit.scheduledTime);
      const timeDiff = Math.abs(now - scheduleTime);
      return timeDiff <= 30 * 60 * 1000; // within 30 minutes
    });
  }

  getUpcomingHabits(habitData) {
    const now = new Date();
    const next2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    return habitData.habits
      .filter(habit => {
        const scheduleTime = new Date(habit.scheduledTime);
        return scheduleTime > now && scheduleTime <= next2Hours;
      })
      .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  }

  getStreakStatus(habitData) {
    return {
      atRisk: habitData.habits.filter(h => this.isStreakAtRisk(h)),
      maintained: habitData.habits.filter(h => h.currentStreak > 0),
      broken: habitData.habits.filter(h => h.streakBrokenToday)
    };
  }

  isStreakAtRisk(habit) {
    if (!habit.currentStreak) return false;
    
    const now = new Date();
    const lastCompletion = new Date(habit.lastCompletionTime);
    const hoursSinceCompletion = (now - lastCompletion) / (60 * 60 * 1000);
    
    return hoursSinceCompletion >= 20 && !habit.completedToday;
  }

  getCompletionContext(habitData) {
    return {
      todaysProgress: this.calculateTodaysProgress(habitData),
      weeklyProgress: this.calculateWeeklyProgress(habitData),
      trending: this.identifyTrends(habitData),
      categories: this.getCategoryProgress(habitData)
    };
  }

  calculateTodaysProgress(habitData) {
    const total = habitData.habits.length;
    const completed = habitData.habits.filter(h => h.completedToday).length;
    
    return {
      completed,
      total,
      percentage: (completed / total) * 100,
      remainingUrgent: this.getUrgentRemaining(habitData.habits)
    };
  }

  getUrgentRemaining(habits) {
    const now = new Date();
    return habits
      .filter(h => !h.completedToday)
      .filter(h => {
        const scheduleTime = new Date(h.scheduledTime);
        const hoursUntilDue = (scheduleTime - now) / (60 * 60 * 1000);
        return hoursUntilDue <= 2 && hoursUntilDue >= 0;
      });
  }

  async getDeviceContext() {
    // This would normally come from the device/browser API
    return {
      platform: 'web',
      screenSize: 'desktop',
      hasNotifications: true,
      isOnline: navigator.onLine,
      batteryLevel: await this.getBatteryLevel(),
      networkQuality: await this.getNetworkQuality()
    };
  }

  estimateCognitiveLoad(recentActivity, habitData) {
    let load = 0;

    // Activity-based factors
    if (recentActivity.isInMeeting) load += 0.3;
    if (recentActivity.activeApps.length > 3) load += 0.2;
    if (recentActivity.focusTime > 45 * 60 * 1000) load += 0.2;

    // Habit-based factors
    const urgentTasks = this.getUrgentRemaining(habitData.habits);
    if (urgentTasks.length > 0) load += 0.2 * Math.min(urgentTasks.length, 3);

    // Time-based factors
    const hour = new Date().getHours();
    if (hour >= 14 && hour <= 16) load += 0.1; // Post-lunch dip
    if (hour >= 22 || hour <= 5) load += 0.2; // Late night

    return Math.min(load, 1);
  }

  getStoredProfile(userId) {
    return JSON.parse(localStorage.getItem(`userProfile_${userId}`) || '{}');
  }

  async updateProfile(userId, updates) {
    const currentProfile = await this.getUserProfile(userId);
    const newProfile = {
      ...currentProfile,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(`userProfile_${userId}`, JSON.stringify(newProfile));
    return newProfile;
  }
}

export default UserContextService;
