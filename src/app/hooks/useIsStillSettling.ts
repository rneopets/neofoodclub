import { useRef } from 'react';

import { useIsCalculated } from '../stores';

// True until the round store's calculations have completed at least once,
// then permanently false - used to snap animated values/colors into place
// instead of tweening them while the app is still settling into its first
// real data (arena ratios, winningBetBinary-derived colors, etc. all start
// empty/undefined and only become trustworthy once calculated flips true).
// Returns whether calculations were *still incomplete before this render*,
// so the render where calculated first flips true is itself still treated
// as settling rather than a genuine change worth animating.
export function useIsStillSettling(): boolean {
  const calculated = useIsCalculated();
  const hasEverCalculatedRef = useRef(false);
  const wasStillSettling = !hasEverCalculatedRef.current;
  if (calculated) {
    hasEverCalculatedRef.current = true;
  }
  return wasStillSettling;
}
