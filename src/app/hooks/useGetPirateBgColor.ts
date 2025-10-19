import { useCallback } from 'react';

export const useGetPirateBgColor = (): ((odds: number) => string) =>
  useCallback((odds: number): string => {
    if ([3, 4, 5].includes(odds)) {
      return 'blue';
    }
    if ([6, 7, 8, 9].includes(odds)) {
      return 'orange';
    }
    if ([10, 11, 12, 13].includes(odds)) {
      return 'red';
    }
    return 'green';
  }, []);
