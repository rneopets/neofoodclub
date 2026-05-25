import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineSemanticTokens,
  defineTokens,
} from '@chakra-ui/react';

type SemanticColorToken = {
  value: { _light: string; _dark: string; _night: string };
};

const semanticColor = (light: string, dark: string, night = dark): SemanticColorToken => ({
  value: { _light: light, _dark: dark, _night: night },
});

const baseConfig = defineConfig({
  strictTokens: true,
  conditions: {
    light: '.light &, &.light, &[data-theme=light]',
    dark: '.dark &, &.dark, &[data-theme=dark], .night &, &.night, &[data-theme=night]',
    night: '.night &, &.night, &[data-theme=night]',
  },
  theme: {
    tokens: {
      // Default Chakra maps these to the arrow cursor; interactive controls then fight
      // pointer/hover styles and hidden native inputs. Use pointer for clear affordance.
      cursor: defineTokens.cursor({
        pointer: { value: 'pointer' },
        notAllowed: { value: 'not-allowed' },
        inherit: { value: 'inherit' },
        button: { value: 'pointer' },
        checkbox: { value: 'pointer' },
        disabled: { value: 'not-allowed' },
        radio: { value: 'pointer' },
        menuitem: { value: 'pointer' },
        option: { value: 'pointer' },
        slider: { value: 'pointer' },
        switch: { value: 'pointer' },
      }),
    },
    semanticTokens: {
      colors: defineSemanticTokens.colors({
        bg: {
          DEFAULT: semanticColor('{colors.white}', '#1A202C', '#09090B'),
          subtle: semanticColor('{colors.gray.50}', '#171923', '{colors.gray.950}'),
          muted: semanticColor('{colors.gray.100}', '#2D3748', '{colors.gray.900}'),
          emphasized: semanticColor('{colors.gray.200}', '#4A5568', '{colors.gray.800}'),
          inverted: semanticColor('{colors.black}', '{colors.white}', '{colors.white}'),
          panel: semanticColor('{colors.white}', '#171923', '{colors.gray.950}'),
        },
        fg: {
          DEFAULT: semanticColor('{colors.black}', '{colors.gray.50}'),
          muted: semanticColor('{colors.gray.600}', '{colors.gray.300}', '{colors.gray.400}'),
          subtle: semanticColor('{colors.gray.400}', '{colors.gray.400}', '{colors.gray.500}'),
          inverted: semanticColor('{colors.gray.50}', '{colors.black}'),
        },
        border: {
          DEFAULT: semanticColor('{colors.gray.200}', '#4A5568', '{colors.gray.800}'),
          muted: semanticColor('{colors.gray.100}', '#2D3748', '{colors.gray.900}'),
          subtle: semanticColor('{colors.gray.50}', '#171923', '{colors.gray.950}'),
          emphasized: semanticColor('{colors.gray.300}', '#718096', '{colors.gray.700}'),
          inverted: semanticColor('{colors.gray.800}', '{colors.gray.200}'),
        },
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
      cursor: 'notAllowed',
    },
    // Images default to `auto` and can flash the arrow over otherwise-pointer links.
    'a[href] img': {
      cursor: 'inherit',
    },
  },
});

export const system = createSystem(defaultConfig, baseConfig);

export default system;
