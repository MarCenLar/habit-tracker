import { analyticsService } from '../AnalyticsService';

class EmotionalIntelligenceService {
  constructor() {
    this.emotionPatterns = {
      frustrated: {
        keywords: ['difficult', 'hard', 'struggle', 'can\'t', 'failing'],
        responseStyle: 'supportive',
        messageAdjustments: {
          tone: 'gentle',
          focus: 'small_wins',
          intensity: 'moderate'
        }
      },
      motivated: {
        keywords: ['excited', 'ready', 'can', 'will', 'achieve'],
        responseStyle: 'energetic',
        messageAdjustments: {
          tone: 'enthusiastic',
          focus: 'momentum',
          intensity: 'high'
        }
      },
      tired: {
        keywords: ['exhausted', 'tired', 'overwhelmed', 'busy'],
        responseStyle: 'nurturing',
        messageAdjustments: {
          tone: 'calming',
          focus: 'self_care',
          intensity: 'low'
        }
      },
      proud: {
        keywords: ['achieved', 'completed', 'proud', 'success'],
        responseStyle: 'celebratory',
        messageAdjustments: {
          tone: 'congratulatory',
          focus: 'achievements',
          intensity: 'high'
        }
      }
    };

    this.contextFactors = {
      timeOfDay: {
        morning: { energyLevel: 'high', focus: 'planning' },
        afternoon: { energyLevel: 'moderate', focus: 'progress' },
        evening: { energyLevel: 'low', focus: 'reflection' }
      },
      weekday: {
        workday: { stress: 'high', structure: 'rigid' },
        weekend: { stress: 'low', structure: 'flexible' }
      },
      progress: {
        ahead: { confidence: 'high', challenge: 'increase' },
        behind: { confidence: 'boost', challenge: 'decrease' },
        onTrack: { confidence: 'maintain', challenge: 'maintain' }
      }
    };
  }

  async analyzeUserState(userId) {
    const recentActivity = await analyticsService.getUserRecentActivity(userId);
    const habitPatterns = await analyticsService.getUserHabitPatterns(userId);
    const userPreferences = await this.getUserPreferences(userId);

    const emotionalState = {
      primaryEmotion: this.detectPrimaryEmotion(recentActivity),
      energyLevel: this.assessEnergyLevel(recentActivity, habitPatterns),
      motivationLevel: this.assessMotivationLevel(recentActivity, habitPatterns),
      stressLevel: this.assessStressLevel(recentActivity, habitPatterns),
      confidence: this.assessConfidence(recentActivity, habitPatterns),
      receptiveness: this.assessReceptiveness(recentActivity, userPreferences)
    };

    await this.updateEmotionalHistory(userId, emotionalState);
    return emotionalState;
  }

  async adjustMessageContent(content, context) {
    const adjustments = this.determineAdjustments(context.emotionalState, context.userProfile);
    
    return {
      ...content,
      text: this.applyToneAdjustments(content.text, adjustments),
      style: this.applyStyleAdjustments(content.style, adjustments),
      urgency: this.determineUrgency(context),
      supportResources: this.getSupportResources(context)
    };
  }

  determineAdjustments(emotionalState, userProfile) {
    const pattern = this.emotionPatterns[emotionalState.primaryEmotion];
    if (!pattern) return this.getDefaultAdjustments();

    return {
      tone: this.adaptToneToUser(pattern.messageAdjustments.tone, userProfile),
      focus: this.adaptFocusToState(pattern.messageAdjustments.focus, emotionalState),
      intensity: this.adaptIntensityToReceptiveness(
        pattern.messageAdjustments.intensity,
        emotionalState.receptiveness
      )
    };
  }

  adaptToneToUser(baseTone, userProfile) {
    const toneMappings = {
      supportive: {
        direct: 'clear and encouraging',
        gentle: 'softly supportive',
        balanced: 'moderately supportive'
      },
      enthusiastic: {
        direct: 'energetically direct',
        gentle: 'warmly encouraging',
        balanced: 'positively motivating'
      }
    };

    return toneMappings[baseTone]?.[userProfile.communicationStyle] || baseTone;
  }

  adaptFocusToState(baseFocus, emotionalState) {
    if (emotionalState.stressLevel > 0.7) {
      return 'immediate_small_wins';
    }
    if (emotionalState.confidence < 0.3) {
      return 'past_successes';
    }
    return baseFocus;
  }

  adaptIntensityToReceptiveness(baseIntensity, receptiveness) {
    const intensityLevels = {
      high: { high: 1.0, moderate: 0.7, low: 0.5 },
      moderate: { high: 0.7, moderate: 0.5, low: 0.3 },
      low: { high: 0.5, moderate: 0.3, low: 0.2 }
    };

    return intensityLevels[baseIntensity]?.[receptiveness] || 0.5;
  }

  applyToneAdjustments(text, adjustments) {
    // Apply tone modifiers based on adjustments
    let adjustedText = text;

    if (adjustments.tone === 'gentle') {
      adjustedText = this.softeners.reduce((text, softener) => 
        softener.apply(text), adjustedText
      );
    }

    if (adjustments.intensity === 'high') {
      adjustedText = this.intensifiers.reduce((text, intensifier) => 
        intensifier.apply(text), adjustedText
      );
    }

    return adjustedText;
  }

  applyStyleAdjustments(style, adjustments) {
    return {
      ...style,
      fontSize: this.adjustFontSize(style.fontSize, adjustments.intensity),
      color: this.adjustColor(style.color, adjustments.tone),
      animation: this.adjustAnimation(style.animation, adjustments)
    };
  }

  determineUrgency(context) {
    const { emotionalState, userProfile, currentContext } = context;
    
    // Calculate base urgency
    let urgency = 0;

    // Emotional state factors
    if (emotionalState.stressLevel > 0.7) urgency += 0.3;
    if (emotionalState.motivationLevel < 0.3) urgency += 0.2;

    // Context factors
    if (currentContext.missedStreak) urgency += 0.3;
    if (currentContext.nearDeadline) urgency += 0.2;

    // User preference adjustments
    if (userProfile.notificationPreference === 'minimal') {
      urgency *= 0.7;
    }

    return Math.min(urgency, 1);
  }

  getSupportResources(context) {
    const resources = [];
    const { emotionalState, userProfile } = context;

    if (emotionalState.stressLevel > 0.8) {
      resources.push({
        type: 'relaxation',
        title: 'Quick Breathing Exercise',
        duration: '2 minutes'
      });
    }

    if (emotionalState.motivationLevel < 0.3) {
      resources.push({
        type: 'inspiration',
        title: 'Success Stories',
        content: this.getRelevantSuccessStories(userProfile)
      });
    }

    if (emotionalState.confidence < 0.4) {
      resources.push({
        type: 'achievement_review',
        title: 'Your Past Wins',
        content: this.getPastAchievements(userProfile)
      });
    }

    return resources;
  }

  async updateEmotionalHistory(userId, emotionalState) {
    const history = await this.getEmotionalHistory(userId);
    
    history.push({
      timestamp: new Date().toISOString(),
      state: emotionalState
    });

    // Keep last 30 days of history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredHistory = history.filter(entry => 
      new Date(entry.timestamp) > thirtyDaysAgo
    );

    localStorage.setItem(`emotionalHistory_${userId}`, JSON.stringify(filteredHistory));
  }

  async getEmotionalHistory(userId) {
    return JSON.parse(localStorage.getItem(`emotionalHistory_${userId}`) || '[]');
  }

  async getUserPreferences(userId) {
    return JSON.parse(localStorage.getItem(`userPreferences_${userId}`) || '{}');
  }
}

export default EmotionalIntelligenceService;
