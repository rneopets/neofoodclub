import React, { useEffect, useRef, useState } from 'react';

// this element displays a number that smoothly tweens (counts) from its
// previous value to a new one whenever the value changes, using an
// ease-out-cubic requestAnimationFrame loop. The animation is interruptible:
// if a new value arrives mid-tween, it retargets from the currently displayed
// value so rapid successive updates (e.g. odds changing every poll) stay smooth.

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  durationMs?: number;
  className?: string;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const AnimatedNumber = React.memo(
  ({ value, format, durationMs = 400, className }: AnimatedNumberProps): React.ReactElement => {
    const [displayed, setDisplayed] = useState(value);
    const displayedRef = useRef(value);
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

      if (prefersReducedMotion || value === from || durationMs <= 0) {
        displayedRef.current = value;
        setDisplayed(value);
        return;
      }

      const start = window.performance.now();

      const tick = (now: number): void => {
        const t = Math.min(1, (now - start) / durationMs);
        const next = from + (value - from) * easeOutCubic(t);
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
    }, [value, durationMs]);

    const formatter = format ?? ((v: number): string => v.toLocaleString());

    return (
      <span className={className} aria-label={formatter(value)}>
        {formatter(displayed)}
      </span>
    );
  },
);

AnimatedNumber.displayName = 'AnimatedNumber';

export default AnimatedNumber;
