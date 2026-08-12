import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useDisclosureState } from '../useDisclosureState';

describe('useDisclosureState', () => {
  it('defaults isOpen to false', () => {
    const { result } = renderHook(() => useDisclosureState());

    expect(result.current.isOpen).toBe(false);
  });

  it('defaults isOpen to true when defaultIsOpen is passed', () => {
    const { result } = renderHook(() => useDisclosureState(true));

    expect(result.current.isOpen).toBe(true);
  });

  it('onOpen sets isOpen to true', () => {
    const { result } = renderHook(() => useDisclosureState());

    act(() => {
      result.current.onOpen();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('onClose sets isOpen to false', () => {
    const { result } = renderHook(() => useDisclosureState(true));

    act(() => {
      result.current.onClose();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('onToggle flips isOpen from false to true and back', () => {
    const { result } = renderHook(() => useDisclosureState());

    act(() => {
      result.current.onToggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.onToggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('setOpen sets isOpen to the provided boolean value', () => {
    const { result } = renderHook(() => useDisclosureState());

    act(() => {
      result.current.setOpen(true);
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.setOpen(false);
    });
    expect(result.current.isOpen).toBe(false);
  });
});
