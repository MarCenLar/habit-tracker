import { securityService } from '../SecurityService';
import { RealTimeService } from './RealTimeService';

class GroupService {
  constructor() {
    this.realTime = new RealTimeService();
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('groups')) {
      localStorage.setItem('groups', JSON.stringify({
        groups: [],
        invites: [],
        chatHistory: {},
        metrics: {}
      }));
    }
  }

  async createGroup(group) {
    const data = this.getData();
    const newGroup = {
      ...group,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      members: [group.creatorId],
      activeChallenge: null,
      settings: {
        privacy: 'private',
        joinRequests: true,
        contentSharing: 'members',
        notifications: true
      },
      roles: {
        [group.creatorId]: 'admin'
      },
      metrics: {
        totalCompletions: 0,
        activeMembers: 1,
        avgEngagement: 0,
        topHabits: []
      }
    };

    // Create encrypted group chat
    const chatKey = await securityService.generateEncryptionKey();
    newGroup.chatId = `group_${newGroup.id}`;
    this.realTime.createChat(newGroup.chatId, chatKey);

    data.groups.push(newGroup);
    data.chatHistory[newGroup.id] = [];
    data.metrics[newGroup.id] = {
      lastActivity: new Date().toISOString(),
      messageCount: 0,
      habitShares: 0,
      challengeParticipation: 0
    };

    this.saveData(data);
    await this.realTime.notifyGroupCreated(newGroup);
    
    return newGroup;
  }

  async joinGroup(groupId, userId, inviteCode = null) {
    const data = this.getData();
    const group = data.groups.find(g => g.id === groupId);
    
    if (!group) return null;

    // Verify invite code or join request permission
    if (group.settings.privacy === 'private' && 
        !inviteCode && 
        !data.invites.some(i => i.groupId === groupId && i.userId === userId)) {
      if (!group.settings.joinRequests) {
        throw new Error('Group requires invitation to join');
      }
      await this.requestToJoin(groupId, userId);
      return null;
    }

    if (!group.members.includes(userId)) {
      group.members.push(userId);
      group.roles[userId] = 'member';
      group.metrics.activeMembers++;

      // Remove from invites if joined through invite
      data.invites = data.invites.filter(i => 
        i.groupId !== groupId || i.userId !== userId
      );

      this.saveData(data);
      await this.realTime.notifyMemberJoined(group, userId);
    }

    return group;
  }

  async requestToJoin(groupId, userId) {
    const request = {
      id: Date.now(),
      groupId,
      userId,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    await this.realTime.notifyJoinRequest(request);
    return request;
  }

  async sendMessage(groupId, userId, message) {
    const data = this.getData();
    const group = data.groups.find(g => g.id === groupId);
    
    if (!group || !group.members.includes(userId)) {
      throw new Error('Not authorized to send message');
    }

    const chatMessage = {
      id: Date.now(),
      groupId,
      userId,
      text: message,
      timestamp: new Date().toISOString(),
      reactions: {}
    };

    data.chatHistory[groupId].push(chatMessage);
    data.metrics[groupId].messageCount++;
    data.metrics[groupId].lastActivity = chatMessage.timestamp;

    this.saveData(data);
    await this.realTime.sendGroupMessage(chatMessage);
    
    return chatMessage;
  }

  async updateGroupSettings(groupId, userId, updates) {
    const data = this.getData();
    const group = data.groups.find(g => g.id === groupId);
    
    if (!group || group.roles[userId] !== 'admin') {
      throw new Error('Not authorized to update settings');
    }

    group.settings = {
      ...group.settings,
      ...updates
    };

    this.saveData(data);
    await this.realTime.notifyGroupUpdated(group);
    
    return group;
  }

  async updateMemberRole(groupId, adminId, memberId, newRole) {
    const data = this.getData();
    const group = data.groups.find(g => g.id === groupId);
    
    if (!group || group.roles[adminId] !== 'admin') {
      throw new Error('Not authorized to update roles');
    }

    if (!group.members.includes(memberId)) {
      throw new Error('User is not a member of this group');
    }

    group.roles[memberId] = newRole;
    this.saveData(data);
    await this.realTime.notifyRoleUpdated(group, memberId, newRole);
    
    return group;
  }

  getGroupMetrics(groupId) {
    const data = this.getData();
    return data.metrics[groupId] || null;
  }

  getData() {
    return JSON.parse(localStorage.getItem('groups'));
  }

  saveData(data) {
    localStorage.setItem('groups', JSON.stringify(data));
  }
}

export const groupService = new GroupService();
