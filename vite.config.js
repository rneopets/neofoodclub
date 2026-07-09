import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

// Cloudflare Pages doesn't set VITE_GIT_COMMIT_SHA itself, but it exposes the
// deployed commit as CF_PAGES_COMMIT_SHA. Bridge it so Vite's normal VITE_ env
// handling picks it up, matching what CI already sets explicitly.
if (!process.env.VITE_GIT_COMMIT_SHA && process.env.CF_PAGES_COMMIT_SHA) {
  process.env.VITE_GIT_COMMIT_SHA = process.env.CF_PAGES_COMMIT_SHA;
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
      registerType: 'prompt',
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
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  define: {
    'import.meta.env.DISABLE_REACT_SCAN': JSON.stringify(
      process.env.DISABLE_REACT_SCAN === 'true',
    ),
  },
  // Configure the public directory to serve static assets
  publicDir: 'public',
  server: {
    port: 3000,
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Split Chakra UI into its own chunk
          if (id.includes('/@chakra-ui/react') || id.includes('/@emotion/react')) {
            return 'chakra-ui';
          }
          // Split Chart.js into its own chunk
          if (
            id.includes('/chart.js') ||
            id.includes('/react-chartjs-2') ||
            id.includes('/chartjs-plugin-annotation')
          ) {
            return 'chart';
          }
          // Split React libraries
          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor';
          }
          // Split icons and other UI libraries
          if (
            id.includes('/react-icons') ||
            id.includes('/date-fns/') ||
            id.includes('/date-fns-tz')
          ) {
            return 'ui-vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});
