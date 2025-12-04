import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook that manages scroll position restoration for a scrollable container
 * @param shouldRestore - Whether to restore scroll position (typically based on view state)
 * @param containerRef - Ref to the scrollable container
 * @returns A function to save the current scroll position
 */
export function useScrollPosition(
  shouldRestore: boolean,
  containerRef: React.RefObject<HTMLDivElement | null>,
): () => void {
  const savedScrollPosition = useRef<number>(0);

  // Save scroll position before navigating away
  const saveScrollPosition = useCallback((): void => {
    if (containerRef.current) {
      savedScrollPosition.current = containerRef.current.scrollTop;
    }
  }, [containerRef]);

  // Restore scroll position when returning to view
  useEffect(() => {
    if (
      shouldRestore &&
      savedScrollPosition.current > 0 &&
      containerRef.current
    ) {
      // Use setTimeout to ensure the content is rendered before scrolling
      const timeoutId = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = savedScrollPosition.current;
        }
      }, 0);
      return (): void => {
        clearTimeout(timeoutId);
      };
    }
    return undefined;
  }, [shouldRestore, containerRef]);

  return saveScrollPosition;
}
