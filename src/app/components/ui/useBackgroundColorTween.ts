import { oklab, rgb, formatRgb, type Oklab } from 'culori';
import { useEffect, useState, type CSSProperties } from 'react';

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

// Animates a cell's background color in JS (same tween mechanics as
// AnimatedNumber) instead of a CSS transition, which proved unreliable.
// Interpolates in OKLab so e.g. nfc-green <-> nfc-red doesn't pass through
// a muddy midpoint the way a raw RGB lerp would.
export function useBackgroundColorTween(colorKey: string | undefined, durationMs = 600): string {
  // Lazy-initialized in case the CSS vars aren't applied yet on the very
  // first render; the effect below re-resolves post-paint (it also runs
  // once right after mount, not just on colorKey changes), correcting that
  // initial read if needed.
  const [target, setTarget] = useState(() => resolveSubtleColor(colorKey));
  useEffect(() => {
    setTarget(resolveSubtleColor(colorKey));
  }, [colorKey]);

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
