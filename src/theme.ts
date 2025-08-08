import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const customConfig = defineConfig({
  strictTokens: true,
  // Configure conditions to work with next-themes CSS class approach
  conditions: {
    light: '.light &, &.light, &[data-theme=light]',
    dark: '.dark &, &.dark, &[data-theme=dark]',
  },
});

// Create system with proper merging of default config and custom config
export const system = createSystem(defaultConfig, customConfig);

export default system;
