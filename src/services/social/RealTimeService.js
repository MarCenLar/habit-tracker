class RealTimeService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.messageQueue = [];
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.setupWebSocket();
  }

  setupWebSocket() {
    try {
      this.socket = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL);
      
      this.socket.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.processMessageQueue();
        this.emit('connection_status', { status: 'connected' });
      };

      this.socket.onclose = () => {
        this.connected = false;
        this.handleDisconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('connection_status', { 
          status: 'error', 
          error: error.message 
        });
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
    }
  }

  handleDisconnect() {
    this.emit('connection_status', { status: 'disconnected' });
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.setupWebSocket();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    } else {
      this.emit('connection_status', { 
        status: 'failed', 
        error: 'Max reconnection attempts reached' 
      });
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'group_created':
      case 'member_joined':
      case 'join_request':
      case 'group_message':
      case 'group_updated':
      case 'role_updated':
      case 'challenge_created':
      case 'challenge_updated':
        this.emit(message.type, message.payload);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  // Event handling
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  // Message sending with queue for offline support
  send(type, payload) {
    const message = { type, payload, timestamp: Date.now() };
    
    if (this.connected) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.connected) {
      const message = this.messageQueue.shift();
      this.socket.send(JSON.stringify(message));
    }
  }

  // Group-specific notifications
  async notifyGroupCreated(group) {
    this.send('group_created', {
      group: {
        id: group.id,
        name: group.name,
        creatorId: group.creatorId,
        createdAt: group.createdAt,
        memberCount: group.members.length
      }
    });
  }

  async notifyMemberJoined(group, userId) {
    this.send('member_joined', {
      groupId: group.id,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  async notifyJoinRequest(request) {
    this.send('join_request', request);
  }

  async sendGroupMessage(message) {
    this.send('group_message', {
      ...message,
      type: 'chat'
    });
  }

  async notifyGroupUpdated(group) {
    this.send('group_updated', {
      groupId: group.id,
      settings: group.settings,
      timestamp: new Date().toISOString()
    });
  }

  async notifyRoleUpdated(group, userId, newRole) {
    this.send('role_updated', {
      groupId: group.id,
      userId,
      role: newRole,
      timestamp: new Date().toISOString()
    });
  }

  async createChat(chatId, encryptionKey) {
    this.send('create_chat', {
      chatId,
      encryptionKey: encryptionKey.toString(),
      timestamp: new Date().toISOString()
    });
  }

  // Cleanup
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.connected = false;
      this.eventHandlers.clear();
    }
  }
}

export default RealTimeService;
