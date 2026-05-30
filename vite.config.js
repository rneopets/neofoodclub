import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

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
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  define: {
    'process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA': JSON.stringify(
      process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        'development',
    ),
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
        manualChunks: {
          // Split Chakra UI into its own chunk
          'chakra-ui': ['@chakra-ui/react', '@emotion/react'],
          // Split Chart.js into its own chunk
          chart: ['chart.js', 'react-chartjs-2', 'chartjs-plugin-annotation'],
          // Split React libraries
          'react-vendor': ['react', 'react-dom'],
          // Split icons and other UI libraries
          'ui-vendor': ['react-icons', 'date-fns', 'date-fns-tz'],
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
