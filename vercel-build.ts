import fs from 'fs';
import path from 'path';

// Get the git commit SHA from Vercel environment
const commitSha = process.env['VERCEL_GIT_COMMIT_SHA'] || 'development';

// Create a .env file with the git commit SHA
fs.writeFileSync(
  path.join(process.cwd(), '.env'),
  `REACT_APP_VERCEL_GIT_COMMIT_SHA=${commitSha}\n`,
  { flag: 'a' },
);

console.log(`Added git commit SHA (${commitSha}) to environment variables`);

// Check if we're in preview environment
const isPreview = process.env['VERCEL_ENV'] === 'preview';

if (isPreview) {
  console.log('Preview environment detected. Adding react-scan to index.html...');

  // Path to index.html
  const indexPath = path.join(process.cwd(), 'public', 'index.html');

  // Read the content of index.html
  let indexHtml = fs.readFileSync(indexPath, 'utf8');

  // Check if react-scan is already in the file
  if (!indexHtml.includes('react-scan')) {
    // Add react-scan script before the closing </head> tag
    indexHtml = indexHtml.replace(
      '</head>',
      `  <script>
    window.REACT_SCAN_OPTIONS = {
      enabled: false,
      log: false,
      showToolbar: true,
      animationSpeed: "fast",
      trackUnnecessaryRenders: true,
    };
  </script>
  <script src="https://unpkg.com/react-scan/dist/auto.global.js"></script>
  </head>`,
    );

    // Write the modified content back to index.html
    fs.writeFileSync(indexPath, indexHtml);
    console.log('Successfully added react-scan to index.html');
  } else {
    console.log('react-scan already exists in index.html');
  }
}
