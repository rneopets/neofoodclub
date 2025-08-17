import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const baseConfig = defineConfig({
  strictTokens: true,
  conditions: {
    light: '.light &, &.light, &[data-theme=light]',
    dark: '.dark &, &.dark, &[data-theme=dark]',
  },
});

export const system = createSystem(defaultConfig, baseConfig);

export default system;
