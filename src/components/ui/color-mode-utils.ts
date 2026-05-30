export type ColorMode = 'light' | 'dark' | 'night';

export const COLOR_MODES = ['light', 'dark', 'night'] as const satisfies readonly ColorMode[];

export function getNextColorMode(colorMode: ColorMode): ColorMode {
  const currentIndex = COLOR_MODES.indexOf(colorMode);
  return COLOR_MODES[(currentIndex + 1) % COLOR_MODES.length] ?? 'light';
}

export function normalizeColorMode(theme: string | undefined): ColorMode {
  return COLOR_MODES.includes(theme as ColorMode) ? (theme as ColorMode) : 'dark';
}
