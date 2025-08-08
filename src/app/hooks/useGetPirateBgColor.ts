import { useCallback } from 'react';

import { useBgColors } from './useBgColors';

export const useGetPirateBgColor = (): ((odds: number) => string) => {
  const bgColors = useBgColors();

  return useCallback(
    (odds: number): string => {
      if ([3, 4, 5].includes(odds)) {
        return bgColors.pirateStandard; // blue.subtle
      }
      if ([6, 7, 8, 9].includes(odds)) {
        return bgColors.pirateRisky; // orange.subtle
      }
      if ([10, 11, 12, 13].includes(odds)) {
        return bgColors.pirateUnsafe; // red.subtle
      }
      return bgColors.pirateSafe; // green.subtle
    },
    [bgColors],
  );
};
