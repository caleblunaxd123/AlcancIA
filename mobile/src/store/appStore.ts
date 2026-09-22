import { create } from 'zustand';

type AppState = {
  onboarded: boolean;
  hapticsEnabled: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setHaptics: (v: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  onboarded: false,
  hapticsEnabled: true,
  completeOnboarding: () => set({ onboarded: true }),
  resetOnboarding: () => set({ onboarded: false }),
  setHaptics: (v) => set({ hapticsEnabled: v }),
}));
