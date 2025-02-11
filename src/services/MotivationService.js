class MotivationService {
  constructor() {
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('motivationalSettings')) {
      localStorage.setItem('motivationalSettings', JSON.stringify({
        dailyMessages: true,
        celebrationPreferences: {
          milestones: true,
          streaks: true,
          achievements: true,
          sound: true,
          notifications: true
        },
        customQuotes: [],
        customMilestones: []
      }));
    }

    if (!localStorage.getItem('themeSettings')) {
      localStorage.setItem('themeSettings', JSON.stringify({
        theme: 'light',
        customColors: {
          primary: '#4a90e2',
          secondary: '#357abd',
          accent: '#ffd700',
          background: '#ffffff',
          text: '#2c3e50'
        },
        customFonts: {
          heading: 'Arial',
          body: 'Arial'
        },
        animations: true
      }));
    }
  }

  // Motivational Messages
  getDailyMessage() {
    const defaultMessages = [
      {
        text: "Every small step counts towards your bigger goals!",
        category: "encouragement"
      },
      {
        text: "You're building a better you, one habit at a time.",
        category: "motivation"
      },
      {
        text: "Remember why you started this journey.",
        category: "reflection"
      },
      {
        text: "Success is built on daily habits.",
        category: "wisdom"
      },
      {
        text: "Your future self will thank you for the habits you build today.",
        category: "future-focused"
      }
    ];

    const settings = this.getMotivationalSettings();
    const allMessages = [...defaultMessages, ...settings.customQuotes];
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % allMessages.length;
    
    return allMessages[index];
  }

  // Progress Celebrations
  celebrateProgress(achievement) {
    const settings = this.getMotivationalSettings();
    if (!settings.celebrationPreferences[achievement.type]) return null;

    const celebration = {
      type: achievement.type,
      message: this.getCelebrationMessage(achievement),
      timestamp: new Date().toISOString(),
      animation: settings.celebrationPreferences.animations ? this.getAnimation(achievement) : null,
      sound: settings.celebrationPreferences.sound ? this.getSound(achievement) : null
    };

    // Store celebration in history
    const history = JSON.parse(localStorage.getItem('celebrationHistory') || '[]');
    history.push(celebration);
    localStorage.setItem('celebrationHistory', JSON.stringify(history));

    return celebration;
  }

  getCelebrationMessage(achievement) {
    const messages = {
      streak: [
        "Amazing streak! You're on fire! 🔥",
        "Consistency is key, and you've mastered it! ⭐",
        "Unstoppable! Your streak is inspiring! 🚀"
      ],
      milestone: [
        "Congratulations on reaching this milestone! 🎉",
        "You've come so far! Keep going! 🌟",
        "This is just the beginning of your success! 🏆"
      ],
      achievement: [
        "Achievement unlocked! You're awesome! 🎯",
        "Your dedication has paid off! 🌈",
        "Level up! You're making incredible progress! ⚡"
      ]
    };

    const category = messages[achievement.type] || messages.achievement;
    return category[Math.floor(Math.random() * category.length)];
  }

  getAnimation(achievement) {
    // In a real app, these would be paths to animation files
    const animations = {
      streak: 'confetti',
      milestone: 'fireworks',
      achievement: 'sparkles'
    };
    return animations[achievement.type] || 'confetti';
  }

  getSound(achievement) {
    // In a real app, these would be paths to sound files
    const sounds = {
      streak: 'victory',
      milestone: 'celebration',
      achievement: 'success'
    };
    return sounds[achievement.type] || 'success';
  }

  // Custom Milestones
  addCustomMilestone(milestone) {
    const settings = this.getMotivationalSettings();
    settings.customMilestones.push({
      ...milestone,
      id: Date.now(),
      created: new Date().toISOString()
    });
    this.updateMotivationalSettings(settings);
    return settings.customMilestones;
  }

  // Settings Management
  getMotivationalSettings() {
    return JSON.parse(localStorage.getItem('motivationalSettings'));
  }

  updateMotivationalSettings(updates) {
    localStorage.setItem('motivationalSettings', JSON.stringify(updates));
    return updates;
  }

  getThemeSettings() {
    return JSON.parse(localStorage.getItem('themeSettings'));
  }

  updateThemeSettings(updates) {
    const settings = { ...this.getThemeSettings(), ...updates };
    localStorage.setItem('themeSettings', JSON.stringify(settings));
    
    // Apply theme changes
    document.documentElement.style.setProperty('--primary-color', settings.customColors.primary);
    document.documentElement.style.setProperty('--secondary-color', settings.customColors.secondary);
    document.documentElement.style.setProperty('--accent-color', settings.customColors.accent);
    document.documentElement.style.setProperty('--background-color', settings.customColors.background);
    document.documentElement.style.setProperty('--text-color', settings.customColors.text);
    document.documentElement.style.setProperty('--heading-font', settings.customFonts.heading);
    document.documentElement.style.setProperty('--body-font', settings.customFonts.body);
    
    return settings;
  }

  // Custom Quote Management
  addCustomQuote(quote) {
    const settings = this.getMotivationalSettings();
    settings.customQuotes.push({
      ...quote,
      id: Date.now(),
      created: new Date().toISOString()
    });
    this.updateMotivationalSettings(settings);
    return settings.customQuotes;
  }

  removeCustomQuote(quoteId) {
    const settings = this.getMotivationalSettings();
    settings.customQuotes = settings.customQuotes.filter(q => q.id !== quoteId);
    this.updateMotivationalSettings(settings);
    return settings.customQuotes;
  }
}

export const motivationService = new MotivationService();
