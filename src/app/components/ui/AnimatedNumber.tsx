import React, { useEffect } from 'react';

import { useIsStillSettling } from '../../hooks/useIsStillSettling';

import { useTween } from './useTween';

// this element displays a number that smoothly tweens (counts) from its
// previous value to a new one whenever the value changes. See useTween for
// the animation mechanics.

// Last displayed value per persistKey, surviving individual component
// unmounts (see the persistKey prop below).
const lastKnownValues = new Map<string, number>();

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  durationMs?: number;
  className?: string;
  // When provided, the tweened value is rounded to this many decimal places
  // before formatting each frame. Use precision={0} for integer quantities
  // (odds, payoffs, maxbets) so the count-up never flickers through decimals
  // and shifts layout.
  precision?: number;
  // Stable identifier (e.g. "arena0-pirate1-currentOdds") for values whose
  // owning row can unmount and remount at the same table position - a
  // different pirate occupying the same slot after a round switch, say.
  // Without this, a remounted instance has no previous value to animate
  // from and just snaps straight to the new one. With it, the instance
  // recovers whatever was last displayed under that key and animates from
  // there instead.
  persistKey?: string;
}

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;
const numbersEqual = (a: number, b: number): boolean => a === b;

const AnimatedNumber = React.memo(
  ({
    value,
    format,
    durationMs = 400,
    className,
    precision,
    persistKey,
  }: AnimatedNumberProps): React.ReactElement => {
    const isStillSettling = useIsStillSettling();
    const initialValue = persistKey ? lastKnownValues.get(persistKey) : undefined;
    const displayed = useTween(value, {
      durationMs,
      interpolate: lerp,
      isEqual: numbersEqual,
      instant: isStillSettling,
      initialValue,
    });

    useEffect(() => {
      if (persistKey) {
        lastKnownValues.set(persistKey, displayed);
      }
    }, [persistKey, displayed]);

    const formatter = format ?? ((v: number): string => v.toLocaleString());
    const formatValue = (v: number): string =>
      formatter(precision !== undefined ? Number(v.toFixed(precision)) : v);

    return (
      <span className={className} aria-label={formatValue(value)}>
        {formatValue(displayed)}
      </span>
    );
  },
);

AnimatedNumber.displayName = 'AnimatedNumber';

export default AnimatedNumber;
