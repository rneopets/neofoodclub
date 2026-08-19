import { oklab, rgb, formatRgb, type Oklab } from 'culori';
import { useMemo, type CSSProperties } from 'react';

import { useTween } from './useTween';

const resolveSubtleColor = (colorKey: string | undefined): Oklab => {
  if (!colorKey || typeof window === 'undefined') {
    return { mode: 'oklab', l: 0, a: 0, b: 0, alpha: 0 };
  }
  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(`--chakra-colors-${colorKey}-subtle`);
  return oklab(raw) ?? { mode: 'oklab', l: 0, a: 0, b: 0, alpha: 0 };
};

const lerpOklab = (from: Oklab, to: Oklab, t: number): Oklab => ({
  mode: 'oklab',
  l: (from.l ?? 0) + ((to.l ?? 0) - (from.l ?? 0)) * t,
  a: (from.a ?? 0) + ((to.a ?? 0) - (from.a ?? 0)) * t,
  b: (from.b ?? 0) + ((to.b ?? 0) - (from.b ?? 0)) * t,
  alpha: (from.alpha ?? 1) + ((to.alpha ?? 1) - (from.alpha ?? 1)) * t,
});

const oklabEqual = (x: Oklab, y: Oklab): boolean =>
  x.l === y.l && x.a === y.a && x.b === y.b && (x.alpha ?? 1) === (y.alpha ?? 1);

// Animates a cell's background color frame-by-frame in JS instead of via a
// CSS transition, which proved unreliable: cells could get stuck showing a
// stale color after a round switch even though the DOM's computed style was
// already correct (a browser repaint bug), and workarounds that forced a
// repaint afterward either didn't fix it consistently or introduced their
// own visible glitches. Reuses the same tween mechanics AnimatedNumber uses
// for numbers.
//
// Interpolates in OKLab (a perceptually-uniform color space) rather than raw
// sRGB - a plain RGB lerp between e.g. nfc-green and nfc-red (a direct
// win-to-loss flip on the same bet slot) passes through a muddy tan/khaki
// midpoint, since red and green are near-opposite on the RGB cube.
export function useBackgroundColorTween(colorKey: string | undefined, durationMs = 600): string {
  const target = useMemo(() => resolveSubtleColor(colorKey), [colorKey]);
  const displayed = useTween(target, { durationMs, interpolate: lerpOklab, isEqual: oklabEqual });
  return formatRgb(rgb(displayed));
}

// Cells using useBackgroundColorTween should also apply the "nfc-color-tween"
// className (see src/index.css) so the global td/th CSS transition doesn't
// also try to animate between each already-interpolated frame this sets.
export const fillColorStyle = (
  backgroundColor: string,
  colorKey: string | undefined,
): CSSProperties => ({
  backgroundColor,
  color: colorKey ? `var(--chakra-colors-${colorKey}-fg)` : 'inherit',
});
