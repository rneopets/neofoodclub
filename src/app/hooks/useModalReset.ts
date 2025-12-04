import { useEffect } from 'react';

/**
 * Hook that resets state when a modal opens
 * @param isOpen - Whether the modal is open
 * @param resetFn - Function to call when modal opens
 * @param dependencies - Additional dependencies to watch
 */
export function useModalReset(
  isOpen: boolean,
  resetFn: () => void,
  dependencies: unknown[] = [],
): void {
  useEffect(() => {
    if (isOpen) {
      resetFn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ...dependencies]);
}
