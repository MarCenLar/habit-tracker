class SecurityService {
  constructor() {
    this.settings = {
      dataEncryption: false,
      biometricAuth: false,
      twoFactorAuth: false,
      dataRetention: 90, // days
      backupEnabled: false
    };
  }

  // Simple hash function for demo purposes
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Mock encryption function
  encryptData(data) {
    if (!this.settings.dataEncryption) return data;
    
    // Simple reversible encoding for demo
    const encoded = btoa(JSON.stringify(data));
    return {
      data: encoded,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
  }

  // Mock decryption function
  decryptData(encryptedData) {
    if (!this.settings.dataEncryption) return encryptedData;
    if (typeof encryptedData === 'string') return encryptedData;
    
    try {
      return JSON.parse(atob(encryptedData.data));
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  // Security settings management
  async updateSecuritySettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };

    await this.saveSettings();
    return this.settings;
  }

  async getSecuritySettings() {
    await this.loadSettings();
    return this.settings;
  }

  // Biometric authentication mock
  async authenticateWithBiometrics() {
    if (!this.settings.biometricAuth) {
      throw new Error('Biometric authentication is not enabled');
    }

    // Mock successful biometric auth
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          timestamp: new Date().toISOString()
        });
      }, 1000);
    });
  }

  // Two-factor authentication mock
  async verifyTwoFactorCode(code) {
    if (!this.settings.twoFactorAuth) {
      throw new Error('Two-factor authentication is not enabled');
    }

    // Mock 2FA verification
    return new Promise(resolve => {
      setTimeout(() => {
        const isValid = /^\d{6}$/.test(code);
        resolve({
          success: isValid,
          timestamp: new Date().toISOString(),
          remainingAttempts: isValid ? 0 : 2
        });
      }, 500);
    });
  }

  // Data backup mock
  async createDataBackup() {
    if (!this.settings.backupEnabled) {
      throw new Error('Data backup is not enabled');
    }

    const backupData = {
      settings: this.settings,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    // Mock backup creation
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          backupId: `backup_${Date.now()}`,
          data: this.encryptData(backupData)
        });
      }, 1000);
    });
  }

  // Data retention enforcement
  async enforceDataRetention() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.dataRetention);

    // Mock data cleanup
    return {
      success: true,
      deletedRecords: 0,
      timestamp: new Date().toISOString()
    };
  }

  async cleanupExpiredData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.settings.dataRetention);

    try {
      // Clean expired sessions
      const sessionData = localStorage.getItem('sessions') || '[]';
      const sessions = JSON.parse(sessionData);
      const validSessions = sessions.filter(session => 
        new Date(session.timestamp) > cutoffDate
      );
      localStorage.setItem('sessions', JSON.stringify(validSessions));

      // Clean expired data
      await this.enforceDataRetention();

      return {
        success: true,
        cleanedSessions: sessions.length - validSessions.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Cleanup error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Settings persistence
  async saveSettings() {
    localStorage.setItem('securitySettings', JSON.stringify(this.settings));
  }

  async loadSettings() {
    const saved = localStorage.getItem('securitySettings');
    if (saved) {
      this.settings = JSON.parse(saved);
    }
  }
}

const securityService = new SecurityService();
export { securityService };
export default SecurityService;
