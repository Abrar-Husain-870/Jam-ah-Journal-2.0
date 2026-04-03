const fs = require('fs');
const path = require('path');

// Create build directory
if (!fs.existsSync('build')) {
  fs.mkdirSync('build', { recursive: true });
}

// Read and process index.html
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace(/%PUBLIC_URL%/g, '');
fs.writeFileSync('build/index.html', html);

// Copy other files
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy public and src directories
copyDirectory('public', 'build');
copyDirectory('src', 'build');

console.log('Build completed successfully!');
