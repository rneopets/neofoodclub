import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { useRoundDataStore } from './roundDataStore';

interface TimestampStore {
  timestamp?: string | undefined;
  lastChange?: string | undefined;

  // Actions
  updateTimestamps: () => void;
}

export const useTimestampStore = create<TimestampStore>()(
  subscribeWithSelector(set => ({
    timestamp: undefined,
    lastChange: undefined,

    updateTimestamps: (): void => {
      const roundState = useRoundDataStore.getState().roundState;
      set({
        timestamp: roundState.roundData.timestamp,
        lastChange: roundState.roundData.lastChange,
      });
    },
  })),
);

// Subscribe to changes in round data store
useRoundDataStore.subscribe(
  state => ({
    timestamp: state.roundState.roundData.timestamp,
    lastChange: state.roundState.roundData.lastChange,
  }),
  () => {
    useTimestampStore.getState().updateTimestamps();
  },
  { fireImmediately: true },
);
