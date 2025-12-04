import { useState, useCallback } from 'react';

/**
 * Hook that manages disclosure state (open/close) for modals, drawers, etc.
 * Similar to Chakra UI's useDisclosure but simpler and more flexible
 * @param defaultIsOpen - Default open state
 * @returns Object with isOpen state and handlers
 */
export function useDisclosureState(
  defaultIsOpen = false,
): {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  setOpen: (isOpen: boolean) => void;
} {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);

  const onOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const onClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const onToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  return {
    isOpen,
    onOpen,
    onClose,
    onToggle,
    setOpen,
  };
}
