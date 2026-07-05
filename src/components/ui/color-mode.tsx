/* eslint-disable no-duplicate-imports */

import type { IconButtonProps, SpanProps } from '@chakra-ui/react';
import { ClientOnly, IconButton, Skeleton, Span } from '@chakra-ui/react';
import { ThemeProvider, useTheme } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';
import * as React from 'react';
import { LuMoon, LuMoonStar, LuSun } from 'react-icons/lu';

import {
  COLOR_MODES,
  getNextColorMode,
  normalizeColorMode,
  type ColorMode,
} from './color-mode-utils';

export type ColorModeProviderProps = ThemeProviderProps;
export type { ColorMode };

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

type ColorModeButtonProps = Omit<IconButtonProps, 'aria-label'> & {
  ref?: React.Ref<HTMLButtonElement>;
};
type ModeSpanProps = SpanProps & {
  ref?: React.Ref<HTMLSpanElement>;
};
const createModeElement = React.createElement as unknown as (
  type: React.ElementType,
  props: Record<string, unknown>,
) => React.ReactElement;

function renderModeSpan(
  className: string,
  colorScheme: 'light' | 'dark',
  props: SpanProps,
  ref: React.Ref<HTMLSpanElement> | undefined,
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

export function ColorModeButton(props: ColorModeButtonProps): React.ReactElement {
  const { ref, ...rest } = props;
  const { toggleColorMode } = useColorMode();
  return (
    <ClientOnly fallback={<Skeleton boxSize="8" />}>
      <IconButton
        onClick={toggleColorMode}
        variant="ghost"
        aria-label="Toggle color mode"
        size="sm"
        ref={ref}
        {...rest}
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
}

export function LightMode(props: ModeSpanProps): React.ReactElement {
  const { ref, ...rest } = props;
  return renderModeSpan('chakra-theme light', 'light', rest, ref);
}

export function DarkMode(props: ModeSpanProps): React.ReactElement {
  const { ref, ...rest } = props;
  return renderModeSpan('chakra-theme dark', 'dark', rest, ref);
}
