import React, { useState, useEffect } from 'react';
import './Achievements.css';
import { progressionService } from '../../services/ProgressionService';
import { habitService } from '../../services/HabitService';

function Achievements() {
  const [achievements, setAchievements] = useState({
    completed: [],
    available: []
  });
  const [progress, setProgress] = useState({
    level: 1,
    experience: 0,
    nextLevelThreshold: 1000
  });

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      // Get all habits data for achievement checking
      const habits = await habitService.getHabits();
      const habitData = {
        totalHabits: habits.length,
        totalCompletions: habits.reduce((acc, habit) => acc + (habit.completions || 0), 0),
        categories: habits.map(habit => habit.category),
        morningCompletions: habits.reduce((acc, habit) => 
          acc + (habit.completions?.filter(c => 
            new Date(c.timestamp).getHours() < 9
          ).length || 0), 0),
        perfectWeeks: calculatePerfectWeeks(habits)
      };

      // Check for new achievements
      await progressionService.checkAchievements(habitData);

      // Update achievements lists
      const completed = progressionService.getCompletedAchievements();
      const available = progressionService.getAvailableAchievements();
      
      setAchievements({
        completed,
        available
      });

      // Update progress
      const currentProgress = progressionService.getProgress();
      setProgress({
        level: currentProgress.level,
        experience: currentProgress.experience,
        nextLevelThreshold: currentProgress.nextLevelThreshold
      });
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const calculatePerfectWeeks = (habits) => {
    const weeklyCompletions = habits.reduce((acc, habit) => {
      const completions = habit.completions || [];
      completions.forEach(completion => {
        const week = getWeekNumber(new Date(completion.timestamp));
        if (!acc[week]) {
          acc[week] = { total: 0, completed: 0 };
        }
        acc[week].total++;
        if (completion.completed) {
          acc[week].completed++;
        }
      });
      return acc;
    }, {});

    return Object.values(weeklyCompletions)
      .filter(week => week.total > 0 && week.completed === week.total)
      .length;
  };

  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNumber}`;
  };

  const calculateProgress = (requirement, habitData) => {
    switch (requirement.type) {
      case 'habit_count':
        return Math.min(100, (habitData.totalHabits / requirement.count) * 100);
      case 'completion_count':
        return Math.min(100, (habitData.totalCompletions / requirement.count) * 100);
      case 'category_count':
        return Math.min(100, (new Set(habitData.categories).size / requirement.count) * 100);
      case 'morning_completions':
        return Math.min(100, (habitData.morningCompletions / requirement.count) * 100);
      case 'perfect_week':
        return Math.min(100, (habitData.perfectWeeks / requirement.count) * 100);
      default:
        return 0;
    }
  };

  return (
    <div className="achievements-container">
      <div className="achievements-header">
        <h2>Achievements</h2>
        <div className="level-info">
          <span className="level">Level {progress.level}</span>
          <div className="experience-bar">
            <div 
              className="experience-fill" 
              style={{ width: `${(progress.experience / progress.nextLevelThreshold) * 100}%` }}
            ></div>
            <span className="experience-text">
              {progress.experience} / {progress.nextLevelThreshold} XP
            </span>
          </div>
        </div>
      </div>

      <div className="achievements-section">
        <h3>Completed ({achievements.completed.length})</h3>
        <div className="achievements-grid">
          {achievements.completed.map(achievement => (
            <div key={achievement.id} className="achievement-card completed">
              <div className="achievement-icon">{achievement.icon}</div>
              <div className="achievement-info">
                <h4>{achievement.name}</h4>
                <p>{achievement.description}</p>
              </div>
              <div className="achievement-status">
                <span className="completion-date">Completed!</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="achievements-section">
        <h3>Available ({achievements.available.length})</h3>
        <div className="achievements-grid">
          {achievements.available.map(achievement => (
            <div key={achievement.id} className="achievement-card">
              <div className="achievement-icon">{achievement.icon}</div>
              <div className="achievement-info">
                <h4>{achievement.name}</h4>
                <p>{achievement.description}</p>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${calculateProgress(
                      achievement.requirement,
                      {
                        totalHabits: achievements.total,
                        totalCompletions: achievements.completions,
                        categories: achievements.categories || [],
                        morningCompletions: achievements.morningCompletions || 0,
                        perfectWeeks: achievements.perfectWeeks || 0
                      }
                    )}%` 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Achievements;
