class QuestProgressionService {
  constructor() {
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('questProgression')) {
      localStorage.setItem('questProgression', JSON.stringify({
        userProgress: {},
        storylineProgress: {},
        chainProgress: {},
        milestones: {}
      }));
    }
  }

  getUserProgress(userId) {
    const data = this.getData();
    if (!data.userProgress[userId]) {
      data.userProgress[userId] = {
        completedQuests: [],
        activeQuests: [],
        questPoints: 0,
        achievements: [],
        milestones: {},
        stats: {
          totalCompleted: 0,
          currentStreak: 0,
          longestStreak: 0,
          averageCompletion: 0,
          categoryProgress: {}
        }
      };
      this.saveData(data);
    }
    return data.userProgress[userId];
  }

  async initializeQuestTracking(quest) {
    const data = this.getData();
    
    // Initialize milestone tracking
    if (quest.milestones) {
      data.milestones[quest.id] = quest.milestones.map(milestone => ({
        ...milestone,
        completed: false,
        progress: 0,
        updatedAt: new Date().toISOString()
      }));
    }

    // Initialize storyline tracking
    if (quest.storyline) {
      if (!data.storylineProgress[quest.storyline]) {
        data.storylineProgress[quest.storyline] = {
          currentChapter: 1,
          completedChapters: [],
          questsCompleted: [],
          startedAt: new Date().toISOString()
        };
      }
    }

    // Initialize chain tracking
    if (quest.chain) {
      if (!data.chainProgress[quest.chain]) {
        data.chainProgress[quest.chain] = {
          position: 0,
          completedQuests: [],
          bonusProgress: 0,
          startedAt: new Date().toISOString()
        };
      }
    }

    this.saveData(data);
  }

  async getNextStorylineQuest(storylineId, userId) {
    const data = this.getData();
    const storyline = data.storylineProgress[storylineId];
    
    if (!storyline || storyline.completed) return null;

    // Get storyline quest data (would come from QuestGeneratorService in production)
    const storylineQuests = this.getStorylineQuests(storylineId);
    const nextQuest = storylineQuests.find(q => 
      !storyline.questsCompleted.includes(q.id) &&
      q.chapter === storyline.currentChapter
    );

    if (!nextQuest) {
      // Check if can advance to next chapter
      const allChapterQuestsCompleted = storylineQuests
        .filter(q => q.chapter === storyline.currentChapter)
        .every(q => storyline.questsCompleted.includes(q.id));

      if (allChapterQuestsCompleted) {
        return this.advanceStorylineChapter(storylineId, userId);
      }
    }

    return nextQuest;
  }

  getStorylineQuests(storylineId) {
    // Placeholder - In production, this would fetch from a quest database
    return [
      {
        id: `${storylineId}_1_1`,
        chapter: 1,
        title: 'Beginning the Journey',
        description: 'Start your first quest in this storyline',
        difficulty: 1
      },
      {
        id: `${storylineId}_1_2`,
        chapter: 1,
        title: 'Building Momentum',
        description: 'Complete three consecutive days',
        difficulty: 2
      }
      // ... more quests
    ];
  }

  async advanceStorylineChapter(storylineId, userId) {
    const data = this.getData();
    const storyline = data.storylineProgress[storylineId];
    
    storyline.completedChapters.push(storyline.currentChapter);
    storyline.currentChapter++;
    
    const storylineQuests = this.getStorylineQuests(storylineId);
    const nextChapterQuests = storylineQuests.filter(q => 
      q.chapter === storyline.currentChapter
    );

    if (nextChapterQuests.length === 0) {
      storyline.completed = true;
      await this.awardStorylineCompletion(storylineId, userId);
    }

    this.saveData(data);
    return nextChapterQuests[0];
  }

  async getNextChainQuest(chainId, userId) {
    const data = this.getData();
    const chain = data.chainProgress[chainId];
    
    if (!chain || chain.completed) return null;

    const chainQuests = this.getChainQuests(chainId);
    const nextQuest = chainQuests[chain.position];

    if (!nextQuest) {
      chain.completed = true;
      await this.awardChainCompletion(chainId, userId);
      return null;
    }

    return nextQuest;
  }

  getChainQuests(chainId) {
    // Placeholder - In production, this would fetch from a quest database
    return [
      {
        id: `${chainId}_1`,
        position: 0,
        title: 'First Link',
        description: 'Begin your quest chain',
        difficulty: 1
      },
      {
        id: `${chainId}_2`,
        position: 1,
        title: 'Growing Stronger',
        description: 'Build upon your success',
        difficulty: 2
      }
      // ... more chain quests
    ];
  }

  async checkMilestones(quest, oldProgress) {
    const data = this.getData();
    const questMilestones = data.milestones[quest.id] || [];
    const achievedMilestones = [];

    for (const milestone of questMilestones) {
      if (!milestone.completed && this.isMilestoneAchieved(milestone, quest.progress, oldProgress)) {
        milestone.completed = true;
        milestone.completedAt = new Date().toISOString();
        achievedMilestones.push(milestone);
      }
    }

    this.saveData(data);
    return achievedMilestones;
  }

  isMilestoneAchieved(milestone, currentProgress, oldProgress) {
    if (milestone.type === 'progress') {
      return currentProgress >= milestone.requirement &&
             oldProgress < milestone.requirement;
    }
    if (milestone.type === 'time') {
      const now = new Date();
      const questStart = new Date(milestone.startTime);
      return (now - questStart) <= milestone.requirement;
    }
    return false;
  }

  async awardStorylineCompletion(storylineId, userId) {
    const data = this.getData();
    const userProgress = this.getUserProgress(userId);
    
    userProgress.achievements.push({
      type: 'storyline_completion',
      storylineId,
      completedAt: new Date().toISOString()
    });

    // Add bonus points based on speed and performance
    const storyline = data.storylineProgress[storylineId];
    const completionTime = new Date() - new Date(storyline.startedAt);
    const efficiency = storyline.questsCompleted.length / completionTime;
    const bonusPoints = Math.round(efficiency * 1000);
    
    userProgress.questPoints += bonusPoints;
    
    this.saveData(data);
    return bonusPoints;
  }

  async awardChainCompletion(chainId, userId) {
    const data = this.getData();
    const userProgress = this.getUserProgress(userId);
    
    userProgress.achievements.push({
      type: 'chain_completion',
      chainId,
      completedAt: new Date().toISOString()
    });

    const chain = data.chainProgress[chainId];
    const streakBonus = chain.completedQuests.length * 10;
    userProgress.questPoints += streakBonus;
    
    this.saveData(data);
    return streakBonus;
  }

  checkChainRequirements(chain, userProgress) {
    if (chain.prerequisites) {
      return chain.prerequisites.every(prereq => {
        if (prereq.type === 'quest') {
          return userProgress.completedQuests.includes(prereq.questId);
        }
        if (prereq.type === 'achievement') {
          return userProgress.achievements.some(a => a.type === prereq.achievementId);
        }
        if (prereq.type === 'level') {
          return userProgress.questPoints >= prereq.level * 1000;
        }
        return false;
      });
    }
    return true;
  }

  getData() {
    return JSON.parse(localStorage.getItem('questProgression'));
  }

  saveData(data) {
    localStorage.setItem('questProgression', JSON.stringify(data));
  }
}

export { QuestProgressionService };
