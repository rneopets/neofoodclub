import { createSystem, defaultConfig, defineConfig, defineTokens } from '@chakra-ui/react';

const baseConfig = defineConfig({
  strictTokens: true,
  conditions: {
    light: '.light &, &.light, &[data-theme=light]',
    dark: '.dark &, &.dark, &[data-theme=dark]',
  },
  theme: {
    tokens: {
      // Default Chakra maps these to the arrow cursor; interactive controls then fight
      // pointer/hover styles and hidden native inputs. Use pointer for clear affordance.
      cursor: defineTokens.cursor({
        checkbox: { value: 'pointer' },
        radio: { value: 'pointer' },
        menuitem: { value: 'pointer' },
        option: { value: 'pointer' },
      }),
    },
  },
  globalCss: {
    // Visually hidden checkbox/radio inputs still hit-test on top of custom UI; browsers
    // use `auto` there unless we match the interactive cursor.
    'input[type="checkbox"]:enabled, input[type="radio"]:enabled': {
      cursor: 'pointer',
    },
    'input[type="checkbox"]:disabled, input[type="radio"]:disabled': {
      cursor: 'not-allowed',
    },
    // Images default to `auto` and can flash the arrow over otherwise-pointer links.
    'a[href] img': {
      cursor: 'inherit',
    },
  },
});

export const system = createSystem(defaultConfig, baseConfig);

export default system;
