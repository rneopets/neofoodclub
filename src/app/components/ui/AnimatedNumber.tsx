import React from 'react';

import { useTween } from './useTween';

// this element displays a number that smoothly tweens (counts) from its
// previous value to a new one whenever the value changes. See useTween for
// the animation mechanics.

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
  }: AnimatedNumberProps): React.ReactElement => {
    const displayed = useTween(value, { durationMs, interpolate: lerp, isEqual: numbersEqual });

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
