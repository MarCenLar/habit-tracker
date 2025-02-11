class ReminderService {
  constructor() {
    this.reminders = this.loadReminders();
    this.feedback = this.loadFeedback();
    this.activeReminders = new Map();
    this.notificationPermission = false;
    this.syncInProgress = false;
    this.initializePermissions();
  }

  async initializePermissions() {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission === "granted";
    }
  }

  loadReminders() {
    try {
      const savedReminders = localStorage.getItem('habitReminders');
      return savedReminders ? JSON.parse(savedReminders) : [];
    } catch (error) {
      console.error('Error loading reminders:', error);
      return [];
    }
  }

  loadFeedback() {
    try {
      const savedFeedback = localStorage.getItem('reminderFeedback');
      return savedFeedback ? JSON.parse(savedFeedback) : [];
    } catch (error) {
      console.error('Error loading feedback:', error);
      return [];
    }
  }

  saveReminders() {
    try {
      localStorage.setItem('habitReminders', JSON.stringify(this.reminders));
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  }

  saveFeedback() {
    try {
      localStorage.setItem('reminderFeedback', JSON.stringify(this.feedback));
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  }

  getReminders() {
    return this.reminders;
  }

  getUserFeedback() {
    return this.feedback;
  }

  async addUserFeedback(feedback) {
    const feedbackEntry = {
      id: `feedback_${Date.now()}`,
      ...feedback,
      timestamp: new Date().toISOString()
    };

    this.feedback.push(feedbackEntry);
    this.saveFeedback();
    return feedbackEntry;
  }

  async addReminder(habitId, config) {
    const reminder = {
      id: `reminder_${Date.now()}`,
      habitId,
      ...config,
      enabled: true,
      createdAt: new Date().toISOString()
    };

    this.reminders.push(reminder);
    this.saveReminders();

    if (reminder.enabled) {
      await this.scheduleReminder(reminder);
    }

    return reminder;
  }

  async updateReminder(reminderId, updates) {
    const index = this.reminders.findIndex(r => r.id === reminderId);
    if (index === -1) {
      throw new Error(`Reminder not found: ${reminderId}`);
    }

    const oldReminder = this.reminders[index];
    const updatedReminder = {
      ...oldReminder,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.reminders[index] = updatedReminder;
    this.saveReminders();

    if (oldReminder.enabled && !updatedReminder.enabled) {
      await this.unscheduleReminder(reminderId);
    } else if (!oldReminder.enabled && updatedReminder.enabled) {
      await this.scheduleReminder(updatedReminder);
    } else if (updatedReminder.enabled && 
      (oldReminder.time !== updatedReminder.time || 
       oldReminder.days !== updatedReminder.days)) {
      await this.unscheduleReminder(reminderId);
      await this.scheduleReminder(updatedReminder);
    }

    return updatedReminder;
  }

  async deleteReminder(reminderId) {
    const index = this.reminders.findIndex(r => r.id === reminderId);
    if (index === -1) {
      throw new Error(`Reminder not found: ${reminderId}`);
    }

    await this.unscheduleReminder(reminderId);
    this.reminders.splice(index, 1);
    this.saveReminders();
  }

  async scheduleReminder(reminder) {
    if (!this.notificationPermission) {
      const granted = await this.requestNotificationPermission();
      if (!granted) {
        throw new Error('Notification permission denied');
      }
    }

    if (this.activeReminders.has(reminder.id)) {
      this.unscheduleReminder(reminder.id);
    }

    const timer = this.createReminderTimer(reminder);
    this.activeReminders.set(reminder.id, timer);
  }

  unscheduleReminder(reminderId) {
    const timer = this.activeReminders.get(reminderId);
    if (timer) {
      clearTimeout(timer);
      this.activeReminders.delete(reminderId);
    }
  }

  createReminderTimer(reminder) {
    const now = new Date();
    const [hours, minutes] = reminder.time.split(':').map(Number);
    let nextReminder = new Date(now);
    nextReminder.setHours(hours, minutes, 0, 0);

    if (nextReminder <= now) {
      nextReminder.setDate(nextReminder.getDate() + 1);
    }

    if (reminder.days && reminder.days.length > 0) {
      while (!reminder.days.includes(nextReminder.getDay())) {
        nextReminder.setDate(nextReminder.getDate() + 1);
      }
    }

    const delay = nextReminder - now;
    return setTimeout(() => this.triggerReminder(reminder), delay);
  }

  async triggerReminder(reminder) {
    try {
      if (!("Notification" in window)) return;

      const notification = new Notification(reminder.title || 'Habit Reminder', {
        body: reminder.message || 'Time to check your habit!',
        icon: '/favicon.ico'
      });

      notification.onclick = () => {
        window.focus();
      };

      this.rescheduleReminder(reminder);

    } catch (error) {
      console.error('Error triggering reminder:', error);
    }
  }

  rescheduleReminder(reminder) {
    const timer = this.createReminderTimer(reminder);
    this.activeReminders.set(reminder.id, timer);
  }

  async requestNotificationPermission() {
    if (!("Notification" in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission === "granted";
      return this.notificationPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }
}

const reminderService = new ReminderService();
export { reminderService };
export default ReminderService;
