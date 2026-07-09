import { act, renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useTimelineViewState } from '../useTimelineViewState';

describe('useTimelineViewState', () => {
  it('starts on the "overall" view when neither initial arena nor pirate is set', () => {
    const { result } = renderHook(() =>
      useTimelineViewState({ initialArenaId: null, initialPirateIndex: null }),
    );

    expect(result.current.view).toBe('overall');
    expect(result.current.selectedArena).toBeNull();
    expect(result.current.selectedPirate).toBeNull();
  });

  it('starts on the "arena" view when only an initial arena is set', () => {
    const { result } = renderHook(() =>
      useTimelineViewState({ initialArenaId: 2, initialPirateIndex: null }),
    );

    expect(result.current.view).toBe('arena');
    expect(result.current.selectedArena).toBe(2);
    expect(result.current.selectedPirate).toBeNull();
  });

  it('starts on the "pirate" view when both initial arena and pirate are set', () => {
    const { result } = renderHook(() =>
      useTimelineViewState({ initialArenaId: 1, initialPirateIndex: 3 }),
    );

    expect(result.current.view).toBe('pirate');
    expect(result.current.selectedArena).toBe(1);
    expect(result.current.selectedPirate).toEqual({ arenaId: 1, pirateIndex: 3 });
  });

  it('handleArenaClick moves to the "arena" view and sets the selected arena', () => {
    const { result } = renderHook(() =>
      useTimelineViewState({ initialArenaId: null, initialPirateIndex: null }),
    );

    act(() => {
      result.current.handleArenaClick(4);
    });

    expect(result.current.view).toBe('arena');
    expect(result.current.selectedArena).toBe(4);
  });

  it('handlePirateClick moves to the "pirate" view and sets arena + pirate', () => {
    const { result } = renderHook(() =>
      useTimelineViewState({ initialArenaId: null, initialPirateIndex: null }),
    );

    act(() => {
      result.current.handlePirateClick(0, 2);
    });

    expect(result.current.view).toBe('pirate');
    expect(result.current.selectedArena).toBe(0);
    expect(result.current.selectedPirate).toEqual({ arenaId: 0, pirateIndex: 2 });
  });

  it('handleBackToOverall moves back to the "overall" view without clearing selection', () => {
    const { result } = renderHook(() =>
      useTimelineViewState({ initialArenaId: 1, initialPirateIndex: 3 }),
    );

    act(() => {
      result.current.handleBackToOverall();
    });

    expect(result.current.view).toBe('overall');
    // handleBackToOverall only changes `view`; selectedArena/selectedPirate are left as-is.
    expect(result.current.selectedArena).toBe(1);
    expect(result.current.selectedPirate).toEqual({ arenaId: 1, pirateIndex: 3 });
  });

  it('handleBackToArena moves back to the "arena" view and updates the selected arena', () => {
    const { result } = renderHook(() =>
      useTimelineViewState({ initialArenaId: 1, initialPirateIndex: 3 }),
    );

    act(() => {
      result.current.handleBackToArena(2);
    });

    expect(result.current.view).toBe('arena');
    expect(result.current.selectedArena).toBe(2);
  });

  it('supports a full navigation cycle: overall -> arena -> pirate -> arena -> overall', () => {
    const { result } = renderHook(() =>
      useTimelineViewState({ initialArenaId: null, initialPirateIndex: null }),
    );

    expect(result.current.view).toBe('overall');

    act(() => {
      result.current.handleArenaClick(0);
    });
    expect(result.current.view).toBe('arena');

    act(() => {
      result.current.handlePirateClick(0, 1);
    });
    expect(result.current.view).toBe('pirate');

    act(() => {
      result.current.handleBackToArena(0);
    });
    expect(result.current.view).toBe('arena');

    act(() => {
      result.current.handleBackToOverall();
    });
    expect(result.current.view).toBe('overall');
  });
});
