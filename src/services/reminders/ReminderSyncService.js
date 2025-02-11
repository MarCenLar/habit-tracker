class ReminderSyncService {
  constructor() {
    this.syncInProgress = false;
    this.pendingChanges = [];
    this.syncInterval = null;
    this.setupSyncInterval();
    this.setupConnectionMonitoring();
  }

  setupSyncInterval() {
    // Get sync interval from settings (default 5 minutes)
    const settings = this.getSettings();
    const interval = settings.syncInterval || 5 * 60 * 1000;
    
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncWithServer();
      }
    }, interval);
  }

  setupConnectionMonitoring() {
    window.addEventListener('online', () => {
      this.handleConnectionChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleConnectionChange(false);
    });
  }

  async handleConnectionChange(isOnline) {
    if (isOnline && this.pendingChanges.length > 0) {
      await this.syncPendingChanges();
    }
  }

  getSettings() {
    return JSON.parse(localStorage.getItem('reminderSettings') || '{}');
  }

  updateSettings(updates) {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem('reminderSettings', JSON.stringify(updated));
    return updated;
  }

  async syncWithServer(reminder = null) {
    if (this.syncInProgress) {
      if (reminder) {
        this.pendingChanges.push(reminder);
      }
      return;
    }

    this.syncInProgress = true;
    const settings = this.getSettings();

    try {
      const payload = {
        deviceId: settings.deviceId,
        lastSync: settings.lastSync,
        reminders: reminder ? [reminder] : this.getAllReminders()
      };

      const response = await fetch('/api/sync/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const { reminders, timestamp } = await response.json();
      
      // Merge remote changes
      await this.mergeReminders(reminders);
      
      // Update last sync time
      this.updateSettings({
        lastSync: timestamp
      });

      // Process any changes that came in during sync
      if (this.pendingChanges.length > 0) {
        await this.syncPendingChanges();
      }

    } catch (error) {
      console.error('Sync failed:', error);
      if (reminder) {
        this.pendingChanges.push(reminder);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncPendingChanges() {
    const changes = [...this.pendingChanges];
    this.pendingChanges = [];
    
    for (const reminder of changes) {
      await this.syncWithServer(reminder);
    }
  }

  getAllReminders() {
    return JSON.parse(localStorage.getItem('habitReminders') || '[]');
  }

  async mergeReminders(remoteReminders) {
    const localReminders = this.getAllReminders();
    const merged = [...localReminders];
    const settings = this.getSettings();
    
    for (const remote of remoteReminders) {
      const localIndex = merged.findIndex(local => local.id === remote.id);
      
      if (localIndex === -1) {
        // New remote reminder
        merged.push(remote);
        this.notifyChange('added', remote);
      } else {
        const local = merged[localIndex];
        
        // Only update if remote is newer
        if (new Date(remote.lastModified) > new Date(local.lastModified)) {
          merged[localIndex] = remote;
          this.notifyChange('updated', remote);
        }
        
        // If reminder was created by this device, update server's copy
        if (local.deviceId === settings.deviceId && 
            new Date(local.lastModified) > new Date(remote.lastModified)) {
          this.pendingChanges.push(local);
        }
      }
    }
    
    // Find deleted reminders
    const remoteIds = new Set(remoteReminders.map(r => r.id));
    const deletedLocally = localReminders
      .filter(local => !remoteIds.has(local.id) && local.deleted);
    
    // Re-add locally deleted reminders to pending changes to ensure deletion syncs
    this.pendingChanges.push(...deletedLocally);
    
    // Save merged reminders
    localStorage.setItem('habitReminders', JSON.stringify(merged));
    
    return merged;
  }

  notifyChange(type, reminder) {
    window.dispatchEvent(new CustomEvent('REMINDER_SYNC', {
      detail: { type, reminder }
    }));
  }

  async markForDeletion(reminderId) {
    const reminders = this.getAllReminders();
    const reminderIndex = reminders.findIndex(r => r.id === reminderId);
    
    if (reminderIndex !== -1) {
      reminders[reminderIndex] = {
        ...reminders[reminderIndex],
        deleted: true,
        lastModified: new Date().toISOString()
      };
      
      localStorage.setItem('habitReminders', JSON.stringify(reminders));
      
      // Add to pending changes to ensure deletion syncs
      this.pendingChanges.push(reminders[reminderIndex]);
      
      if (navigator.onLine) {
        await this.syncWithServer();
      }
    }
  }
}

// Change to named export
export { ReminderSyncService };
