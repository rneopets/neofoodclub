import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

const isReactScanDisabled =
  process.env.NODE_ENV === 'test' ||
  process.env.PLAYWRIGHT_TEST === 'true' ||
  process.env.VITEST === 'true' ||
  process.env.DISABLE_REACT_SCAN === 'true';

// Custom plugin to inject react-scan locally and in Vercel PR previews.
function reactScanPlugin() {
  let viteCommand = 'build';

  return {
    name: 'vite-plugin-react-scan',
    configResolved(config) {
      viteCommand = config.command;
    },
    transformIndexHtml(html) {
      const isLocalDev = viteCommand === 'serve';
      const isVercelPreview = process.env.VERCEL_ENV === 'preview';

      if (
        isReactScanDisabled ||
        (!isLocalDev && !isVercelPreview) ||
        html.includes('react-scan')
      ) {
        return html;
      }

      // PR previews should expose the toolbar without scanning by default.
      // Local dev should scan immediately unless the developer opts out.
      const optionsScript = isVercelPreview
        ? `{ enabled: false, log: false, showToolbar: true, animationSpeed: "fast", trackUnnecessaryRenders: true }`
        : `{ enabled: !window.navigator.webdriver, log: false, showToolbar: true, trackUnnecessaryRenders: true, animationSpeed: "fast" }`;
      const resetPersistedOptionsScript = isVercelPreview
        ? `try {
            const key = "react-scan-options";
            const persistedOptions = JSON.parse(window.localStorage.getItem(key) || "{}");
            window.localStorage.setItem(
              key,
              JSON.stringify({ ...persistedOptions, enabled: false, showToolbar: true }),
            );
          } catch {}`
        : '';

      return html.replace(
        '</head>',
        `<script>
          ${resetPersistedOptionsScript}
        </script>
        <script src="https://unpkg.com/react-scan@0.4.3/dist/auto.global.js"></script>
        <script>
          window.reactScan?.(${optionsScript});
        </script></head>`,
      );
    },
  };
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
    reactScanPlugin(),
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
