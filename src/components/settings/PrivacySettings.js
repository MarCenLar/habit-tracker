import React, { useState, useEffect } from 'react';
import { securityService } from '../../services/SecurityService';
import './PrivacySettings.css';

const PrivacySettings = () => {
  // Initialize settings with default values
  const [settings, setSettings] = useState({
    encryption: {
      enabled: false
    },
    privacy: {
      anonymizeData: false,
      shareData: false,
      dataRetention: 90
    },
    offlineMode: {
      enabled: false,
      syncOnConnect: true,
      lastSync: null
    }
  });
  const [encryptionKey, setEncryptionKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [lastCleanup, setLastCleanup] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const securitySettings = await securityService.getSecuritySettings();
      if (securitySettings) {
        setSettings(prevSettings => ({
          ...prevSettings,
          ...securitySettings
        }));
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const handleSettingChange = (category, setting, value) => {
    if (!settings) return;

    const updates = {
      ...settings,
      [category]: {
        ...settings[category],
        [setting]: value
      }
    };

    if (category === 'encryption' && setting === 'enabled') {
      if (value && !encryptionKey) {
        alert('Please set an encryption key first');
        return;
      }
    }

    const updated = securityService.updateSecuritySettings(updates);
    setSettings(updated);
  };

  const handleKeyChange = (e) => {
    setEncryptionKey(e.target.value);
  };

  const handleEnableEncryption = () => {
    if (!encryptionKey) {
      alert('Please enter an encryption key');
      return;
    }

    // Store the key securely (in a real app, this would be more secure)
    localStorage.setItem('encryptionKey', encryptionKey);
    handleSettingChange('encryption', 'enabled', true);
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const data = securityService.exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'habit-tracker-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
    setExportLoading(false);
  };

  const handleCleanupData = async () => {
    const confirmed = window.confirm(
      `This will delete data older than ${settings.privacy.dataRetention} days. Continue?`
    );

    if (confirmed) {
      const result = securityService.cleanupExpiredData();
      setLastCleanup(result);
      alert(`Cleanup complete. Removed ${result.entriesRemoved} entries.`);
    }
  };

  // Add a loading state check
  if (!settings) {
    return <div className="privacy-settings">Loading...</div>;
  }

  return (
    <div className="privacy-settings">
      <section className="settings-section">
        <h2>Data Security</h2>
        
        <div className="setting-group">
          <h3>Encryption</h3>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.encryption.enabled}
                onChange={() => handleSettingChange('encryption', 'enabled', !settings.encryption.enabled)}
              />
              Enable Data Encryption
            </label>
          </div>

          <div className="encryption-key">
            <input
              type={showKey ? 'text' : 'password'}
              value={encryptionKey}
              onChange={handleKeyChange}
              placeholder="Enter encryption key"
              disabled={settings.encryption.enabled}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="show-key-btn"
            >
              {showKey ? '🙈' : '👁️'}
            </button>
            {!settings.encryption.enabled && (
              <button
                onClick={handleEnableEncryption}
                className="enable-btn"
                disabled={!encryptionKey}
              >
                Enable
              </button>
            )}
          </div>
        </div>

        <div className="setting-group">
          <h3>Data Privacy</h3>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.privacy.anonymizeData}
                onChange={() => handleSettingChange('privacy', 'anonymizeData', !settings.privacy.anonymizeData)}
              />
              Anonymize Exported Data
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.privacy.shareData}
                onChange={() => handleSettingChange('privacy', 'shareData', !settings.privacy.shareData)}
              />
              Allow Data Sharing (for Social Features)
            </label>
          </div>

          <div className="setting-item">
            <label>
              Data Retention Period (days):
              <input
                type="number"
                value={settings.privacy.dataRetention}
                onChange={(e) => handleSettingChange('privacy', 'dataRetention', parseInt(e.target.value))}
                min="30"
                max="730"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Offline Mode</h2>
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.offlineMode.enabled}
              onChange={() => handleSettingChange('offlineMode', 'enabled', !settings.offlineMode.enabled)}
            />
            Enable Offline Mode
          </label>
        </div>

        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.offlineMode.syncOnConnect}
              onChange={() => handleSettingChange('offlineMode', 'syncOnConnect', !settings.offlineMode.syncOnConnect)}
            />
            Auto-sync when Online
          </label>
        </div>

        {settings.offlineMode.lastSync && (
          <div className="last-sync">
            Last synced: {new Date(settings.offlineMode.lastSync).toLocaleString()}
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>Data Management</h2>
        <div className="data-management-buttons">
          <button
            onClick={handleExportData}
            disabled={exportLoading}
            className="export-btn"
          >
            {exportLoading ? 'Exporting...' : 'Export Data'}
          </button>
          
          <button
            onClick={handleCleanupData}
            className="cleanup-btn"
          >
            Clean Up Old Data
          </button>
        </div>

        {lastCleanup && (
          <div className="cleanup-info">
            Last cleanup: {new Date(lastCleanup.cleanedAt).toLocaleString()}
            <br />
            Entries removed: {lastCleanup.entriesRemoved}
          </div>
        )}
      </section>
    </div>
  );
};

export default PrivacySettings;
