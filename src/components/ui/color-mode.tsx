/* eslint-disable no-duplicate-imports */

import type { IconButtonProps, SpanProps } from '@chakra-ui/react';
import { ClientOnly, IconButton, Skeleton, Span } from '@chakra-ui/react';
import { ThemeProvider, useTheme } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';
import * as React from 'react';
import { LuMoon, LuMoonStar, LuSun } from 'react-icons/lu';

export type ColorModeProviderProps = ThemeProviderProps;
export type ColorMode = 'light' | 'dark' | 'night';

export const COLOR_MODES = ['light', 'dark', 'night'] as const satisfies readonly ColorMode[];

export function getNextColorMode(colorMode: ColorMode): ColorMode {
  const currentIndex = COLOR_MODES.indexOf(colorMode);
  return COLOR_MODES[(currentIndex + 1) % COLOR_MODES.length] ?? 'light';
}

function normalizeColorMode(theme: string | undefined): ColorMode {
  return COLOR_MODES.includes(theme as ColorMode) ? (theme as ColorMode) : 'dark';
}

export function ColorModeProvider(props: ColorModeProviderProps): React.ReactElement {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      themes={[...COLOR_MODES]}
      enableSystem
      disableTransitionOnChange
      {...props}
    />
  );
}

export interface UseColorModeReturn {
  colorMode: ColorMode;
  setColorMode: (colorMode: ColorMode) => void;
  toggleColorMode: () => void;
}

export function useColorMode(): UseColorModeReturn {
  const { theme, resolvedTheme, setTheme, forcedTheme } = useTheme();
  const activeTheme = theme === 'system' ? resolvedTheme : theme;
  const colorMode = normalizeColorMode(forcedTheme || activeTheme || resolvedTheme);
  const toggleColorMode = (): void => {
    setTheme(getNextColorMode(colorMode));
  };
  return {
    colorMode,
    setColorMode: setTheme,
    toggleColorMode,
  };
}

export function useColorModeValue<T>(light: T, dark: T, night = dark): T {
  const { colorMode } = useColorMode();
  if (colorMode === 'night') {
    return night;
  }
  return colorMode === 'dark' ? dark : light;
}

export function ColorModeIcon(): React.ReactElement {
  const { colorMode } = useColorMode();
  if (colorMode === 'night') {
    return <LuMoonStar />;
  }
  return colorMode === 'dark' ? <LuMoon /> : <LuSun />;
}

type ColorModeButtonProps = Omit<IconButtonProps, 'aria-label'>;
const createModeElement = React.createElement as unknown as (
  type: React.ElementType,
  props: Record<string, unknown>,
) => React.ReactElement;

function renderModeSpan(
  className: string,
  colorScheme: 'light' | 'dark',
  props: SpanProps,
  ref: React.ForwardedRef<HTMLSpanElement>,
): React.ReactElement {
  const modeProps: Record<string, unknown> = {
    ...props,
    color: 'fg',
    display: 'contents',
    className,
    colorPalette: 'gray',
    colorScheme,
    ref,
  };

  return createModeElement(Span, modeProps);
}

export const ColorModeButton = React.forwardRef<HTMLButtonElement, ColorModeButtonProps>(
  function ColorModeButton(props, ref) {
    const { toggleColorMode } = useColorMode();
    return (
      <ClientOnly fallback={<Skeleton boxSize="8" />}>
        <IconButton
          onClick={toggleColorMode}
          variant="ghost"
          aria-label="Toggle color mode"
          size="sm"
          ref={ref}
          {...props}
          css={{
            _icon: {
              width: '5',
              height: '5',
            },
          }}
        >
          <ColorModeIcon />
        </IconButton>
      </ClientOnly>
    );
  },
);

export const LightMode = React.forwardRef<HTMLSpanElement, SpanProps>(
  function LightMode(props, ref): React.ReactElement {
    return renderModeSpan('chakra-theme light', 'light', props, ref);
  },
);

export const DarkMode = React.forwardRef<HTMLSpanElement, SpanProps>(
  function DarkMode(props, ref): React.ReactElement {
    return renderModeSpan('chakra-theme dark', 'dark', props, ref);
  },
);
