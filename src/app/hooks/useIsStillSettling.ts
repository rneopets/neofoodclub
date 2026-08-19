import { useEffect } from 'react';

import { useIsCalculated } from '../stores';

// True until the round store's calculations have completed at least once,
// then permanently false - used to snap animated values/colors into place
// instead of tweening them while the app is still settling into its first
// real data (arena ratios, winningBetBinary-derived colors, etc. all start
// empty/undefined and only become trustworthy once calculated flips true).
// Returns whether calculations were *still incomplete before this render*,
// so the render where calculated first flips true is itself still treated
// as settling rather than a genuine change worth animating.
//
// Module-level (not a per-component ref): a row that unmounts and remounts
// later - e.g. a different pirate occupying the same table slot on a round
// switch - must still see the app as already settled, or its very first
// post-remount value would wrongly snap instead of animate. The latch is
// only ever written from an effect (never during render) to stay a pure
// read from the component's point of view.
let appHasEverCalculated = false;

export function useIsStillSettling(): boolean {
  const calculated = useIsCalculated();
  const wasStillSettling = !appHasEverCalculated;

  useEffect(() => {
    if (calculated) {
      appHasEverCalculated = true;
    }
  }, [calculated]);

  return wasStillSettling;
}

// Test-only: the module-level latch above is intentionally never reset in
// the running app, but tests need a clean slate between cases.
export function __resetIsStillSettlingForTests(): void {
  appHasEverCalculated = false;
}
