class ReminderNotificationService {
  constructor() {
    this.serviceWorkerRegistration = null;
    this.setupNotifications();
  }

  async setupNotifications() {
    try {
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }

      // Register service worker for notifications
      if ('serviceWorker' in navigator) {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register(
          '/reminder-worker.js',
          { scope: '/' }
        );

        // Set up message handlers
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data.type === 'NOTIFICATION_CLICKED') {
            this.handleNotificationClick(event.data.reminderId);
          }
        });
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    } catch (error) {
      console.error('Notification setup failed:', error);
      throw error;
    }
  }

  async scheduleNotification(reminder) {
    if (!this.serviceWorkerRegistration) {
      throw new Error('Service worker not initialized');
    }

    try {
      const scheduledTime = new Date(reminder.time).getTime();

      // Register with service worker
      await this.serviceWorkerRegistration.active.postMessage({
        type: 'SCHEDULE_REMINDER',
        reminder: {
          ...reminder,
          scheduledTime
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  async showNotification(reminder) {
    if (!this.serviceWorkerRegistration) {
      return this.showFallbackNotification(reminder);
    }

    try {
      await this.serviceWorkerRegistration.showNotification(reminder.message, {
        body: reminder.message,
        icon: '/icon.png',
        badge: '/badge.png',
        tag: `reminder-${reminder.id}`,
        renotify: true,
        data: { reminder },
        actions: [
          {
            action: 'complete',
            title: 'Complete'
          },
          {
            action: 'snooze',
            title: 'Snooze'
          }
        ],
        requireInteraction: true
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
      return this.showFallbackNotification(reminder);
    }
  }

  showFallbackNotification(reminder) {
    const notification = new Notification(reminder.message, {
      body: reminder.message,
      icon: '/icon.png',
      tag: `reminder-${reminder.id}`
    });

    notification.onclick = () => {
      window.focus();
      this.handleNotificationClick(reminder.id);
    };
  }

  async handleNotificationClick(reminderId) {
    try {
      // Focus or open the app window
      if (window.focus) {
        window.focus();
      }

      // Fetch reminder details
      const reminders = JSON.parse(localStorage.getItem('habitReminders') || '[]');
      const reminder = reminders.find(r => r.id === reminderId);
      
      if (!reminder) return;

      // Highlight the relevant habit in the UI
      window.dispatchEvent(new CustomEvent('HIGHLIGHT_HABIT', {
        detail: { habitId: reminder.habitId }
      }));

    } catch (error) {
      console.error('Failed to handle notification click:', error);
    }
  }

  async cancelNotification(reminderId) {
    if (!this.serviceWorkerRegistration) return;

    try {
      const notifications = await this.serviceWorkerRegistration.getNotifications({
        tag: `reminder-${reminderId}`
      });

      notifications.forEach(notification => notification.close());

      // Inform service worker to cancel scheduled notification
      await this.serviceWorkerRegistration.active.postMessage({
        type: 'CANCEL_REMINDER',
        reminderId
      });
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }
}

// Change to named export
export { ReminderNotificationService };
