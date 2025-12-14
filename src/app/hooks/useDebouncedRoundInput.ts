import { useEffect, useRef } from 'react';

/**
 * Custom hook for debouncing round input that cancels pending debounces
 * when the round changes externally (not from user input).
 *
 * @param value - The current input value
 * @param externalValue - The value from external source (e.g., store)
 * @param delay - Debounce delay in milliseconds
 * @param onDebouncedChange - Callback when debounced value changes (only for user input)
 */
export function useDebouncedRoundInput<T>(
  value: T,
  externalValue: T,
  delay: number,
  onDebouncedChange: (debouncedValue: T) => void,
): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastExternalValueRef = useRef<T>(externalValue);
  const isExternalUpdateRef = useRef<boolean>(false);
  const callbackRef = useRef(onDebouncedChange);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  // Track external value changes and cancel pending debounce
  useEffect(() => {
    if (lastExternalValueRef.current !== externalValue) {
      // External value changed - cancel pending debounce
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      lastExternalValueRef.current = externalValue;
      // Mark as external update - will be reset in the debounce effect cleanup
      isExternalUpdateRef.current = true;
    }
  }, [externalValue]);

  // Debounce user input changes
  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset external update flag when user input changes (new debounce cycle)
    if (isExternalUpdateRef.current) {
      isExternalUpdateRef.current = false;
    }

    // Set new debounce timeout
    timeoutRef.current = setTimeout(() => {
      // Only call callback if this is user input, not external update
      if (!isExternalUpdateRef.current) {
        // Double-check external value hasn't changed during debounce
        if (lastExternalValueRef.current === externalValue) {
          callbackRef.current(value);
        }
      }
      timeoutRef.current = null;
    }, delay);

    return (): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delay, externalValue]);
}
