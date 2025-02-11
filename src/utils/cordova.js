// Cordova integration utilities
const isCordova = () => !!window.cordova;

const onDeviceReady = (callback) => {
    if (isCordova()) {
        document.addEventListener('deviceready', callback, false);
    } else {
        callback();
    }
};

const initCordova = () => {
    if (!isCordova()) return;

    // Initialize StatusBar
    if (window.StatusBar) {
        window.StatusBar.styleDefault();
        window.StatusBar.overlaysWebView(false);
        window.StatusBar.backgroundColorByHexString('#000000');
    }

    // Handle back button
    document.addEventListener('backbutton', (e) => {
        e.preventDefault();
        // Add custom back button behavior here
        // For example, show exit confirmation dialog if at root route
    }, false);

    // Handle app pause/resume
    document.addEventListener('pause', () => {
        // Add pause handling (e.g., save state)
    }, false);

    document.addEventListener('resume', () => {
        // Add resume handling (e.g., refresh data)
    }, false);
};

// Notification wrapper
const showNotification = (title, message) => {
    if (isCordova() && window.cordova.plugins.notification.local) {
        window.cordova.plugins.notification.local.schedule({
            title,
            text: message,
            foreground: true
        });
    } else {
        // Fallback for web
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body: message });
                }
            });
        }
    }
};

// Device information
const getDeviceInfo = () => {
    if (isCordova() && window.device) {
        return {
            platform: window.device.platform,
            version: window.device.version,
            model: window.device.model,
            cordova: window.device.cordova,
            isVirtual: window.device.isVirtual,
            manufacturer: window.device.manufacturer,
            serial: window.device.serial
        };
    }
    return null;
};

// File system wrapper
const fileSystem = {
    write: async (fileName, data) => {
        if (!isCordova()) return null;
        
        return new Promise((resolve, reject) => {
            window.requestFileSystem(window.PERSISTENT, 0, (fs) => {
                fs.root.getFile(fileName, { create: true, exclusive: false }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = () => resolve(true);
                        fileWriter.onerror = (e) => reject(e);
                        fileWriter.write(new Blob([data], { type: 'text/plain' }));
                    });
                }, reject);
            }, reject);
        });
    },
    
    read: async (fileName) => {
        if (!isCordova()) return null;
        
        return new Promise((resolve, reject) => {
            window.requestFileSystem(window.PERSISTENT, 0, (fs) => {
                fs.root.getFile(fileName, { create: false }, (fileEntry) => {
                    fileEntry.file((file) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = (e) => reject(e);
                        reader.readAsText(file);
                    });
                }, reject);
            }, reject);
        });
    }
};

export {
    isCordova,
    onDeviceReady,
    initCordova,
    showNotification,
    getDeviceInfo,
    fileSystem
};
