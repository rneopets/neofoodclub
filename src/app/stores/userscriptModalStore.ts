import { create } from 'zustand';

interface UserscriptModalStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

// shared by the top banner and the footer link, which both open the same modal
export const useUserscriptModalStore = create<UserscriptModalStore>(set => ({
  isOpen: false,
  open: (): void => set({ isOpen: true }),
  close: (): void => set({ isOpen: false }),
}));
