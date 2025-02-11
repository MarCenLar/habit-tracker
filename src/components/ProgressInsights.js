import React, { useState, useMemo, Suspense, lazy } from 'react';
import './ProgressInsights.css';
import { format, subDays, eachDayOfInterval, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { habitService } from '../services/HabitService';
import ChartErrorBoundary from './charts/ChartErrorBoundary';
import ChartLoading from './charts/ChartLoading';

// Lazy load chart components
const CompletionTrendChart = lazy(() => import('./charts/CompletionTrendChart'));
const CategoryPerformanceChart = lazy(() => import('./charts/CategoryPerformanceChart'));
const WeeklyPatternChart = lazy(() => import('./charts/WeeklyPatternChart'));
const TopStreaksChart = lazy(() => import('./charts/TopStreaksChart'));
const HabitCorrelationChart = lazy(() => import('./charts/HabitCorrelationChart'));
const CategoryBalanceChart = lazy(() => import('./charts/CategoryBalanceChart'));

const ProgressInsights = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [activeCharts, setActiveCharts] = useState({
    completionTrend: true,
    categoryPerformance: true,
    weeklyPattern: true,
    topStreaks: true,
    habitCorrelation: true,
    radarAnalysis: true
  });
  
  const habits = habitService.getHabits();
  const categories = habitService.getCategories();

  // Data calculation functions
  const dateRange = useMemo(() => {
    const today = new Date();
    switch (timeRange) {
      case 'week':
        return { start: subDays(today, 7), end: today };
      case 'month':
        return { start: subDays(today, 30), end: today };
      case 'year':
        return { start: subDays(today, 365), end: today };
      default:
        return { start: subDays(today, 7), end: today };
    }
  }, [timeRange]);

  const completionData = useMemo(() => {
    const days = eachDayOfInterval(dateRange);
    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const completed = habits.reduce((count, habit) => {
        const isCompleted = habit.history?.some(
          entry => entry.date === dateStr && entry.completed
        );
        return count + (isCompleted ? 1 : 0);
      }, 0);

      return {
        date: format(date, 'MMM dd'),
        completed,
        total: habits.length,
        rate: habits.length ? (completed / habits.length) * 100 : 0
      };
    });
  }, [habits, dateRange]);

  const categoryStats = useMemo(() => {
    return categories.map(category => {
      const categoryHabits = habits.filter(h => h.category === category.id);
      const completed = categoryHabits.reduce((count, habit) => {
        const hasCompletionInRange = habit.history?.some(entry => {
          const entryDate = new Date(entry.date);
          return entry.completed && isWithinInterval(entryDate, dateRange);
        });
        return count + (hasCompletionInRange ? 1 : 0);
      }, 0);

      return {
        name: category.name,
        habits: categoryHabits.length,
        completed,
        rate: categoryHabits.length ? (completed / categoryHabits.length) * 100 : 0,
        color: category.color
      };
    });
  }, [categories, habits, dateRange]);

  const streakData = useMemo(() => {
    return habits
      .map(habit => ({
        name: habit.name,
        streak: habit.streak,
        category: categories.find(c => c.id === habit.category)?.name || 'Unknown'
      }))
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 5);
  }, [habits, categories]);

  const weeklyPatternData = useMemo(() => {
    const startDate = startOfWeek(new Date());
    const endDate = endOfWeek(new Date());
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const completions = habits.reduce((acc, habit) => {
        const isCompleted = habit.history?.some(
          entry => entry.date === dateStr && entry.completed
        );
        return acc + (isCompleted ? 1 : 0);
      }, 0);

      return {
        day: format(date, 'EEE'),
        completions,
        successRate: habits.length ? (completions / habits.length) * 100 : 0
      };
    });
  }, [habits]);

  const habitCorrelationData = useMemo(() => {
    return habits.map(habit => ({
      name: habit.name,
      streak: habit.streak,
      completionRate: habit.history ? 
        (habit.history.filter(h => h.completed).length / habit.history.length) * 100 : 0,
      totalCompletions: habit.history ? 
        habit.history.filter(h => h.completed).length : 0
    }));
  }, [habits]);

  const renderChart = (chartId, Chart, data) => (
    activeCharts[chartId] && (
      <ChartErrorBoundary>
        <Suspense fallback={<ChartLoading />}>
          <div className="insight-card">
            <h3>{getChartTitle(chartId)}</h3>
            <div className="chart-container">
              <Chart data={data} />
            </div>
          </div>
        </Suspense>
      </ChartErrorBoundary>
    )
  );

  const getChartTitle = (chartId) => {
    const titles = {
      completionTrend: 'Completion Rate Trend',
      categoryPerformance: 'Category Performance',
      weeklyPattern: 'Weekly Pattern',
      topStreaks: 'Top Streaks',
      habitCorrelation: 'Habit Correlation Analysis',
      radarAnalysis: 'Category Balance Analysis'
    };
    return titles[chartId];
  };

  return (
    <div className="progress-insights">
      <div className="insights-header">
        <h2>Progress Insights</h2>
        <div className="time-range-selector">
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
      </div>

      <div className="chart-controls">
        <h3>Customize Dashboard</h3>
        <div className="chart-toggles">
          {Object.entries(activeCharts).map(([key, value]) => (
            <label key={key} className="chart-toggle">
              <input
                type="checkbox"
                checked={value}
                onChange={() => setActiveCharts(prev => ({
                  ...prev,
                  [key]: !prev[key]
                }))}
              />
              {key.split(/(?=[A-Z])/).join(' ')}
            </label>
          ))}
        </div>
      </div>

      <div className="insights-grid">
        {renderChart('completionTrend', CompletionTrendChart, completionData)}
        {renderChart('categoryPerformance', CategoryPerformanceChart, categoryStats)}
        {renderChart('weeklyPattern', WeeklyPatternChart, weeklyPatternData)}
        {renderChart('topStreaks', TopStreaksChart, streakData)}
        {renderChart('habitCorrelation', HabitCorrelationChart, habitCorrelationData)}
        {renderChart('radarAnalysis', CategoryBalanceChart, categoryStats)}
      </div>

      <div className="insights-summary">
        <div className="summary-card">
          <h4>Key Insights</h4>
          <ul>
            <li>Best performing day: {weeklyPatternData.reduce((a, b) => a.successRate > b.successRate ? a : b).day}</li>
            <li>Best category: {categoryStats.reduce((a, b) => a.rate > b.rate ? a : b).name}</li>
            <li>Longest streak: {streakData[0]?.streak || 0} days</li>
            <li>Average completion rate: {Math.round(completionData.reduce((acc, day) => acc + day.rate, 0) / completionData.length)}%</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProgressInsights;
