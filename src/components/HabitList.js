import React, { useState, useEffect } from 'react';
import { habitService } from '../services/HabitService';
import ReminderSettings from './ReminderSettings';
import './HabitList.css';

const HabitList = () => {
  const [habits, setHabits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [showReminders, setShowReminders] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [allHabits, categoryData] = await Promise.all([
          habitService.getHabits(),
          habitService.getCategories()
        ]);
        setHabits(allHabits);
        setCategories(categoryData);
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [lastUpdate]); // Only reload when lastUpdate changes

  const loadHabits = () => {
    setLastUpdate(new Date()); // Trigger reload through useEffect
  };

  const filteredHabits = selectedCategory === 'all'
    ? habits
    : habits.filter(habit => habit.category === selectedCategory);

  const handleProgressUpdate = async (habitId, completed) => {
    try {
      const updatedHabit = await habitService.trackProgress(habitId, new Date(), completed);
      if (updatedHabit) {
        // Update habit in state without reloading all habits
        setHabits(currentHabits => 
          currentHabits.map(habit => 
            habit.id === habitId ? updatedHabit : habit
          )
        );
      }
    } catch (err) {
      setError('Failed to update habit progress');
    }
  };

  const handleDeleteHabit = async (habitId) => {
    try {
      await habitService.deleteHabit(habitId);
      setShowConfirmDelete(null);
      // Remove habit from state without reloading
      setHabits(currentHabits => currentHabits.filter(h => h.id !== habitId));
    } catch (err) {
      setError('Failed to delete habit');
    }
  };

  const getHabitMetrics = (habit) => {
    if (!habit.templateId) return null;

    const template = categories
      .flatMap(cat => cat.suggestions)
      .find(sug => sug.id === habit.templateId);

    if (!template) return null;

    return {
      goals: template.goals,
      metrics: template.metrics
    };
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : '#ddd';
  };

  const handleKeyPress = (event, handler) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler();
    }
  };

  if (isLoading) {
    return (
      <div className="habit-list loading">
        <div className="loading-spinner">Loading habits...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="habit-list error">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadHabits}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="habit-list" role="main" aria-label="Habit List">
      <div className="category-filter" role="tablist" aria-label="Filter habits by category">
        <button
          role="tab"
          aria-selected={selectedCategory === 'all'}
          className={`category-button ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
          onKeyPress={(e) => handleKeyPress(e, () => setSelectedCategory('all'))}
        >
          All Habits
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
            onKeyPress={(e) => handleKeyPress(e, () => setSelectedCategory(category.id))}
            role="tab"
            aria-selected={selectedCategory === category.id}
          >
            <span className="category-icon">{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      <div className="habits-grid">
        {filteredHabits.map(habit => {
          const metrics = getHabitMetrics(habit);
          const today = new Date().toISOString().split('T')[0];
          const isCompletedToday = habit.history?.some(
            entry => entry.date === today && entry.completed
          );
          const categoryColor = getCategoryColor(habit.category);

          return (
            <div 
              key={habit.id} 
              className={`habit-card ${isCompletedToday ? 'completed' : ''}`}
              role="article"
              aria-label={`${habit.name} habit card`}
              style={{ 
                '--category-color': categoryColor,
                background: `linear-gradient(to right, ${categoryColor}20, var(--glass-background))`,
                borderLeft: `4px solid ${categoryColor}`
              }}
            >
              <div className="habit-header">
                <h3>{habit.name}</h3>
                <div className="habit-actions">
                  <button
                    className="reminder-button"
                    onClick={() => setShowReminders(habit)}
                    onKeyPress={(e) => handleKeyPress(e, () => setShowReminders(habit))}
                    title="Set Reminder"
                    aria-label={`Set reminder for ${habit.name}`}
                  >
                    ⏰
                  </button>
                  {showConfirmDelete === habit.id ? (
                    <div className="delete-confirm">
                      <span>Delete habit?</span>
                      <button 
                        onClick={() => handleDeleteHabit(habit.id)}
                        className="confirm-yes"
                        aria-label={`Confirm delete ${habit.name}`}
                      >
                        Yes
                      </button>
                      <button 
                        onClick={() => setShowConfirmDelete(null)}
                        className="confirm-no"
                        aria-label="Cancel delete"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="delete-button"
                      onClick={() => setShowConfirmDelete(habit.id)}
                      aria-label={`Delete ${habit.name}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <p className="habit-description">
                {habit.description || 'No description provided'}
              </p>

              <div className="habit-info">
                <div className="habit-metrics">
                  {metrics && (
                    <div className="metric-goals">
                      <span>Goal: </span>
                      {typeof metrics.goals === 'object' ? (
                        <span>{metrics.goals.intermediate}</span>
                      ) : (
                        <span>{metrics.goals.target} {metrics.goals.unit}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="habit-streak">
                  <span className="streak-badge">
                    🔥 {habit.streak} day streak
                  </span>
                </div>
              </div>

              <div className="habit-completion">
                <button
                  className={`complete-button ${isCompletedToday ? 'completed' : ''}`}
                  onClick={() => handleProgressUpdate(habit.id, !isCompletedToday)}
                  onKeyPress={(e) => handleKeyPress(e, () => handleProgressUpdate(habit.id, !isCompletedToday))}
                  aria-label={`Mark ${habit.name} as ${isCompletedToday ? 'incomplete' : 'complete'}`}
                >
                  {isCompletedToday ? (
                    <>✓ Completed Today</>
                  ) : (
                    <>Mark as Complete</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredHabits.length === 0 && (
        <div className="no-habits">
          <p>No habits found. Create a new habit to get started!</p>
        </div>
      )}

      {showReminders && (
        <div className="modal-overlay">
          <div className="modal-content reminder-modal">
            <button 
              className="close-modal" 
              onClick={() => setShowReminders(null)}
              aria-label="Close reminder settings"
            >
              ×
            </button>
            <ReminderSettings
              habit={showReminders}
              onClose={() => setShowReminders(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitList;
