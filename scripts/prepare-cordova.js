const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '../build');
const wwwDir = path.join(__dirname, '../habit-tracker-android/www');

// Create www directory if it doesn't exist
if (!fs.existsSync(wwwDir)) {
    fs.mkdirSync(wwwDir, { recursive: true });
}

// Function to copy directory recursively
function copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    const files = fs.readdirSync(source);
    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);

        if (fs.lstatSync(sourcePath).isDirectory()) {
            copyDirectory(sourcePath, destPath);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    });
}

// Clean www directory
fs.readdirSync(wwwDir).forEach(file => {
    const filePath = path.join(wwwDir, file);
    if (file !== 'cordova.js' && file !== 'cordova_plugins.js') {
        if (fs.lstatSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true });
        } else {
            fs.unlinkSync(filePath);
        }
    }
});

// Copy build directory to www
copyDirectory(buildDir, wwwDir);

// Modify index.html to include cordova.js
const indexPath = path.join(wwwDir, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Update CSP meta tag for Cordova
indexContent = indexContent.replace(
    /<meta http-equiv="Content-Security-Policy".*?>/,
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' data: gap: https://ssl.gstatic.com \'unsafe-eval\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; media-src *; img-src \'self\' data: content:;">'
);

// Add viewport meta tag if not present
if (!indexContent.includes('viewport')) {
    const headEnd = indexContent.indexOf('</head>');
    indexContent = indexContent.slice(0, headEnd) +
        '    <meta name="viewport" content="initial-scale=1, width=device-width, viewport-fit=cover, user-scalable=no">\n' +
        indexContent.slice(headEnd);
}

// Add cordova.js if not present
if (!indexContent.includes('cordova.js')) {
    const bodyStart = indexContent.indexOf('<body>') + 7;
    indexContent = indexContent.slice(0, bodyStart) +
        '\n    <script src="cordova.js"></script>' +
        indexContent.slice(bodyStart);
}

fs.writeFileSync(indexPath, indexContent);

console.log('Successfully prepared build for Cordova');
