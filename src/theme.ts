import { createSystem, defaultConfig } from '@chakra-ui/react';

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        // Standard color palettes for Chakra v3 components
        gray: {
          50: { value: '#f9fafb' },
          100: { value: '#f3f4f6' },
          200: { value: '#e5e7eb' },
          300: { value: '#d1d5db' },
          400: { value: '#9ca3af' },
          500: { value: '#6b7280' },
          600: { value: '#4b5563' },
          700: { value: '#374151' },
          800: { value: '#1f2937' },
          900: { value: '#111827' },
          950: { value: '#030712' },
        },
        red: {
          50: { value: '#fef2f2' },
          100: { value: '#fee2e2' },
          200: { value: '#fecaca' },
          300: { value: '#fca5a5' },
          400: { value: '#f87171' },
          500: { value: '#ef4444' },
          600: { value: '#dc2626' },
          700: { value: '#b91c1c' },
          800: { value: '#991b1b' },
          900: { value: '#7f1d1d' },
          950: { value: '#450a0a' },
        },
        blue: {
          50: { value: '#eff6ff' },
          100: { value: '#dbeafe' },
          200: { value: '#bfdbfe' },
          300: { value: '#93c5fd' },
          400: { value: '#60a5fa' },
          500: { value: '#3b82f6' },
          600: { value: '#2563eb' },
          700: { value: '#1d4ed8' },
          800: { value: '#1e40af' },
          900: { value: '#1e3a8a' },
          950: { value: '#172554' },
        },
        green: {
          50: { value: '#f0fdf4' },
          100: { value: '#dcfce7' },
          200: { value: '#bbf7d0' },
          300: { value: '#86efac' },
          400: { value: '#4ade80' },
          500: { value: '#22c55e' },
          600: { value: '#16a34a' },
          700: { value: '#15803d' },
          800: { value: '#166534' },
          900: { value: '#14532d' },
          950: { value: '#052e16' },
        },
        orange: {
          50: { value: '#fff7ed' },
          100: { value: '#ffedd5' },
          200: { value: '#fed7aa' },
          300: { value: '#fdba74' },
          400: { value: '#fb923c' },
          500: { value: '#f97316' },
          600: { value: '#ea580c' },
          700: { value: '#c2410c' },
          800: { value: '#9a3412' },
          900: { value: '#7c2d12' },
          950: { value: '#431407' },
        },
        purple: {
          50: { value: '#faf5ff' },
          100: { value: '#f3e8ff' },
          200: { value: '#e9d5ff' },
          300: { value: '#d8b4fe' },
          400: { value: '#c084fc' },
          500: { value: '#a855f7' },
          600: { value: '#9333ea' },
          700: { value: '#7c3aed' },
          800: { value: '#6b21a8' },
          900: { value: '#581c87' },
          950: { value: '#3b0764' },
        },
        pink: {
          50: { value: '#fdf2f8' },
          100: { value: '#fce7f3' },
          200: { value: '#fbcfe8' },
          300: { value: '#f9a8d4' },
          400: { value: '#f472b6' },
          500: { value: '#ec4899' },
          600: { value: '#db2777' },
          700: { value: '#be185d' },
          800: { value: '#9d174d' },
          900: { value: '#831843' },
          950: { value: '#500724' },
        },
        // Keep our custom nfc colors
        nfc: {
          blue: { value: '#90CDF4' },
          blueDark: { value: '#4BA0E4' },

          gray: { value: '#F7FAFC' },
          grayDark: { value: '#2D3748' },

          green: { value: '#9AE6B4' },
          greenDark: { value: '#50C17F' },

          red: { value: '#FEB2B2' },
          redDark: { value: '#F76C6C' },

          orange: { value: '#FBD38D' },
          orangeDark: { value: '#F0923E' },

          yellow: { value: '#FAF089' },
          yellowDark: { value: '#FFC300' },
        },
      },
    },
  },
});

export default system;
