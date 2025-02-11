class MotivationContentService {
  constructor() {
    this.templates = {
      encouragement: [
        {
          template: "You're making great progress with {habit}! Keep up the momentum!",
          tone: "enthusiastic",
          context: "progress"
        },
        {
          template: "Small steps lead to big changes. Your dedication to {habit} is inspiring!",
          tone: "supportive",
          context: "consistency"
        },
        {
          template: "Remember why you started {habit}. Every effort counts!",
          tone: "reflective",
          context: "challenge"
        }
      ],
      celebration: [
        {
          template: "Incredible achievement! {days} days of consistent {habit}!",
          tone: "excited",
          context: "milestone"
        },
        {
          template: "You've reached a new level with {habit}! {achievement} unlocked!",
          tone: "celebratory",
          context: "achievement"
        }
      ],
      challenge: [
        {
          template: "Ready to take {habit} to the next level? Let's aim for {target}!",
          tone: "energetic",
          context: "progression"
        },
        {
          template: "You're so close to your {habit} goal! Just {remaining} to go!",
          tone: "motivational",
          context: "near_goal"
        }
      ],
      recovery: [
        {
          template: "Everyone has off days. Tomorrow is a fresh start for {habit}!",
          tone: "nurturing",
          context: "setback"
        },
        {
          template: "Your {habit} streak may have paused, but your progress hasn't!",
          tone: "supportive",
          context: "missed_day"
        }
      ]
    };

    this.contextualModifiers = {
      morning: {
        energy: "high",
        focus: "planning",
        tone: "energetic"
      },
      afternoon: {
        energy: "moderate",
        focus: "progress",
        tone: "supportive"
      },
      evening: {
        energy: "reflective",
        focus: "accomplishment",
        tone: "calming"
      }
    };

    this.emotionalModifiers = {
      stressed: {
        tone: "calming",
        complexity: "simple",
        intensity: "gentle"
      },
      motivated: {
        tone: "energetic",
        complexity: "detailed",
        intensity: "high"
      },
      tired: {
        tone: "supportive",
        complexity: "minimal",
        intensity: "low"
      },
      proud: {
        tone: "celebratory",
        complexity: "elaborate",
        intensity: "high"
      }
    };
  }

  async getPersonalizedContent(params) {
    const {
      userProfile,
      currentContext,
      emotionalState
    } = params;

    const baseTemplate = await this.selectBaseTemplate(params);
    const modifiedTemplate = this.applyContextualModifiers(baseTemplate, currentContext);
    const personalizedContent = await this.generatePersonalizedContent(modifiedTemplate, {
      userProfile,
      currentContext,
      emotionalState
    });

    return this.formatContent(personalizedContent);
  }

  async selectBaseTemplate(params) {
    const { messageType, context, emotionalState } = params;
    const relevantTemplates = this.templates[messageType] || [];
    
    return this.findBestTemplate(relevantTemplates, {
      context,
      emotionalState
    });
  }

  findBestTemplate(templates, context) {
    return templates.reduce((best, template) => {
      const score = this.calculateTemplateScore(template, context);
      return score > best.score ? { template, score } : best;
    }, { score: -1 }).template;
  }

  calculateTemplateScore(template, context) {
    let score = 0;

    // Context matching
    if (template.context === context.type) {
      score += 0.4;
    }

    // Tone appropriateness
    if (this.isToneAppropriate(template.tone, context.emotionalState)) {
      score += 0.3;
    }

    // Time of day alignment
    if (this.isTimingAppropriate(template, context.timeOfDay)) {
      score += 0.2;
    }

    // Variety (avoid recent templates)
    if (!context.recentTemplates?.includes(template.id)) {
      score += 0.1;
    }

    return score;
  }

  isToneAppropriate(tone, emotionalState) {
    const appropriateTones = {
      stressed: ['calming', 'supportive', 'gentle'],
      motivated: ['energetic', 'challenging', 'enthusiastic'],
      tired: ['gentle', 'supportive', 'nurturing'],
      proud: ['celebratory', 'enthusiastic', 'encouraging']
    };

    return appropriateTones[emotionalState]?.includes(tone) || false;
  }

  isTimingAppropriate(template, timeOfDay) {
    const timingPreferences = {
      morning: ['energetic', 'motivational', 'planning'],
      afternoon: ['supportive', 'progress', 'encouraging'],
      evening: ['reflective', 'calming', 'celebratory']
    };

    return timingPreferences[timeOfDay]?.includes(template.tone) || false;
  }

  applyContextualModifiers(template, context) {
    const timeContext = this.contextualModifiers[context.timeOfDay];
    const emotionalContext = this.emotionalModifiers[context.emotionalState];
    
    return {
      ...template,
      tone: this.blendTones(template.tone, timeContext.tone, emotionalContext.tone),
      energy: this.calculateEnergyLevel(timeContext.energy, emotionalContext.intensity),
      complexity: this.determineComplexity(emotionalContext.complexity, context)
    };
  }

  blendTones(...tones) {
    // Prioritize emotional state tone while considering other factors
    const validTones = tones.filter(Boolean);
    return validTones[0] || 'neutral';
  }

  calculateEnergyLevel(timeEnergy, emotionalIntensity) {
    const energyLevels = {
      high: 1,
      moderate: 0.6,
      low: 0.3
    };

    const baseEnergy = energyLevels[timeEnergy] || 0.6;
    const intensityMultiplier = energyLevels[emotionalIntensity] || 1;

    return Math.min(baseEnergy * intensityMultiplier, 1);
  }

  determineComplexity(baseComplexity, context) {
    // Adjust complexity based on user state and preferences
    if (context.cognitiveLoad === 'high' || context.timeOfDay === 'evening') {
      return 'minimal';
    }
    return baseComplexity || 'moderate';
  }

  async generatePersonalizedContent(template, context) {
    const content = {
      text: await this.personalizeText(template, context),
      style: this.getContentStyle(template, context),
      metadata: {
        type: template.type,
        tone: template.tone,
        context: template.context,
        timestamp: new Date().toISOString()
      }
    };

    if (template.type === 'challenge' || template.type === 'milestone') {
      content.actionable = this.generateActionableContent(template, context);
    }

    return content;
  }

  async personalizeText(template, context) {
    let text = template.template;

    // Replace dynamic variables
    text = text.replace(/{habit}/g, context.userProfile.activeHabit?.name || 'habit');
    text = text.replace(/{days}/g, context.currentContext.streakDays || '0');
    text = text.replace(/{target}/g, this.calculateNextTarget(context));
    text = text.replace(/{achievement}/g, context.currentContext.recentAchievement?.name || 'Achievement');

    // Apply tone modifiers
    text = this.applyToneModifiers(text, template.tone);

    return text;
  }

  getContentStyle(template, context) {
    return {
      fontSize: this.calculateFontSize(template, context),
      color: this.getThemeColor(template.tone),
      emphasis: this.calculateEmphasis(template, context),
      animation: this.selectAnimation(template, context)
    };
  }

  calculateFontSize(template, context) {
    const baseSize = 16;
    const emphasisMultiplier = template.type === 'celebration' ? 1.25 : 1;
    const complexityMultiplier = context.template.complexity === 'minimal' ? 0.9 : 1;
    
    return Math.round(baseSize * emphasisMultiplier * complexityMultiplier);
  }

  getThemeColor(tone) {
    const colors = {
      energetic: '#FF5733',
      supportive: '#33FF57',
      celebratory: '#5733FF',
      calming: '#33C3FF'
    };
    
    return colors[tone] || '#000000';
  }

  calculateEmphasis(template, context) {
    if (context.emotionalState.intensity === 'high' && template.type === 'celebration') {
      return 'strong';
    }
    return 'normal';
  }

  selectAnimation(template, context) {
    if (!context.userProfile.preferences.animations) {
      return null;
    }

    const animations = {
      celebration: 'confetti',
      milestone: 'sparkle',
      challenge: 'bounce',
      encouragement: 'pulse'
    };

    return animations[template.type];
  }

  generateActionableContent(template, context) {
    return {
      action: template.type === 'challenge' ? 'accept_challenge' : 'view_details',
      data: {
        type: template.type,
        id: `${template.type}_${Date.now()}`,
        context: context.currentContext
      }
    };
  }

  formatContent(content) {
    return {
      ...content,
      format: 'html', // or 'markdown' based on client needs
      version: '1.0',
      generated: new Date().toISOString()
    };
  }
}

export default MotivationContentService;
