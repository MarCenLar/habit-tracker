import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';
import { habitService } from '../services/HabitService';
import './Analytics.css';

export const Analytics = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('week');
  const habits = habitService.getHabits();
  const categories = habitService.getCategories();

  // Calculate stats for each category
  const categoryStats = categories.map(category => {
    const categoryHabits = habits.filter(h => h.category === category.id);
    const completedCount = categoryHabits.filter(h => h.streak > 0).length;
    const totalCount = categoryHabits.length;
    
    return {
      name: category.name,
      completionRate: totalCount ? (completedCount / totalCount) * 100 : 0,
      totalHabits: totalCount,
      color: category.color
    };
  });

  // Calculate streak data and sort by streak length
  const streakData = habits
    .map(habit => ({
      name: habit.name,
      streak: habit.streak,
      category: categories.find(c => c.id === habit.category)?.name || 'Unknown',
      categoryColor: categories.find(c => c.id === habit.category)?.color || '#ddd'
    }))
    .sort((a, b) => b.streak - a.streak);

  // Generate trend data based on selected time range
  const getTrendData = () => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      const completedCount = habits.filter(habit => 
        habit.history?.some(entry => entry.date === dateStr && entry.completed)
      ).length;

      return {
        date: date.toLocaleDateString('en-US', { 
          weekday: days <= 7 ? 'short' : undefined,
          month: 'short',
          day: 'numeric'
        }),
        completed: completedCount,
        total: habits.length,
        rate: habits.length ? (completedCount / habits.length) * 100 : 0
      };
    });
  };

  const getOverviewStats = () => {
    const totalCompletions = habits.reduce((sum, habit) => 
      sum + (habit.history?.filter(h => h.completed)?.length || 0), 0
    );
    
    const avgStreak = habits.reduce((sum, habit) => sum + habit.streak, 0) / habits.length || 0;
    
    const bestCategory = categoryStats.reduce((a, b) => 
      a.completionRate > b.completionRate ? a : b
    );

    return {
      totalHabits: habits.length,
      totalCompletions,
      avgStreak: avgStreak.toFixed(1),
      bestCategory: bestCategory.name,
      bestCategoryRate: bestCategory.completionRate.toFixed(1)
    };
  };

  const renderOverview = () => {
    const stats = getOverviewStats();
    const trendData = getTrendData();
    
    return (
      <div className="overview-section">
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <div className="stat-content">
              <h4>Total Habits</h4>
              <p>{stats.totalHabits}</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-content">
              <h4>Total Completions</h4>
              <p>{stats.totalCompletions}</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔥</span>
            <div className="stat-content">
              <h4>Average Streak</h4>
              <p>{stats.avgStreak} days</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🏆</span>
            <div className="stat-content">
              <h4>Best Category</h4>
              <p>{stats.bestCategory}</p>
              <small>{stats.bestCategoryRate}% completion</small>
            </div>
          </div>
        </div>

        <div className="chart-row">
          <div className="chart-container trend-chart">
            <h3>Completion Trend</h3>
            <div className="time-range-filters">
              <button 
                className={timeRange === 'week' ? 'active' : ''} 
                onClick={() => setTimeRange('week')}
              >
                Week
              </button>
              <button 
                className={timeRange === 'month' ? 'active' : ''} 
                onClick={() => setTimeRange('month')}
              >
                Month
              </button>
              <button 
                className={timeRange === 'year' ? 'active' : ''} 
                onClick={() => setTimeRange('year')}
              >
                Year
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  name="Completion Rate (%)" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Category Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryStats}
                  dataKey="totalHabits"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  label
                  paddingAngle={5}
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderCategories = () => (
    <div className="categories-section">
      <div className="chart-row">
        <div className="chart-container">
          <h3>Category Performance</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoryStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="completionRate" 
                name="Success Rate (%)" 
              >
                {categoryStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="category-details">
        {categoryStats.map(category => (
          <div 
            key={category.name} 
            className="category-card"
            style={{ borderColor: category.color }}
          >
            <h4>{category.name}</h4>
            <div className="category-stats">
              <div className="stat">
                <span>Habits</span>
                <strong>{category.totalHabits}</strong>
              </div>
              <div className="stat">
                <span>Success Rate</span>
                <strong>{category.completionRate.toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStreaks = () => (
    <div className="streaks-section">
      <div className="chart-row">
        <div className="chart-container">
          <h3>Current Streaks</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={streakData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="streak" 
                name="Days" 
              >
                {streakData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.categoryColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="streak-details">
        <div className="top-streaks">
          <h3>Top Streaks</h3>
          {streakData.slice(0, 5).map((habit, index) => (
            <div key={habit.name} className="streak-card">
              <div className="rank">#{index + 1}</div>
              <div className="streak-info">
                <h4>{habit.name}</h4>
                <span className="category-tag">{habit.category}</span>
              </div>
              <div className="streak-value">
                <span>🔥</span>
                <strong>{habit.streak}</strong>
                <span>days</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>Analytics & Insights</h2>
        <div className="analytics-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            Categories
          </button>
          <button 
            className={`tab ${activeTab === 'streaks' ? 'active' : ''}`}
            onClick={() => setActiveTab('streaks')}
          >
            Streaks
          </button>
        </div>
      </div>

      <div className="analytics-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'categories' && renderCategories()}
        {activeTab === 'streaks' && renderStreaks()}
      </div>
    </div>
  );
};

export default Analytics;
