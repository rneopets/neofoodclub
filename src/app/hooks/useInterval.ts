import { useEffect, useRef } from 'react';

/**
 * Hook that sets up an interval that can be paused
 * @param callback - Function to call on each interval
 * @param delay - Delay in milliseconds (null to pause)
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef<() => void>(callback);

  // Set up the interval
  useEffect(() => {
    function tick(): void {
      savedCallback.current?.();
    }

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return (): void => clearInterval(id);
    }
    return undefined;
  }, [delay]);
}
