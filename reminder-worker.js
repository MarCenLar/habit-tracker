const CACHE_NAME = 'habit-reminder-cache-v1';
const scheduledReminders = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/icon.png',
        '/badge.png'
      ]);
    })
  );
});

self.addEventListener('message', (event) => {
  switch (event.data.type) {
    case 'SCHEDULE_REMINDER':
      scheduleReminder(event.data.reminder);
      break;
    case 'CANCEL_REMINDER':
      cancelReminder(event.data.reminderId);
      break;
  }
});

function scheduleReminder(reminder) {
  const now = Date.now();
  const scheduledTime = new Date(reminder.time).getTime();
  let delay = scheduledTime - now;

  // If time has passed, schedule for next occurrence based on frequency
  if (delay < 0) {
    switch (reminder.frequency) {
      case 'daily':
        delay += 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        delay += 7 * 24 * 60 * 60 * 1000;
        break;
      case 'weekdays':
        delay += calculateNextWeekday() * 24 * 60 * 60 * 1000;
        break;
      default:
        return; // Don't schedule if invalid frequency
    }
  }

  // Clear any existing timer for this reminder
  cancelReminder(reminder.id);

  // Schedule new reminder
  const timerId = setTimeout(() => {
    showNotification(reminder).then(() => {
      // Schedule next occurrence if recurring
      if (['daily', 'weekly', 'weekdays'].includes(reminder.frequency)) {
        scheduleReminder(reminder);
      }
    });
  }, delay);

  scheduledReminders.set(reminder.id, timerId);
}

function cancelReminder(reminderId) {
  const timerId = scheduledReminders.get(reminderId);
  if (timerId) {
    clearTimeout(timerId);
    scheduledReminders.delete(reminderId);
  }
}

function calculateNextWeekday() {
  const today = new Date().getDay();
  // If it's Friday (5), add 3 days; if it's Saturday (6), add 2 days
  if (today === 5) return 3;
  if (today === 6) return 2;
  return 1;
}

async function showNotification(reminder) {
  const registration = await self.registration;

  await registration.showNotification(reminder.message, {
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
}

self.addEventListener('notificationclick', (event) => {
  const reminder = event.notification.data.reminder;

  event.notification.close();

  if (event.action === 'complete') {
    handleComplete(reminder);
  } else if (event.action === 'snooze') {
    handleSnooze(reminder);
  } else {
    // Default click - open/focus window
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          clients.openWindow('/');
        }
      })
    );
  }

  // Notify main app of click
  notifyApp('NOTIFICATION_CLICKED', { reminderId: reminder.id });
});

function handleComplete(reminder) {
  // Cancel any future occurrences
  cancelReminder(reminder.id);
  
  // Notify main app
  notifyApp('REMINDER_COMPLETED', { reminderId: reminder.id });
}

function handleSnooze(reminder) {
  // Schedule reminder for 15 minutes later
  const snoozedReminder = {
    ...reminder,
    time: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    type: 'snooze'
  };
  
  scheduleReminder(snoozedReminder);
  notifyApp('REMINDER_SNOOZED', { reminderId: reminder.id });
}

async function notifyApp(type, data) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type,
      ...data
    });
  });
}
