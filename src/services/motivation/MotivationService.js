import { analyticsService } from '../AnalyticsService';
import { MotivationContentService } from './MotivationContentService';
import { MotivationTimingService } from './MotivationTimingService';
import { EmotionalIntelligenceService } from './EmotionalIntelligenceService';
import { UserContextService } from './UserContextService';

class MotivationService {
  constructor() {
    this.content = new MotivationContentService();
    this.timing = new MotivationTimingService();
    this.emotionalIntelligence = new EmotionalIntelligenceService();
    this.userContext = new UserContextService();
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('motivationalSettings')) {
      localStorage.setItem('motivationalSettings', JSON.stringify({
        preferences: {
          messageFrequency: 'moderate',
          messageTypes: ['encouragement', 'challenge', 'reflection', 'celebration'],
          preferredTime: '09:00',
          notificationStyle: 'gentle',
          contentTone: 'supportive'
        },
        personalizedContent: {
          favoriteQuotes: [],
          customMilestones: [],
          triggerPhrases: [],
          avoidedTopics: []
        },
        userProfile: {
          motivationStyle: null,
          challengePreference: 'balanced',
          feedbackStyle: 'growth',
          emotionalResponsiveness: 'moderate'
        },
        celebrations: {
          milestones: true,
          streaks: true,
          achievements: true,
          sound: true,
          notifications: true,
          style: 'animated'
        },
        emotionalSupport: {
          detectMood: true,
          adaptContent: true,
          provideResources: true
        }
      }));
    }
  }

  async getDailyMessage(userId) {
    const userProfile = await this.userContext.getUserProfile(userId);
    const currentContext = await this.userContext.getCurrentContext(userId);
    const emotionalState = await this.emotionalIntelligence.analyzeUserState(userId);
    
    // Get personalized content based on user's current state
    const content = await this.content.getPersonalizedContent({
      userProfile,
      currentContext,
      emotionalState
    });

    // Determine optimal delivery timing
    const timing = await this.timing.getOptimalDeliveryTime({
      userProfile,
      currentContext,
      messageType: content.type
    });

    // Apply emotional intelligence adjustments
    const adjustedContent = await this.emotionalIntelligence.adjustMessageContent(content, {
      userProfile,
      emotionalState,
      context: currentContext
    });

    return {
      ...adjustedContent,
      deliveryTime: timing,
      contextualData: this.getContextualData(currentContext)
    };
  }

  async celebrateProgress(achievement, userId) {
    const settings = await this.getMotivationalSettings();
    if (!settings.celebrations[achievement.type]) return null;

    const userContext = await this.userContext.getCurrentContext(userId);
    const emotionalState = await this.emotionalIntelligence.analyzeUserState(userId);

    // Generate personalized celebration
    const celebration = {
      type: achievement.type,
      message: await this.generateCelebrationMessage(achievement, userContext, emotionalState),
      timestamp: new Date().toISOString(),
      animation: this.getCelebrationAnimation(achievement, settings),
      sound: this.getCelebrationSound(achievement, settings),
      contextualData: this.getContextualData(userContext)
    };

    // Record celebration for analytics
    await this.recordCelebration(celebration, userId);

    // Update user motivation profile
    await this.updateMotivationProfile(userId, achievement, emotionalState);

    return celebration;
  }

  async generateCelebrationMessage(achievement, context, emotionalState) {
    const messageBase = await this.content.getCelebrationTemplate(achievement.type);
    
    // Personalize message based on context and emotional state
    const personalizedMessage = this.emotionalIntelligence.personalizeMessage(
      messageBase,
      context,
      emotionalState
    );

    // Add achievement-specific details
    return this.enrichMessageWithAchievementDetails(personalizedMessage, achievement);
  }

  getCelebrationAnimation(achievement, settings) {
    if (!settings.celebrations.style || settings.celebrations.style === 'none') {
      return null;
    }

    const animations = {
      streak: {
        type: 'particle',
        effect: 'flame-trail',
        duration: 3000,
        intensity: this.calculateAnimationIntensity(achievement)
      },
      milestone: {
        type: 'fireworks',
        effect: 'starburst',
        duration: 4000,
        intensity: this.calculateAnimationIntensity(achievement)
      },
      achievement: {
        type: 'confetti',
        effect: 'spiral',
        duration: 3500,
        intensity: this.calculateAnimationIntensity(achievement)
      }
    };

    return animations[achievement.type] || animations.achievement;
  }

  getCelebrationSound(achievement, settings) {
    if (!settings.celebrations.sound) return null;

    const sounds = {
      streak: {
        file: 'celebration-streak.mp3',
        volume: 0.7,
        duration: 2000
      },
      milestone: {
        file: 'celebration-milestone.mp3',
        volume: 0.8,
        duration: 3000
      },
      achievement: {
        file: 'celebration-achievement.mp3',
        volume: 0.7,
        duration: 2500
      }
    };

    return sounds[achievement.type] || sounds.achievement;
  }

  calculateAnimationIntensity(achievement) {
    // Base intensity on achievement significance
    let intensity = 1;
    
    if (achievement.type === 'streak') {
      intensity = Math.min(achievement.days / 30, 1); // Max intensity at 30-day streak
    } else if (achievement.type === 'milestone') {
      intensity = Math.min(achievement.progress / 100, 1); // Based on completion percentage
    } else if (achievement.significance) {
      intensity = Math.min(achievement.significance / 10, 1); // Based on significance rating
    }

    return intensity;
  }

  getContextualData(context) {
    return {
      timeOfDay: context.timeOfDay,
      userActivity: context.currentActivity,
      recentProgress: context.recentProgress,
      nearbyMilestones: context.upcomingMilestones,
      mood: context.currentMood
    };
  }

  async recordCelebration(celebration, userId) {
    const history = await this.getCelebrationHistory(userId);
    history.push(celebration);
    
    // Keep only last 100 celebrations
    if (history.length > 100) {
      history.shift();
    }
    
    localStorage.setItem(`celebrationHistory_${userId}`, JSON.stringify(history));
    
    // Update analytics
    await analyticsService.trackCelebration(celebration, userId);
  }

  async updateMotivationProfile(userId, achievement, emotionalState) {
    const profile = await this.userContext.getUserProfile(userId);
    
    // Update motivation patterns
    profile.recentAchievements.push({
      type: achievement.type,
      timestamp: new Date().toISOString(),
      emotionalState
    });

    // Keep only last 10 achievements for pattern analysis
    if (profile.recentAchievements.length > 10) {
      profile.recentAchievements.shift();
    }

    // Update motivation style based on patterns
    profile.motivationStyle = this.analyzeMotivationStyle(profile.recentAchievements);
    
    await this.userContext.updateUserProfile(userId, profile);
  }

  analyzeMotivationStyle(achievements) {
    const patterns = {
      streakFocused: 0,
      milestoneDriven: 0,
      socialMotivated: 0,
      challengeOriented: 0
    };

    achievements.forEach(achievement => {
      switch (achievement.type) {
        case 'streak':
          patterns.streakFocused++;
          break;
        case 'milestone':
          patterns.milestoneDriven++;
          break;
        case 'social':
          patterns.socialMotivated++;
          break;
        case 'challenge':
          patterns.challengeOriented++;
          break;
      }
    });

    // Return the dominant motivation style
    return Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  async getMotivationalSettings(userId) {
    const settings = JSON.parse(localStorage.getItem('motivationalSettings'));
    const userProfile = await this.userContext.getUserProfile(userId);
    
    return {
      ...settings,
      userProfile,
      adaptedPreferences: this.adaptPreferencesToContext(settings, userProfile)
    };
  }

  adaptPreferencesToContext(settings, userProfile) {
    // Adjust settings based on user's patterns and preferences
    const adapted = { ...settings };
    
    if (userProfile.motivationStyle === 'streakFocused') {
      adapted.celebrations.streaks = true;
      adapted.messageTypes = ['encouragement', 'challenge'];
    }
    
    if (userProfile.challengePreference === 'high') {
      adapted.contentTone = 'challenging';
      adapted.messageFrequency = 'high';
    }

    return adapted;
  }

  async getCelebrationHistory(userId) {
    return JSON.parse(localStorage.getItem(`celebrationHistory_${userId}`) || '[]');
  }
}

export const motivationService = new MotivationService();
