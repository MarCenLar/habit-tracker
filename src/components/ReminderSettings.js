import React, { useState, useEffect } from 'react';
import './ReminderSettings.css';
import { reminderService } from '../services/ReminderService';

function ReminderSettings() {
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({
    time: '09:00',
    days: [],
    enabled: true,
    message: '',
    title: 'Habit Reminder'
  });

  useEffect(() => {
    initializeReminders();
  }, []);

  const initializeReminders = async () => {
    try {
      const savedReminders = reminderService.getReminders();
      setReminders(savedReminders || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([]);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    try {
      const reminder = await reminderService.addReminder(Date.now().toString(), {
        ...newReminder,
        message: newReminder.message || 'Time to check your habits!'
      });

      setReminders(prevReminders => [...prevReminders, reminder]);
      setNewReminder({
        time: '09:00',
        days: [],
        enabled: true,
        message: '',
        title: 'Habit Reminder'
      });
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  };

  const handleUpdateReminder = async (reminderId, updates) => {
    try {
      const updatedReminder = await reminderService.updateReminder(reminderId, updates);
      setReminders(prevReminders => 
        prevReminders.map(r => r.id === reminderId ? updatedReminder : r)
      );
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      await reminderService.deleteReminder(reminderId);
      setReminders(prevReminders => prevReminders.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const handleDayToggle = (day) => {
    const days = newReminder.days.includes(day)
      ? newReminder.days.filter(d => d !== day)
      : [...newReminder.days, day];
    setNewReminder({ ...newReminder, days });
  };

  const getDayName = (day) => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
  };

  const formatDays = (days) => {
    if (!days || days.length === 0) return 'No days selected';
    return days.map(day => getDayName(day)).join(', ');
  };

  return (
    <div className="reminder-settings">
      <h2>Reminder Settings</h2>

      <div className="add-reminder-form">
        <h3>Add New Reminder</h3>
        <form onSubmit={handleAddReminder}>
          <div className="form-group">
            <label>Time:</label>
            <input
              type="time"
              value={newReminder.time}
              onChange={e => setNewReminder({ ...newReminder, time: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Days:</label>
            <div className="days-selector">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`day-button ${newReminder.days.includes(day) ? 'selected' : ''}`}
                  onClick={() => handleDayToggle(day)}
                >
                  {getDayName(day)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Message:</label>
            <input
              type="text"
              value={newReminder.message}
              onChange={e => setNewReminder({ ...newReminder, message: e.target.value })}
              placeholder="Time to check your habits!"
            />
          </div>

          <button type="submit" className="add-button">Add Reminder</button>
        </form>
      </div>

      <div className="reminders-list">
        <h3>Your Reminders</h3>
        {reminders.length === 0 ? (
          <p className="no-reminders">No reminders set</p>
        ) : (
          reminders.map(reminder => (
            <div key={reminder.id} className="reminder-item">
              <div className="reminder-info">
                <div className="reminder-time">{reminder.time}</div>
                <div className="reminder-days">{formatDays(reminder.days)}</div>
                <div className="reminder-message">{reminder.message}</div>
              </div>
              <div className="reminder-controls">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={reminder.enabled}
                    onChange={e => handleUpdateReminder(reminder.id, {
                      enabled: e.target.checked
                    })}
                  />
                  <span className="slider"></span>
                </label>
                <button
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ReminderSettings;
