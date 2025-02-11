class SocialService {
  constructor() {
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('groups')) {
      localStorage.setItem('groups', JSON.stringify([]));
    }
    if (!localStorage.getItem('sharedHabits')) {
      localStorage.setItem('sharedHabits', JSON.stringify([]));
    }
    if (!localStorage.getItem('groupChallenges')) {
      localStorage.setItem('groupChallenges', JSON.stringify([]));
    }
  }

  // Group Management
  createGroup(group) {
    const groups = this.getGroups();
    const newGroup = {
      ...group,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      members: [group.creatorId],
      activeChallenge: null,
    };
    groups.push(newGroup);
    localStorage.setItem('groups', JSON.stringify(groups));
    return newGroup;
  }

  getGroups() {
    return JSON.parse(localStorage.getItem('groups'));
  }

  joinGroup(groupId, userId) {
    const groups = this.getGroups();
    const group = groups.find(g => g.id === groupId);
    if (group && !group.members.includes(userId)) {
      group.members.push(userId);
      localStorage.setItem('groups', JSON.stringify(groups));
      return group;
    }
    return null;
  }

  // Challenge Management
  createGroupChallenge(challenge) {
    const challenges = this.getGroupChallenges();
    const newChallenge = {
      ...challenge,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      participants: [],
      progress: {},
      status: 'active'
    };
    challenges.push(newChallenge);
    localStorage.setItem('groupChallenges', JSON.stringify(challenges));
    return newChallenge;
  }

  getGroupChallenges() {
    return JSON.parse(localStorage.getItem('groupChallenges'));
  }

  joinChallenge(challengeId, userId) {
    const challenges = this.getGroupChallenges();
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge && !challenge.participants.includes(userId)) {
      challenge.participants.push(userId);
      challenge.progress[userId] = 0;
      localStorage.setItem('groupChallenges', JSON.stringify(challenges));
      return challenge;
    }
    return null;
  }

  updateChallengeProgress(challengeId, userId, progress) {
    const challenges = this.getGroupChallenges();
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge && challenge.participants.includes(userId)) {
      challenge.progress[userId] = progress;
      localStorage.setItem('groupChallenges', JSON.stringify(challenges));
      return challenge;
    }
    return null;
  }

  // Habit Sharing
  shareHabit(habit, userId) {
    const sharedHabits = this.getSharedHabits();
    const sharedHabit = {
      ...habit,
      sharedBy: userId,
      sharedAt: new Date().toISOString(),
      likes: 0,
      comments: []
    };
    sharedHabits.push(sharedHabit);
    localStorage.setItem('sharedHabits', JSON.stringify(sharedHabits));
    return sharedHabit;
  }

  getSharedHabits() {
    return JSON.parse(localStorage.getItem('sharedHabits'));
  }

  likeSharedHabit(habitId, userId) {
    const sharedHabits = this.getSharedHabits();
    const habit = sharedHabits.find(h => h.id === habitId);
    if (habit) {
      if (!habit.likedBy) habit.likedBy = [];
      if (!habit.likedBy.includes(userId)) {
        habit.likedBy.push(userId);
        habit.likes++;
        localStorage.setItem('sharedHabits', JSON.stringify(sharedHabits));
      }
      return habit;
    }
    return null;
  }

  commentOnHabit(habitId, userId, comment) {
    const sharedHabits = this.getSharedHabits();
    const habit = sharedHabits.find(h => h.id === habitId);
    if (habit) {
      const newComment = {
        id: Date.now(),
        userId,
        text: comment,
        createdAt: new Date().toISOString()
      };
      habit.comments.push(newComment);
      localStorage.setItem('sharedHabits', JSON.stringify(sharedHabits));
      return newComment;
    }
    return null;
  }
}

export const socialService = new SocialService();
