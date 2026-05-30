import { useState, useCallback, useMemo } from 'react';

type ViewState = 'overall' | 'arena' | 'pirate';

interface UseTimelineViewStateProps {
  initialArenaId: number | null;
  initialPirateIndex: number | null;
}

interface UseTimelineViewStateReturn {
  view: ViewState;
  selectedArena: number | null;
  selectedPirate: { arenaId: number; pirateIndex: number } | null;
  handleArenaClick: (arenaId: number) => void;
  handlePirateClick: (arenaId: number, pirateIndex: number) => void;
  handleBackToOverall: () => void;
  handleBackToArena: (arenaId: number) => void;
}

/**
 * Hook that manages timeline view state and navigation
 */
export function useTimelineViewState({
  initialArenaId,
  initialPirateIndex,
}: UseTimelineViewStateProps): UseTimelineViewStateReturn {
  // Determine initial view based on props
  const getInitialView = useCallback((): ViewState => {
    if (initialArenaId !== null && initialPirateIndex !== null) {
      return 'pirate';
    }
    if (initialArenaId !== null) {
      return 'arena';
    }
    return 'overall';
  }, [initialArenaId, initialPirateIndex]);

  const [view, setView] = useState<ViewState>(getInitialView);
  const [selectedArena, setSelectedArena] = useState<number | null>(initialArenaId);
  const [selectedPirate, setSelectedPirate] = useState<{
    arenaId: number;
    pirateIndex: number;
  } | null>(
    useMemo(
      () =>
        initialArenaId !== null && initialPirateIndex !== null
          ? { arenaId: initialArenaId, pirateIndex: initialPirateIndex }
          : null,
      [initialArenaId, initialPirateIndex],
    ),
  );

  const handleArenaClick = useCallback((arenaId: number) => {
    setSelectedArena(arenaId);
    setView('arena');
  }, []);

  const handlePirateClick = useCallback((arenaId: number, pirateIndex: number) => {
    setSelectedArena(arenaId);
    setSelectedPirate({ arenaId, pirateIndex });
    setView('pirate');
  }, []);

  const handleBackToOverall = useCallback(() => {
    setView('overall');
  }, []);

  const handleBackToArena = useCallback((arenaId: number) => {
    setSelectedArena(arenaId);
    setView('arena');
  }, []);

  return {
    view,
    selectedArena,
    selectedPirate,
    handleArenaClick,
    handlePirateClick,
    handleBackToOverall,
    handleBackToArena,
  };
}
