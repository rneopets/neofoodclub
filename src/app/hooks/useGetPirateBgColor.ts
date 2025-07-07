import { useCallback } from 'react';

import { useTableColors } from '../util';

export const useGetPirateBgColor = (): ((odds: number) => string) => {
  const colors = useTableColors();

  return useCallback(
    (odds: number): string => {
      if ([3, 4, 5].includes(odds)) {
        return colors.blue;
      }
      if ([6, 7, 8, 9].includes(odds)) {
        return colors.orange;
      }
      if ([10, 11, 12, 13].includes(odds)) {
        return colors.red;
      }
      return colors.green;
    },
    [colors],
  );
};
