import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import glob from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Copying public assets to build directory...');

// Ensure build directory exists
if (!fs.existsSync(path.resolve(__dirname, 'build'))) {
  fs.mkdirSync(path.resolve(__dirname, 'build'));
}

// Copy all files from public to build except index.html (already handled by Vite)
const publicFiles = glob.sync('public/**/*', { ignore: ['public/index.html'] });

publicFiles.forEach(file => {
  if (fs.statSync(file).isFile()) {
    const relativePath = path.relative('public', file);
    const destPath = path.resolve(__dirname, 'build', relativePath);

    fs.ensureDirSync(path.dirname(destPath));
    fs.copyFileSync(file, destPath);
    console.log(`Copied: ${file} -> ${destPath}`);
  }
});

console.log('Asset copying complete!');
