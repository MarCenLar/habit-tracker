import React, { useState, useEffect } from 'react';
import { voiceCommandService } from '../../services/VoiceCommandService';
import './VoiceControl.css';

const VoiceControl = () => {
  const [isListening, setIsListening] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(voiceCommandService.isSupported());

    // Listen for voice command responses
    const handleVoiceResponse = (event) => {
      const { command, response } = event.detail;
      setLastCommand({ command, response });
      setShowFeedback(true);
      
      // Hide feedback after 3 seconds
      setTimeout(() => {
        setShowFeedback(false);
      }, 3000);
    };

    window.addEventListener('voiceCommandResponse', handleVoiceResponse);

    return () => {
      window.removeEventListener('voiceCommandResponse', handleVoiceResponse);
    };
  }, []);

  const toggleVoiceControl = () => {
    const newState = voiceCommandService.toggleListening();
    setIsListening(newState);
  };

  if (!isSupported) {
    return (
      <div className="voice-control voice-unsupported">
        <span role="img" aria-label="warning">⚠️</span>
        Voice control is not supported in your browser
      </div>
    );
  }

  return (
    <>
      <button
        className={`voice-control-button ${isListening ? 'listening' : ''}`}
        onClick={toggleVoiceControl}
        aria-label={isListening ? 'Stop voice control' : 'Start voice control'}
        title={isListening ? 'Stop voice control' : 'Start voice control'}
      >
        <div className="microphone-icon">
          {isListening ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </div>
        {isListening && (
          <div className="pulse-rings">
            <div className="ring"></div>
            <div className="ring"></div>
            <div className="ring"></div>
          </div>
        )}
      </button>

      {showFeedback && lastCommand && (
        <div
          className="voice-feedback"
          role="status"
          aria-live="polite"
        >
          <div className="voice-feedback-content">
            <div className="command">
              <span className="label">Command:</span>
              <span className="text">{lastCommand.command}</span>
            </div>
            <div className="response">
              <span className="label">Response:</span>
              <span className="text">{lastCommand.response}</span>
            </div>
          </div>
        </div>
      )}

      {isListening && (
        <div className="voice-status" role="status" aria-live="polite">
          <div className="status-indicator">
            <div className="listening-dot"></div>
            Listening for commands...
          </div>
          <button
            className="help-button"
            onClick={() => voiceCommandService.speak('Say "help" to hear available commands')}
            aria-label="Voice command help"
          >
            <span role="img" aria-hidden="true">❔</span>
          </button>
        </div>
      )}
    </>
  );
};

export default VoiceControl;
