import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
  defineSemanticTokens,
  defineSlotRecipe,
  defineTokens,
} from '@chakra-ui/react';

type SemanticColorToken = {
  value: { _light: string; _dark: string; _night: string };
};

type SemanticColorPalette = Record<
  'contrast' | 'fg' | 'subtle' | 'muted' | 'emphasized' | 'solid' | 'focusRing',
  SemanticColorToken
>;

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

const v2RadiomarkControl = {
  borderWidth: '2px',
  borderColor: 'radiomark.ring',
  bg: 'transparent',
  color: 'transparent',
  _checked: {
    bg: 'radiomark.checked',
    borderColor: 'radiomark.checked',
    color: 'radiomark.dot',
  },
  '& .dot': {
    scale: '0.5',
  },
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
): SemanticColorPalette => ({
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
  teal: '#319795',
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

// Precomputed shades (darken(nfc[name], 0.12) / darken(nfc[name], 0.25)) so the
// surface/subtle button variants have distinct hover/active backgrounds instead
// of collapsing to the flat accent color. Values are static, not computed at
// runtime, to match the rest of this file's palette() convention.
const nfcMuted = {
  blue: '#7FB4D7',
  cyan: '#8AD0DB',
  green: '#88CA9E',
  pink: '#DDA0B5',
  purple: '#BCA5DC',
  red: '#E09D9D',
  orange: '#DDBA7C',
  teal: '#72CABF',
  yellow: '#DCD379',
} as const;

const nfcEmphasized = {
  blue: '#6C9AB7',
  cyan: '#76B1BB',
  green: '#74AD87',
  pink: '#BC899B',
  purple: '#A18DBC',
  red: '#BF8686',
  orange: '#BC9E6A',
  teal: '#61ADA3',
  yellow: '#BCB467',
} as const;

const nfcDarkMuted = {
  blue: '#428DC9',
  cyan: '#40B3C4',
  green: '#46AA70',
  pink: '#C44082',
  purple: '#7140C4',
  red: '#D95F5F',
  orange: '#D38037',
  teal: '#2B8583',
  yellow: '#E0AC00',
} as const;

const nfcDarkEmphasized = {
  blue: '#3878AB',
  cyan: '#3798A7',
  green: '#3C915F',
  pink: '#A7376F',
  purple: '#6037A7',
  red: '#B95151',
  orange: '#B46E2F',
  teal: '#257170',
  yellow: '#BF9200',
} as const;

const nfcPalette = (name: keyof typeof nfcDark): SemanticColorPalette => ({
  contrast: semanticColor(v2Gray[800], '{colors.white}', `{colors.${name}.contrast}`),
  fg: semanticColor(v2Gray[800], '{colors.white}', `{colors.${name}.fg}`),
  subtle: semanticColor(nfc[name], nfcDark[name], `{colors.${name}.subtle}`),
  muted: semanticColor(nfcMuted[name], nfcDarkMuted[name], `{colors.${name}.muted}`),
  emphasized: semanticColor(
    nfcEmphasized[name],
    nfcDarkEmphasized[name],
    `{colors.${name}.emphasized}`,
  ),
  solid: semanticColor(nfc[name], nfcDark[name], `{colors.${name}.solid}`),
  focusRing: semanticColor(nfc[name], nfcDark[name], `{colors.${name}.focusRing}`),
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
        'nfc-blue': nfcPalette('blue'),
        'nfc-green': nfcPalette('green'),
        'nfc-red': nfcPalette('red'),
        'nfc-orange': nfcPalette('orange'),
        'nfc-yellow': nfcPalette('yellow'),
        'nfc-teal': nfcPalette('teal'),
        'nfc-cyan': nfcPalette('cyan'),
        'nfc-purple': nfcPalette('purple'),
        'nfc-pink': nfcPalette('pink'),
        radiomark: {
          ring: semanticColor(v2Gray[200], 'rgba(255, 255, 255, 0.4)', v2Gray[700]),
          checked: semanticColor(v2Colors.blue[500], v2Colors.blue[200], v2Gray[200]),
          dot: semanticColor('{colors.white}', v2Gray[900], v2Gray[900]),
        },
      }),
    },
    recipes: {
      radiomark: defineRecipe({
        className: 'chakra-radiomark',
        variants: {
          variant: {
            solid: v2RadiomarkControl,
          },
        },
      }),
    },
    slotRecipes: {
      radioGroup: defineSlotRecipe({
        className: 'chakra-radio-group',
        slots: ['root', 'label', 'item', 'itemText', 'itemControl', 'indicator', 'itemAddon', 'itemIndicator'],
        variants: {
          variant: {
            solid: {
              itemControl: v2RadiomarkControl,
            },
          },
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
