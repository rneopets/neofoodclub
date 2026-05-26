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

const v2Gray = {
  50: '#F7FAFC',
  100: '#EDF2F7',
  200: '#E2E8F0',
  300: '#CBD5E0',
  400: '#A0AEC0',
  500: '#718096',
  600: '#4A5568',
  700: '#2D3748',
  800: '#1A202C',
  900: '#171923',
} as const;

const palette = (
  color: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    700: string;
    800: string;
    900: string;
  },
  name: string,
  darkAccent?: string,
) => ({
  contrast: semanticColor('{colors.white}', v2Gray[800], '{colors.white}'),
  fg: semanticColor(color[700], darkAccent ?? color[200], `{colors.${name}.300}`),
  subtle: semanticColor(color[50], color[900], `{colors.${name}.950}`),
  muted: semanticColor(color[100], color[800], `{colors.${name}.900}`),
  emphasized: semanticColor(color[200], color[700], `{colors.${name}.800}`),
  solid: semanticColor(color[500], darkAccent ?? color[200], `{colors.${name}.600}`),
  focusRing: semanticColor(color[500], darkAccent ?? color[400], `{colors.${name}.500}`),
});

const nfcDark = {
  blue: '#4BA0E4',
  cyan: '#49CBDF',
  green: '#50C17F',
  pink: '#DF4994',
  purple: '#8049DF',
  red: '#F76C6C',
  orange: '#F0923E',
  teal: '#49DFD0',
  yellow: '#FFC300',
} as const;

const nfc = {
  blue: '#90CDF4',
  cyan: '#9DECF9',
  gray: '#F7FAFC',
  green: '#9AE6B4',
  pink: '#FBB6CE',
  purple: '#D6BCFA',
  red: '#FEB2B2',
  orange: '#FBD38D',
  teal: '#81E6D9',
  yellow: '#FAF089',
} as const;

const nfcPalette = (light: string, dark: string, fallbackPalette: string) => ({
  contrast: semanticColor(v2Gray[800], '{colors.white}', `{colors.${fallbackPalette}.contrast}`),
  fg: semanticColor(v2Gray[800], '{colors.white}', `{colors.${fallbackPalette}.fg}`),
  subtle: semanticColor(light, dark, `{colors.${fallbackPalette}.subtle}`),
  muted: semanticColor(light, dark, `{colors.${fallbackPalette}.muted}`),
  emphasized: semanticColor(light, dark, `{colors.${fallbackPalette}.emphasized}`),
  solid: semanticColor(light, dark, `{colors.${fallbackPalette}.solid}`),
  focusRing: semanticColor(light, dark, `{colors.${fallbackPalette}.focusRing}`),
});

const v2Colors = {
  red: {
    50: '#FFF5F5',
    100: '#FED7D7',
    200: '#FEB2B2',
    300: '#FC8181',
    400: '#F56565',
    500: '#E53E3E',
    700: '#9B2C2C',
    800: '#822727',
    900: '#63171B',
  },
  orange: {
    50: '#FFFAF0',
    100: '#FEEBC8',
    200: '#FBD38D',
    300: '#F6AD55',
    400: '#ED8936',
    500: '#DD6B20',
    700: '#9C4221',
    800: '#7B341E',
    900: '#652B19',
  },
  yellow: {
    50: '#FFFFF0',
    100: '#FEFCBF',
    200: '#FAF089',
    300: '#F6E05E',
    400: '#ECC94B',
    500: '#D69E2E',
    700: '#975A16',
    800: '#744210',
    900: '#5F370E',
  },
  green: {
    50: '#F0FFF4',
    100: '#C6F6D5',
    200: '#9AE6B4',
    300: '#68D391',
    400: '#48BB78',
    500: '#38A169',
    700: '#276749',
    800: '#22543D',
    900: '#1C4532',
  },
  teal: {
    50: '#E6FFFA',
    100: '#B2F5EA',
    200: '#81E6D9',
    300: '#4FD1C5',
    400: '#38B2AC',
    500: '#319795',
    700: '#285E61',
    800: '#234E52',
    900: '#1D4044',
  },
  blue: {
    50: '#EBF8FF',
    100: '#BEE3F8',
    200: '#90CDF4',
    300: '#63B3ED',
    400: '#4299E1',
    500: '#3182CE',
    700: '#2C5282',
    800: '#2A4365',
    900: '#1A365D',
  },
  cyan: {
    50: '#EDFDFD',
    100: '#C4F1F9',
    200: '#9DECF9',
    300: '#76E4F7',
    400: '#0BC5EA',
    500: '#00B5D8',
    700: '#0987A0',
    800: '#086F83',
    900: '#065666',
  },
  purple: {
    50: '#FAF5FF',
    100: '#E9D8FD',
    200: '#D6BCFA',
    300: '#B794F4',
    400: '#9F7AEA',
    500: '#805AD5',
    700: '#553C9A',
    800: '#44337A',
    900: '#322659',
  },
  pink: {
    50: '#FFF5F7',
    100: '#FED7E2',
    200: '#FBB6CE',
    300: '#F687B3',
    400: '#ED64A6',
    500: '#D53F8C',
    700: '#97266D',
    800: '#702459',
    900: '#521B41',
  },
} as const;

const baseConfig = defineConfig({
  strictTokens: true,
  conditions: {
    light: '.light &, &.light, &[data-theme=light]',
    dark: '.dark &, &.dark, &[data-theme=dark], .night &, &.night, &[data-theme=night]',
    night: '.night &, &.night, &[data-theme=night]',
  },
  theme: {
    tokens: {
      colors: defineTokens.colors({
        nfc: {
          blue: { value: nfc.blue },
          blueDark: { value: nfcDark.blue },
          cyan: { value: nfc.cyan },
          cyanDark: { value: nfcDark.cyan },
          gray: { value: nfc.gray },
          grayDark: { value: v2Gray[700] },
          green: { value: nfc.green },
          greenDark: { value: nfcDark.green },
          pink: { value: nfc.pink },
          pinkDark: { value: nfcDark.pink },
          purple: { value: nfc.purple },
          purpleDark: { value: nfcDark.purple },
          red: { value: nfc.red },
          redDark: { value: nfcDark.red },
          orange: { value: nfc.orange },
          orangeDark: { value: nfcDark.orange },
          teal: { value: nfc.teal },
          tealDark: { value: nfcDark.teal },
          yellow: { value: nfc.yellow },
          yellowDark: { value: nfcDark.yellow },
        },
      }),
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
        gray: {
          contrast: semanticColor('{colors.white}', '#1A202C', '{colors.black}'),
          fg: semanticColor('{colors.gray.800}', '{colors.gray.100}', '{colors.gray.200}'),
          subtle: semanticColor('{colors.gray.100}', '#2D3748', '{colors.gray.900}'),
          muted: semanticColor('{colors.gray.200}', '#4A5568', '{colors.gray.800}'),
          emphasized: semanticColor('{colors.gray.300}', '#718096', '{colors.gray.700}'),
          solid: semanticColor('{colors.gray.900}', '{colors.gray.50}', '{colors.white}'),
          focusRing: semanticColor('{colors.gray.400}', '{colors.gray.400}'),
        },
        red: palette(v2Colors.red, 'red', nfcDark.red),
        orange: palette(v2Colors.orange, 'orange', nfcDark.orange),
        yellow: palette(v2Colors.yellow, 'yellow', nfcDark.yellow),
        green: palette(v2Colors.green, 'green', nfcDark.green),
        teal: palette(v2Colors.teal, 'teal', nfcDark.teal),
        blue: palette(v2Colors.blue, 'blue', nfcDark.blue),
        cyan: palette(v2Colors.cyan, 'cyan', nfcDark.cyan),
        purple: palette(v2Colors.purple, 'purple', nfcDark.purple),
        pink: palette(v2Colors.pink, 'pink', nfcDark.pink),
        'nfc-blue': nfcPalette(nfc.blue, nfcDark.blue, 'blue'),
        'nfc-green': nfcPalette(nfc.green, nfcDark.green, 'green'),
        'nfc-red': nfcPalette(nfc.red, nfcDark.red, 'red'),
        'nfc-orange': nfcPalette(nfc.orange, nfcDark.orange, 'orange'),
        'nfc-yellow': nfcPalette(nfc.yellow, nfcDark.yellow, 'yellow'),
        'nfc-teal': nfcPalette(nfc.teal, nfcDark.teal, 'teal'),
        'nfc-cyan': nfcPalette(nfc.cyan, nfcDark.cyan, 'cyan'),
        'nfc-purple': nfcPalette(nfc.purple, nfcDark.purple, 'purple'),
        'nfc-pink': nfcPalette(nfc.pink, nfcDark.pink, 'pink'),
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
