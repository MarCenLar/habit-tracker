class QuestService {
  constructor() {
    this.initializeData();
  }

  initializeData() {
    const savedData = localStorage.getItem('questData');
    if (savedData) {
      const data = JSON.parse(savedData);
      this.completedQuests = data.completedQuests || [];
      this.activeQuests = data.activeQuests || [];
    } else {
      this.completedQuests = [];
      this.activeQuests = [];
      this.saveData();
    }
  }

  saveData() {
    const data = {
      completedQuests: this.completedQuests,
      activeQuests: this.activeQuests
    };
    localStorage.setItem('questData', JSON.stringify(data));
  }

  getAllQuests() {
    return [
      {
        id: 'quest_consistency',
        name: 'Consistency Champion',
        description: 'Complete all habits for 3 days straight',
        reward: { type: 'experience', amount: 500 },
        requirement: { type: 'streak', days: 3 }
      },
      {
        id: 'quest_variety',
        name: 'Variety Seeker',
        description: 'Complete habits from 3 different categories in one day',
        reward: { type: 'experience', amount: 300 },
        requirement: { type: 'categories', count: 3 }
      },
      {
        id: 'quest_early_bird',
        name: 'Early Bird',
        description: 'Complete 3 habits before 9 AM',
        reward: { type: 'achievement', id: 'early_riser' },
        requirement: { type: 'morning_completions', count: 3 }
      },
      {
        id: 'quest_perfect_week',
        name: 'Perfect Week',
        description: 'Complete all habits every day for a week',
        reward: { type: 'special_reward', id: 'golden_streak' },
        requirement: { type: 'perfect_week', count: 1 }
      }
    ];
  }

  getAvailableQuests() {
    return this.getAllQuests().filter(quest => 
      !this.completedQuests.includes(quest.id) && 
      !this.activeQuests.some(active => active.id === quest.id)
    );
  }

  getActiveQuests() {
    return this.activeQuests;
  }

  getCompletedQuests() {
    return this.getAllQuests().filter(quest => 
      this.completedQuests.includes(quest.id)
    );
  }

  acceptQuest(questId) {
    const quest = this.getAllQuests().find(q => q.id === questId);
    if (!quest) throw new Error(`Quest not found: ${questId}`);
    if (this.completedQuests.includes(questId)) {
      throw new Error('Quest already completed');
    }
    if (this.activeQuests.some(q => q.id === questId)) {
      throw new Error('Quest already active');
    }

    const activeQuest = {
      ...quest,
      startedAt: new Date().toISOString(),
      progress: 0
    };

    this.activeQuests.push(activeQuest);
    this.saveData();
    return activeQuest;
  }

  updateQuestProgress(questId, progress) {
    const questIndex = this.activeQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) throw new Error(`Active quest not found: ${questId}`);

    const quest = this.activeQuests[questIndex];
    quest.progress = Math.min(100, progress);

    if (quest.progress >= 100) {
      this.completeQuest(questId);
    } else {
      this.activeQuests[questIndex] = quest;
      this.saveData();
    }

    return quest;
  }

  completeQuest(questId) {
    const questIndex = this.activeQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) throw new Error(`Active quest not found: ${questId}`);

    const quest = this.activeQuests[questIndex];
    this.activeQuests.splice(questIndex, 1);
    this.completedQuests.push(questId);
    
    this.saveData();
    return quest;
  }

  abandonQuest(questId) {
    const questIndex = this.activeQuests.findIndex(q => q.id === questId);
    if (questIndex === -1) throw new Error(`Active quest not found: ${questId}`);

    this.activeQuests.splice(questIndex, 1);
    this.saveData();
  }

  checkQuestCompletion(habitData) {
    return this.activeQuests.map(quest => {
      let progress = 0;

      switch (quest.requirement.type) {
        case 'streak':
          progress = (habitData.currentStreak / quest.requirement.days) * 100;
          break;
        case 'categories':
          progress = (habitData.uniqueCategories / quest.requirement.count) * 100;
          break;
        case 'morning_completions':
          progress = (habitData.morningCompletions / quest.requirement.count) * 100;
          break;
        case 'perfect_week':
          progress = (habitData.perfectWeekProgress / 7) * 100;
          break;
      }

      return this.updateQuestProgress(quest.id, progress);
    });
  }
}

const questService = new QuestService();
export { questService };
export default QuestService;
