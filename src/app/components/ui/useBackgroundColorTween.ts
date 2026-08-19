import { oklab, rgb, formatRgb, type Oklab } from 'culori';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { useIsStillSettling } from '../../hooks/useIsStillSettling';

import { useTween } from './useTween';

const TRANSPARENT: Oklab = { mode: 'oklab', l: 0, a: 0, b: 0, alpha: 0 };

// Safety net so a colorKey that can genuinely never resolve (e.g. a typo'd
// token that has no CSS custom property at all) doesn't retry forever.
// Time-based rather than a frame count, since a backgrounded/throttled tab
// can take far longer than usual to accumulate a handful of animation
// frames even though resolution would otherwise succeed almost instantly.
const MAX_RESOLVE_MS = 10_000;

// Returns null (instead of a color) when colorKey is set but the backing CSS
// custom property can't be read/parsed yet, so callers can tell "off" apart
// from "not ready yet" and retry only the latter.
const resolveSubtleColor = (colorKey: string | undefined): Oklab | null => {
  if (!colorKey) {
    return TRANSPARENT;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(`--chakra-colors-${colorKey}-subtle`);
  return oklab(raw) ?? null;
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
  const [target, setTarget] = useState(() => resolveSubtleColor(colorKey) ?? TRANSPARENT);
  // Whether we've ever successfully resolved a real color for this hook
  // instance. Until then, any correction is establishing the initial state
  // (not a visible transition) and should snap instead of animating -
  // otherwise every cell would visibly fade in from transparent once its
  // CSS custom property finally resolves.
  const [cssResolveInstant, setCssResolveInstant] = useState(true);
  const hasResolvedOnceRef = useRef(false);
  // colorKey itself can be driven by calculation-derived data (e.g.
  // pirateWon, from state.calculations.winningBetBinary) that starts
  // empty/wrong and only becomes real once the round store's first
  // calculation completes - a moment separate from (and later than) the
  // CSS resolution above. Without this, that transition would animate
  // like a genuine mid-session change (e.g. a pirate winning) instead of
  // snapping like the rest of the initial load.
  const isStillSettling = useIsStillSettling();

  useEffect(() => {
    // The CSS custom property backing this color can still be unset on the
    // very first read - its stylesheet insertion isn't guaranteed to have
    // run before this effect does. colorKey often never changes again after
    // mount (e.g. a pirate that's been in the default tier the whole time),
    // so a single re-read on mount isn't enough: keep retrying on successive
    // frames until it actually resolves, instead of getting stuck on one bad
    // read forever.
    let frame: number | null = null;
    const start = window.performance.now();

    const tryResolve = (): void => {
      const resolved = resolveSubtleColor(colorKey);
      if (resolved) {
        setCssResolveInstant(!hasResolvedOnceRef.current);
        hasResolvedOnceRef.current = true;
        setTarget(resolved);
        return;
      }
      if (window.performance.now() - start < MAX_RESOLVE_MS) {
        frame = window.requestAnimationFrame(tryResolve);
      }
    };

    tryResolve();

    return (): void => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [colorKey]);

  const displayed = useTween(target, {
    durationMs,
    interpolate: lerpOklab,
    isEqual: oklabEqual,
    instant: cssResolveInstant || isStillSettling,
  });
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
