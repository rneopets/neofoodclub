import { useEffect, useRef, useState } from 'react';

// Tweens a value of any type from its previous value to a new one whenever
// the value changes, using an ease-out-cubic requestAnimationFrame loop.
// Interruptible: if a new value arrives mid-tween, it retargets from the
// currently displayed value so rapid successive updates stay smooth.
// `interpolate` and `isEqual` should be stable references (module-level
// functions, not inline arrow functions) since they're effect dependencies.

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

interface UseTweenOptions<T> {
  durationMs?: number;
  interpolate: (from: T, to: T, t: number) => T;
  isEqual: (a: T, b: T) => boolean;
  // When true for the render that produces a new `value`, that specific
  // update is applied immediately instead of animating - e.g. a caller
  // correcting a placeholder first reading to the real one shouldn't count
  // as a visible transition. Only gates that one update; later value
  // changes with instant=false animate normally.
  instant?: boolean;
  // Overrides the value this hook starts displaying at mount, instead of
  // `value` itself - lets a caller recover a previous reading (e.g. from
  // an external cache keyed by something more stable than this component
  // instance) so a fresh mount can animate from where a prior, unmounted
  // instance left off instead of snapping straight to `value`.
  initialValue?: T | undefined;
}

export function useTween<T>(
  value: T,
  { durationMs = 400, interpolate, isEqual, instant = false, initialValue }: UseTweenOptions<T>,
): T {
  const [displayed, setDisplayed] = useState(initialValue !== undefined ? initialValue : value);
  const displayedRef = useRef(displayed);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    displayedRef.current = displayed;
  });

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const from = displayedRef.current;

    if (prefersReducedMotion || isEqual(value, from) || durationMs <= 0 || instant) {
      displayedRef.current = value;
      setDisplayed(value);
      return;
    }

    const start = window.performance.now();

    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / durationMs);
      const next = interpolate(from, value, easeOutCubic(t));
      displayedRef.current = next;
      setDisplayed(next);
      if (t < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
        displayedRef.current = value;
        setDisplayed(value);
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return (): void => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value, durationMs, interpolate, isEqual, instant]);

  return displayed;
}
