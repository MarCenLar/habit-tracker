import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import HabitList from './components/HabitList';
import AddHabit from './components/AddHabit';
import ProgressInsights from './components/ProgressInsights';
import Settings from './components/Settings';
import { Analytics } from './components/Analytics';
import Rewards from './components/Rewards';
import ReminderSettings from './components/ReminderSettings';
import VoiceControl from './components/accessibility/VoiceControl';
import PrivacySettings from './components/settings/PrivacySettings';
import SocialFeed from './components/social/SocialFeed';
import FeedbackPortal from './components/feedback/FeedbackPortal';
import QuestLog from './components/gamification/QuestLog';
import RewardStore from './components/gamification/RewardStore';
import Achievements from './components/gamification/Achievements';
import { analyticsService } from './services/analytics/AnalyticsService';
import { integrationService } from './services/IntegrationService';
import { onDeviceReady, initCordova, isCordova } from './utils/cordova';

const services = {
  analytics: analyticsService,
  integration: integrationService
};

function App() {
  const [activeSection, setActiveSection] = useState('main');
  const [isReady, setIsReady] = useState(!isCordova());

  useEffect(() => {
    // Initialize Cordova when component mounts
    onDeviceReady(() => {
      initCordova();
      setIsReady(true);
    });

    // Handle back button in Cordova
    if (isCordova()) {
      document.addEventListener('backbutton', handleBackButton, false);
      return () => {
        document.removeEventListener('backbutton', handleBackButton);
      };
    }
  }, []);

  const handleBackButton = (e) => {
    e.preventDefault();
    if (activeSection !== 'main') {
      setActiveSection('main');
    } else {
      // Show exit confirmation dialog
      if (window.confirm('Do you want to exit the app?')) {
        navigator.app.exitApp();
      }
    }
  };

  const renderSection = () => {
    switch(activeSection) {
      case 'main':
        return (
          <>
            <Dashboard services={services} />
            <div className="section-content">
              <HabitList />
              <AddHabit />
              <ProgressInsights />
            </div>
          </>
        );
      case 'analytics':
        return (
          <div className="section-content">
            <Analytics />
          </div>
        );
      case 'gamification':
        return (
          <div className="section-content gamification-section">
            <div className="gamification-grid">
              <div className="gamification-main">
                <QuestLog />
                <Achievements />
              </div>
              <div className="gamification-sidebar">
                <RewardStore />
              </div>
            </div>
          </div>
        );
      case 'social':
        return (
          <div className="section-content social-section">
            <SocialFeed />
            <FeedbackPortal />
          </div>
        );
      case 'settings':
        return (
          <div className="section-content settings-section">
            <Settings />
            <ReminderSettings />
            <VoiceControl />
            <PrivacySettings />
          </div>
        );
      default:
        return null;
    }
  };

  if (!isReady) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className={`app ${isCordova() ? 'cordova-app' : ''}`}>
      <nav className="nav-bar">
        <div className="nav-brand">
          <h1>Habit Tracker</h1>
        </div>
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeSection === 'main' ? 'active' : ''}`}
            onClick={() => setActiveSection('main')}>
            Dashboard
          </button>
          <button 
            className={`nav-tab ${activeSection === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveSection('analytics')}>
            Analytics
          </button>
          <button 
            className={`nav-tab ${activeSection === 'gamification' ? 'active' : ''}`}
            onClick={() => setActiveSection('gamification')}>
            Gamification
          </button>
          <button 
            className={`nav-tab ${activeSection === 'social' ? 'active' : ''}`}
            onClick={() => setActiveSection('social')}>
            Social
          </button>
          <button 
            className={`nav-tab ${activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveSection('settings')}>
            Settings
          </button>
        </div>
      </nav>
      <div className="main-content">
        {renderSection()}
      </div>
    </div>
  );
}

export default App;
