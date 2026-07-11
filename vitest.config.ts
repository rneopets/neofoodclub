/// <reference types="vitest" />
import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [react(), tsconfigPaths(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'import.meta.env.DISABLE_REACT_SCAN': JSON.stringify(true),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: {
      NODE_ENV: 'test',
      VITEST: 'true',
      DISABLE_REACT_SCAN: 'true',
    },
    // Enable parallel execution with multiple threads
    pool: 'threads',
    // Allow multiple workers for better parallel performance
    poolOptions: {
      threads: {
        maxThreads: 6,
        minThreads: 2,
      },
    },
    // Only include unit tests in src directory, exclude e2e tests
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'cobertura'],
      exclude: [
        'node_modules/',
        'src/test/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**',
        'src/vite-env.d.ts',
        'src/service-worker.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        'automation/**',
      ],
      include: ['src/**/*.{ts,tsx}'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    // Increase timeout for slower tests
    testTimeout: 20000,
    // Allow for longer setup times
    hookTimeout: 20000,
  },
});
