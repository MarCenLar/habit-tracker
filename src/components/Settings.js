import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { habitService } from '../services/HabitService';
import { securityService } from '../services/SecurityService';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    darkMode: false,
    notificationsEnabled: false,
    reminderTime: '20:00',
    exportFormat: 'json',
    dataRetention: 90,
    dataEncryption: false,
    backupEnabled: false,
    autoCleanup: true
  });
  const [showSuccessMessage, setShowSuccessMessage] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      // Load appearance and notification settings
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      const savedNotifications = localStorage.getItem('notifications') === 'true';
      const savedReminderTime = localStorage.getItem('reminderTime') || '20:00';
      
      // Load security settings
      const securitySettings = await securityService.getSecuritySettings();
      
      setSettings({
        darkMode: savedDarkMode,
        notificationsEnabled: savedNotifications,
        reminderTime: savedReminderTime,
        exportFormat: 'json',
        ...securitySettings
      });

      // Apply dark mode if enabled
      if (savedDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Update appearance settings
    if (key === 'darkMode') {
      localStorage.setItem('darkMode', value);
      document.documentElement.setAttribute('data-theme', value ? 'dark' : 'light');
    }
    
    // Update notification settings
    else if (key === 'notificationsEnabled') {
      localStorage.setItem('notifications', value);
      if (value) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          scheduleNotifications();
        }
      }
    }
    
    // Update reminder time
    else if (key === 'reminderTime') {
      localStorage.setItem('reminderTime', value);
      if (settings.notificationsEnabled) {
        scheduleNotifications();
      }
    }
    
    // Update security settings
    else if (['dataRetention', 'dataEncryption', 'backupEnabled', 'autoCleanup'].includes(key)) {
      await securityService.updateSecuritySettings({ [key]: value });
      
      // Show success message
      setShowSuccessMessage('Settings updated successfully!');
      setTimeout(() => setShowSuccessMessage(''), 3000);
    }
  };

  const handleCleanupData = async () => {
    try {
      const result = await securityService.cleanupExpiredData();
      if (result.success) {
        setShowSuccessMessage(`Cleanup complete! ${result.cleanedSessions} items removed.`);
      } else {
        setShowSuccessMessage('Cleanup failed. Please try again.');
      }
      setTimeout(() => setShowSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  const scheduleNotifications = () => {
    if (!settings.notificationsEnabled) return;
    // Schedule daily notifications
    const [hours, minutes] = settings.reminderTime.split(':');
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      parseInt(hours),
      parseInt(minutes)
    );

    if (scheduledTime < now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime - now;
    setTimeout(() => {
      new Notification('Habit Tracker Reminder', {
        body: 'Time to check on your habits!',
        icon: '/favicon.ico'
      });
      scheduleNotifications(); // Schedule next day's notification
    }, timeUntilNotification);
  };

  const exportData = async () => {
    try {
      const habits = await habitService.getHabits();
      const achievements = await habitService.getAchievements();
      
      const data = {
        habits,
        achievements,
        timestamp: new Date().toISOString()
      };

      let exportData, fileName;
      
      // Encrypt data if enabled
      if (settings.dataEncryption) {
        data.encrypted = true;
        exportData = securityService.encryptData(data);
        fileName = 'habit-tracker-backup-encrypted.json';
      } else if (settings.exportFormat === 'json') {
        exportData = JSON.stringify(data, null, 2);
        fileName = 'habit-tracker-backup.json';
      } else {
        // CSV format
        const habits = data.habits;
        const headers = ['name', 'category', 'streak', 'createdAt'];
        const csvData = [
          headers.join(','),
          ...habits.map(habit => 
            headers.map(header => habit[header]).join(',')
          )
        ].join('\n');
        exportData = csvData;
        fileName = 'habit-tracker-backup.csv';
      }

      const blob = new Blob([exportData], {
        type: settings.exportFormat === 'json' ? 'application/json' : 'text/csv'
      });
      saveAs(blob, fileName);
      setShowSuccessMessage('Data exported successfully!');
      setTimeout(() => setShowSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setShowSuccessMessage('Error exporting data');
      setTimeout(() => setShowSuccessMessage(''), 3000);
    }
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.habits) {
          localStorage.setItem('habits', JSON.stringify(data.habits));
        }
        if (data.achievements) {
          localStorage.setItem('achievements', JSON.stringify(data.achievements));
        }
        window.location.reload();
    } catch (error) {
      setShowSuccessMessage('Error: Invalid backup file format');
      setTimeout(() => setShowSuccessMessage(''), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-container">
      <h2>Settings</h2>
      
      {showSuccessMessage && (
        <div className="success-message">
          {showSuccessMessage}
        </div>
      )}

      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="setting-item">
          <label>
            Dark Mode
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => updateSettings('darkMode', e.target.checked)}
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Notifications</h3>
        <div className="setting-item">
          <label>
            Enable Notifications
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(e) => updateSettings('notificationsEnabled', e.target.checked)}
            />
          </label>
        </div>
        {settings.notificationsEnabled && (
          <div className="setting-item">
            <label>
              Daily Reminder Time
              <input
                type="time"
              value={settings.reminderTime}
              onChange={(e) => updateSettings('reminderTime', e.target.value)}
              />
            </label>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Data Management</h3>
        <div className="setting-item">
          <label>
            Export Format
            <select 
              value={settings.exportFormat} 
              onChange={(e) => updateSettings('exportFormat', e.target.value)}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          <button onClick={exportData} className="export-button">
            Export Data
          </button>
        </div>
        <div className="setting-item">
          <label>
            Import Backup
            <input
              type="file"
              accept=".json"
              onChange={importData}
              className="import-input"
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Security & Privacy</h3>
        <div className="setting-item">
          <label>
            Data Encryption
            <input
              type="checkbox"
              checked={settings.dataEncryption}
              onChange={(e) => updateSettings('dataEncryption', e.target.checked)}
            />
          </label>
        </div>
        <div className="setting-item">
          <label>
            Auto Backup
            <input
              type="checkbox"
              checked={settings.backupEnabled}
              onChange={(e) => updateSettings('backupEnabled', e.target.checked)}
            />
          </label>
        </div>
        <div className="setting-item">
          <label>
            Auto Cleanup
            <input
              type="checkbox"
              checked={settings.autoCleanup}
              onChange={(e) => updateSettings('autoCleanup', e.target.checked)}
            />
          </label>
        </div>
        <div className="setting-item">
          <label>
            Data Retention (days)
            <input
              type="number"
              min="1"
              max="365"
              value={settings.dataRetention}
              onChange={(e) => updateSettings('dataRetention', parseInt(e.target.value))}
            />
          </label>
        </div>
        <button onClick={handleCleanupData} className="cleanup-button">
          Clean Up Old Data
        </button>
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <div className="about-content">
          <p>Habit Master</p>
          <p>Version 1.0.0</p>
          <p>A powerful habit tracking app to help you build better habits.</p>
          <div className="app-stats">
            <div className="stat-item">
              <span className="stat-value">5K+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">100K+</span>
              <span className="stat-label">Habits Tracked</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">1M+</span>
              <span className="stat-label">Goals Achieved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
