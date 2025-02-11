import { RealTimeService } from './RealTimeService';
import { securityService } from '../SecurityService';

class ChallengeService {
  constructor() {
    this.realTime = new RealTimeService();
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('challenges')) {
      localStorage.setItem('challenges', JSON.stringify({
        challenges: [],
        participants: {},
        milestones: {},
        rewards: {},
        metrics: {}
      }));
    }
  }

  async createChallenge(groupId, challenge) {
    const data = this.getData();
    const newChallenge = {
      ...challenge,
      id: Date.now(),
      groupId,
      createdAt: new Date().toISOString(),
      status: 'active',
      participants: [],
      milestones: this.generateMilestones(challenge),
      rewards: this.generateRewards(challenge),
      progress: {},
      metrics: {
        totalParticipants: 0,
        completionRate: 0,
        topPerformers: [],
        averageProgress: 0
      }
    };

    // Validate challenge data
    await this.validateChallenge(newChallenge);

    // Create challenge-specific encryption key for secure progress tracking
    const encryptionKey = await securityService.generateEncryptionKey();
    newChallenge.encryptionKey = encryptionKey.toString();

    data.challenges.push(newChallenge);
    data.metrics[newChallenge.id] = {
      lastUpdate: new Date().toISOString(),
      participantCount: 0,
      milestoneCompletions: {},
      engagementRate: 0
    };

    this.saveData(data);
    await this.realTime.notifyChallengeCreated(newChallenge);
    
    return newChallenge;
  }

  generateMilestones(challenge) {
    const milestones = [];
    const totalDays = Math.ceil((new Date(challenge.endDate) - new Date(challenge.startDate)) / (1000 * 60 * 60 * 24));
    
    // Beginner milestones
    milestones.push({
      id: `${challenge.id}_start`,
      name: 'Getting Started',
      description: 'Begin your challenge journey',
      requirement: { type: 'participation', value: 1 },
      reward: { type: 'points', value: 10 }
    });

    // Progress milestones
    const progressPoints = [25, 50, 75, 100];
    progressPoints.forEach(percentage => {
      milestones.push({
        id: `${challenge.id}_progress_${percentage}`,
        name: `${percentage}% Complete`,
        description: `Reach ${percentage}% completion`,
        requirement: { type: 'progress', value: percentage },
        reward: { type: 'points', value: percentage }
      });
    });

    // Streak milestones
    const streakDays = Math.min(Math.floor(totalDays / 4), 7);
    milestones.push({
      id: `${challenge.id}_streak`,
      name: `${streakDays}-Day Streak`,
      description: `Maintain a ${streakDays}-day streak`,
      requirement: { type: 'streak', value: streakDays },
      reward: { type: 'badge', value: 'Consistent Achiever' }
    });

    return milestones;
  }

  generateRewards(challenge) {
    return {
      completion: {
        type: 'achievement',
        name: `${challenge.name} Champion`,
        points: 100,
        badge: true
      },
      milestones: {
        type: 'points',
        value: 10,
        perMilestone: true
      },
      participation: {
        type: 'points',
        value: 5
      }
    };
  }

  async validateChallenge(challenge) {
    const errors = [];

    if (!challenge.name || challenge.name.length < 3) {
      errors.push('Challenge name must be at least 3 characters');
    }

    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);
    
    if (startDate >= endDate) {
      errors.push('End date must be after start date');
    }

    if (startDate < new Date()) {
      errors.push('Start date cannot be in the past');
    }

    const duration = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (duration < 1 || duration > 90) {
      errors.push('Challenge duration must be between 1 and 90 days');
    }

    if (errors.length > 0) {
      throw new Error(`Challenge validation failed: ${errors.join(', ')}`);
    }
  }

  async joinChallenge(challengeId, userId) {
    const data = this.getData();
    const challenge = data.challenges.find(c => c.id === challengeId);
    
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    if (challenge.participants.includes(userId)) {
      return challenge;
    }

    challenge.participants.push(userId);
    challenge.progress[userId] = {
      current: 0,
      streak: 0,
      lastUpdate: new Date().toISOString(),
      milestones: {}
    };

    challenge.metrics.totalParticipants++;
    data.metrics[challengeId].participantCount++;

    this.saveData(data);
    await this.realTime.notifyParticipantJoined(challengeId, userId);
    
    return challenge;
  }

  async updateProgress(challengeId, userId, progress) {
    const data = this.getData();
    const challenge = data.challenges.find(c => c.id === challengeId);
    
    if (!challenge || !challenge.participants.includes(userId)) {
      throw new Error('Not authorized to update progress');
    }

    const userProgress = challenge.progress[userId];
    userProgress.current = progress;
    userProgress.lastUpdate = new Date().toISOString();

    // Update streak
    const lastUpdate = new Date(userProgress.lastUpdate);
    const today = new Date();
    if (today.toDateString() !== lastUpdate.toDateString()) {
      if ((today - lastUpdate) / (1000 * 60 * 60 * 24) <= 1) {
        userProgress.streak++;
      } else {
        userProgress.streak = 1;
      }
    }

    // Check milestones
    challenge.milestones.forEach(milestone => {
      if (!userProgress.milestones[milestone.id] && 
          this.checkMilestoneCompletion(milestone, userProgress)) {
        userProgress.milestones[milestone.id] = new Date().toISOString();
        this.awardMilestoneReward(challengeId, userId, milestone);
      }
    });

    // Update challenge metrics
    this.updateChallengeMetrics(challenge);
    
    this.saveData(data);
    await this.realTime.notifyProgressUpdated(challengeId, userId, userProgress);
    
    return userProgress;
  }

  checkMilestoneCompletion(milestone, progress) {
    switch (milestone.requirement.type) {
      case 'participation':
        return true; // Just joining completes this
      case 'progress':
        return progress.current >= milestone.requirement.value;
      case 'streak':
        return progress.streak >= milestone.requirement.value;
      default:
        return false;
    }
  }

  async awardMilestoneReward(challengeId, userId, milestone) {
    // Implementation would depend on reward system
    await this.realTime.notifyMilestoneAchieved({
      challengeId,
      userId,
      milestone,
      timestamp: new Date().toISOString()
    });
  }

  updateChallengeMetrics(challenge) {
    const participants = Object.entries(challenge.progress);
    const totalProgress = participants.reduce((sum, [_, p]) => sum + p.current, 0);
    
    challenge.metrics.averageProgress = totalProgress / participants.length;
    challenge.metrics.completionRate = participants.filter(([_, p]) => p.current >= 100).length / participants.length * 100;
    
    challenge.metrics.topPerformers = participants
      .sort(([_, a], [_, b]) => b.current - a.current)
      .slice(0, 3)
      .map(([userId, progress]) => ({
        userId,
        progress: progress.current
      }));
  }

  getData() {
    return JSON.parse(localStorage.getItem('challenges'));
  }

  saveData(data) {
    localStorage.setItem('challenges', JSON.stringify(data));
  }
}

export const challengeService = new ChallengeService();
