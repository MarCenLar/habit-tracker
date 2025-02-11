class RemindersService {
  constructor() {
    this.checkNotificationPermission();
    this.loadReminders();
    this.scheduleAllReminders();
  }

  async checkNotificationPermission() {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }

  loadReminders() {
    const savedReminders = localStorage.getItem('reminders');
    this.reminders = savedReminders ? JSON.parse(savedReminders) : {};
  }

  saveReminders() {
    localStorage.setItem('reminders', JSON.stringify(this.reminders));
  }

  setReminder(habitId, settings) {
    this.reminders[habitId] = {
      ...settings,
      lastNotified: null,
      enabled: true
    };
    this.saveReminders();
    this.scheduleReminder(habitId);
  }

  deleteReminder(habitId) {
    delete this.reminders[habitId];
    this.saveReminders();
  }

  scheduleAllReminders() {
    Object.keys(this.reminders).forEach(habitId => {
      this.scheduleReminder(habitId);
    });
  }

  scheduleReminder(habitId) {
    const reminder = this.reminders[habitId];
    if (!reminder || !reminder.enabled) return;

    const now = new Date();
    const [hours, minutes] = reminder.time.split(':');
    let scheduledTime = new Date();
    scheduledTime.setHours(parseInt(hours, 10));
    scheduledTime.setMinutes(parseInt(minutes, 10));
    scheduledTime.setSeconds(0);

    if (scheduledTime < now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilReminder = scheduledTime - now;
    setTimeout(() => {
      this.showNotification(habitId);
      this.scheduleReminder(habitId); // Schedule next reminder
    }, timeUntilReminder);
  }

  async showNotification(habitId) {
    const hasPermission = await this.checkNotificationPermission();
    if (!hasPermission) return;

    const habit = JSON.parse(localStorage.getItem('habits'))
      .find(h => h.id === habitId);

    if (!habit) return;

    const notification = new Notification("Habit Reminder", {
      body: `Time to ${habit.name}!`,
      icon: "/favicon.ico",
      tag: habitId,
      badge: "/favicon.ico",
      requireInteraction: true,
      actions: [
        {
          action: 'complete',
          title: 'Mark Complete'
        }
      ]
    });

    notification.addEventListener('click', () => {
      window.focus();
      notification.close();
    });

    notification.addEventListener('action', (event) => {
      if (event.action === 'complete') {
        const habits = JSON.parse(localStorage.getItem('habits'));
        const habitIndex = habits.findIndex(h => h.id === habitId);
        if (habitIndex !== -1) {
          const today = new Date().toISOString().split('T')[0];
          if (!habits[habitIndex].history) {
            habits[habitIndex].history = [];
          }
          habits[habitIndex].history.push({
            date: today,
            completed: true
          });
          localStorage.setItem('habits', JSON.stringify(habits));
        }
      }
    });


    // Update last notified time
    this.reminders[habitId].lastNotified = new Date().toISOString();
    this.saveReminders();
  }

  getReminder(habitId) {
    return this.reminders[habitId];
  }

  getReminderStats(habitId) {
    const reminder = this.reminders[habitId];
    if (!reminder) return null;

    const habit = JSON.parse(localStorage.getItem('habits'))
      .find(h => h.id === habitId);
    
    if (!habit) return null;

    // Calculate completion rate for the reminder time
    const completionsAtTime = habit.history?.filter(entry => {
      const entryDate = new Date(entry.date);
      const entryHour = entryDate.getHours();
      const [reminderHour] = reminder.time.split(':').map(Number);
      return entry.completed && Math.abs(entryHour - reminderHour) <= 1;
    }).length || 0;

    const totalReminders = habit.history?.length || 1;
    const successRate = (completionsAtTime / totalReminders) * 100;

    return {
      successRate,
      lastNotified: reminder.lastNotified,
      nextReminder: this.getNextReminderTime(reminder.time)
    };
  }

  getNextReminderTime(time) {
    const [hours, minutes] = time.split(':');
    let nextReminder = new Date();
    nextReminder.setHours(parseInt(hours, 10));
    nextReminder.setMinutes(parseInt(minutes, 10));
    nextReminder.setSeconds(0);

    if (nextReminder < new Date()) {
      nextReminder.setDate(nextReminder.getDate() + 1);
    }

    return nextReminder;
  }

  suggestReminderTime(habitId) {
    const habit = JSON.parse(localStorage.getItem('habits'))
      .find(h => h.id === habitId);
    
    if (!habit || !habit.history) return '09:00';

    // Analyze completion times to find the most successful time
    const completionTimes = habit.history
      .filter(entry => entry.completed)
      .map(entry => new Date(entry.date).getHours());

    if (completionTimes.length === 0) return '09:00';

    // Find the most frequent completion hour
    const frequencyMap = completionTimes.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const bestHour = Object.entries(frequencyMap)
      .sort(([,a], [,b]) => b - a)[0][0];

    return `${bestHour.toString().padStart(2, '0')}:00`;
  }
}

export const remindersService = new RemindersService();
