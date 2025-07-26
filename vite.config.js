import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

// Custom plugin to inject react-scan in development
function reactScanPlugin() {
  return {
    name: 'vite-plugin-react-scan',
    transformIndexHtml(html, { command }) {
      // Check if we're in development mode using Vite's command or NODE_ENV
      const isDevelopment = command === 'serve' || process.env.NODE_ENV === 'development';

      // Simple check: only inject in development and not in any test environment
      if (
        !isDevelopment ||
        process.env.PLAYWRIGHT_TEST === 'true' ||
        process.env.DISABLE_REACT_SCAN === 'true' ||
        html.includes('react-scan')
      ) {
        return html;
      }

      return html.replace(
        '</head>',
        `<script>
          window.REACT_SCAN_OPTIONS = {
            enabled: window.location.hostname === 'localhost' && !window.navigator.webdriver,
            log: false,
            showToolbar: true,
            trackUnnecessaryRenders: true,
            animationSpeed: "fast"
          };
        </script>
        <script src="https://unpkg.com/react-scan/dist/auto.global.js"></script></head>`,
      );
    },
  };
}

// Check if we should disable react-scan (for tests or when explicitly disabled)
const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.env.PLAYWRIGHT_TEST === 'true' ||
  process.env.VITEST === 'true' ||
  process.env.CI === 'true';
const isDisabled = process.env.DISABLE_REACT_SCAN === 'true';
const shouldDisableReactScan = isTestEnv || isDisabled;

if (shouldDisableReactScan) {
  console.log('react-scan disabled for testing environment');
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: '**/*.{jsx,js,tsx,ts}',
      jsxRuntime: 'automatic',
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'NeoFoodClub',
        short_name: 'NeoFoodClub',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
    // Only add react-scan plugin when not in test mode
    ...(shouldDisableReactScan ? [] : [reactScanPlugin()]),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  define: {
    'process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA': JSON.stringify(
      process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA,
    ),
  },
  // Configure the public directory to serve static assets
  publicDir: 'public',
  server: {
    port: 3000,
  },
  build: {
    outDir: 'build',
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});
