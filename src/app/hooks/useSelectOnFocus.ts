import { useCallback } from 'react';

/**
 * Hook that returns a focus handler that selects all text in the input
 * @returns A focus event handler function
 */
export function useSelectOnFocus(): (e: React.FocusEvent<HTMLInputElement>) => void {
  return useCallback((e: React.FocusEvent<HTMLInputElement>): void => {
    e.target.select();
  }, []);
}
