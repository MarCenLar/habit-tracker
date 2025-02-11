class VoiceCommandService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.commandHandlers = new Map();
    this.initializeVoiceRecognition();
  }

  initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new window.webkitSpeechRecognition();
      this.setupRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new window.SpeechRecognition();
      this.setupRecognition();
    }
  }

  setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      this.handleCommand(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto restart if it was meant to be listening
      if (this.shouldBeListening) {
        this.startListening();
      }
    };

    // Register default commands
    this.registerDefaultCommands();
  }

  registerDefaultCommands() {
    // Navigation commands
    this.registerCommand('go to dashboard', () => {
      window.location.hash = '#/dashboard';
      return 'Navigating to dashboard';
    });

    this.registerCommand('show habits', () => {
      window.location.hash = '#/habits';
      return 'Showing habits list';
    });

    this.registerCommand('open settings', () => {
      window.location.hash = '#/settings';
      return 'Opening settings';
    });

    // Habit management commands
    this.registerCommand('add habit', () => {
      document.querySelector('.add-habit-btn')?.click();
      return 'Opening add habit form';
    });

    this.registerCommand('complete habit', (transcript) => {
      // Extract habit name from command (e.g., "complete habit reading")
      const habitName = transcript.replace('complete habit', '').trim();
      if (!habitName) return 'Please specify a habit name';
      
      // Find and click the complete button for the specified habit
      const habitElements = document.querySelectorAll('.habit-item');
      for (const element of habitElements) {
        if (element.textContent.toLowerCase().includes(habitName)) {
          const completeButton = element.querySelector('.complete-btn');
          if (completeButton) {
            completeButton.click();
            return `Marked ${habitName} as complete`;
          }
        }
      }
      return `Couldn't find habit: ${habitName}`;
    });

    // Analysis commands
    this.registerCommand('show progress', () => {
      window.location.hash = '#/insights';
      return 'Showing progress insights';
    });

    this.registerCommand('show achievements', () => {
      window.location.hash = '#/rewards';
      return 'Showing achievements';
    });

    // Settings commands
    this.registerCommand('dark mode', () => {
      const themeToggle = document.querySelector('.theme-toggle');
      if (themeToggle) {
        themeToggle.click();
        return 'Toggled dark mode';
      }
      return 'Theme toggle not found';
    });

    // Help commands
    this.registerCommand('list commands', () => {
      const commands = Array.from(this.commandHandlers.keys()).join(', ');
      return `Available commands: ${commands}`;
    });

    this.registerCommand('help', () => {
      return 'Say "list commands" to see available voice commands';
    });
  }

  registerCommand(command, handler) {
    this.commandHandlers.set(command.toLowerCase(), handler);
  }

  handleCommand(transcript) {
    let response = 'Command not recognized';
    
    for (const [command, handler] of this.commandHandlers.entries()) {
      if (transcript.includes(command)) {
        response = handler(transcript);
        break;
      }
    }

    // Provide audio feedback
    this.speak(response);

    // Dispatch event for UI feedback
    const event = new CustomEvent('voiceCommandResponse', {
      detail: { command: transcript, response }
    });
    window.dispatchEvent(event);
  }

  speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  startListening() {
    if (!this.recognition) {
      console.error('Speech recognition not supported');
      return false;
    }

    if (!this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
        this.shouldBeListening = true;
        this.speak('Voice commands activated');
        return true;
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        return false;
      }
    }
    return true;
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.shouldBeListening = false;
      this.speak('Voice commands deactivated');
    }
  }

  toggleListening() {
    return this.isListening ? this.stopListening() : this.startListening();
  }

  isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }
}

export const voiceCommandService = new VoiceCommandService();
