// src/services/reminders/ReminderService.js
import { ReminderNotificationService } from './ReminderNotificationService';
import { ReminderSyncService } from './ReminderSyncService';
import { ReminderAnalyticsService } from './ReminderAnalyticsService';
import { integrationService } from '../IntegrationService';

class ReminderService {
  constructor() {
    this.notification = new ReminderNotificationService();
    this.sync = new ReminderSyncService();
    this.analytics = new ReminderAnalyticsService();
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem('reminderSettings')) {
      localStorage.setItem('reminderSettings', JSON.stringify({
        enabled: true,
        smartReminders: true,
        locationBasedReminders: false,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        },
        channels: {
          push: true,
          email: false,
          browser: true,
          calendar: false
        },
        customPatterns: [],
        deviceId: crypto.randomUUID(),
        lastSync: null,
        syncInterval: 5 * 60 * 1000 // 5 minutes
      }));
    }

    if (!localStorage.getItem('habitReminders')) {
      localStorage.setItem('habitReminders', JSON.stringify([]));
    }

    if (!localStorage.getItem('reminderHistory')) {
      localStorage.setItem('reminderHistory', JSON.stringify([]));
    }
  }

  async scheduleReminder(habit) {
    const settings = this.getReminderSettings();
    if (!settings.enabled) return null;

    const reminder = {
      id: Date.now(),
      habitId: habit.id,
      type: 'standard',
      time: habit.reminderTime,
      frequency: habit.frequency,
      message: `Time to ${habit.title}!`,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      deviceId: settings.deviceId
    };

    // Add to reminders list
    const reminders = this.getHabitReminders();
    reminders.push(reminder);
    localStorage.setItem('habitReminders', JSON.stringify(reminders));

    // Register with notification service
    await this.notification.scheduleNotification(reminder);

    // If calendar integration is enabled, sync reminder
    if (settings.channels.calendar) {
      await integrationService.syncWithCalendar(habit);
    }

    // Trigger sync with other devices
    await this.sync.syncWithServer(reminder);

    return reminder;
  }

  async handleReminderTrigger(reminder) {
    const settings = this.getReminderSettings();
    
    // Check quiet hours
    if (settings.quietHours.enabled && this.isInQuietHours()) {
      return;
    }

    // Show notification
    await this.notification.showNotification(reminder);

    // Record reminder delivery
    this.recordReminderDelivery(reminder);
  }

  isInQuietHours() {
    const settings = this.getReminderSettings();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const [startHour, startMinutes] = settings.quietHours.start.split(':').map(Number);
    const [endHour, endMinutes] = settings.quietHours.end.split(':').map(Number);
    
    const currentTime = currentHour * 60 + currentMinutes;
    const startTime = startHour * 60 + startMinutes;
    const endTime = endHour * 60 + endMinutes;
    
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    return currentTime >= startTime && currentTime <= endTime;
  }

  recordReminderDelivery(reminder) {
    const history = JSON.parse(localStorage.getItem('reminderHistory')) || [];
    history.push({
      reminderId: reminder.id,
      habitId: reminder.habitId,
      timestamp: new Date().toISOString(),
      type: reminder.type
    });
    localStorage.setItem('reminderHistory', JSON.stringify(history));
  }

  // Settings Management
  getReminderSettings() {
    return JSON.parse(localStorage.getItem('reminderSettings'));
  }

  updateReminderSettings(updates) {
    const current = this.getReminderSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem('reminderSettings', JSON.stringify(updated));
    return updated;
  }

  getHabitReminders() {
    return JSON.parse(localStorage.getItem('habitReminders'));
  }

  updateReminderTime(habitId, newTime) {
    const reminders = this.getHabitReminders();
    const reminderIndex = reminders.findIndex(r => r.habitId === habitId);
    
    if (reminderIndex !== -1) {
      reminders[reminderIndex].time = newTime;
      localStorage.setItem('habitReminders', JSON.stringify(reminders));
      return reminders[reminderIndex];
    }
    
    return null;
  }
}

export const reminderService = new ReminderService();
