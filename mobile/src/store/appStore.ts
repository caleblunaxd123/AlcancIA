import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** How the current data was seeded. */
export type AppMode = 'empty' | 'demo' | 'real';

/** First-run guided steps the user can complete (§26/§33). */
export type FirstStepId = 'transaction' | 'goal' | 'ask-ai' | 'review';

type AppState = {
  onboarded: boolean;
  mode: AppMode;
  name: string;
  hapticsEnabled: boolean;
  completedSteps: FirstStepId[];
  stepsDismissed: boolean;
  hydrated: boolean;

  completeOnboarding: (mode: AppMode, name: string) => void;
  resetOnboarding: () => void;
  setHaptics: (v: boolean) => void;
  completeStep: (id: FirstStepId) => void;
  dismissSteps: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboarded: false,
      mode: 'empty',
      name: '',
      hapticsEnabled: true,
      completedSteps: [],
      stepsDismissed: false,
      hydrated: false,

      completeOnboarding: (mode, name) => set({ onboarded: true, mode, name }),
      resetOnboarding: () =>
        set({ onboarded: false, mode: 'empty', name: '', completedSteps: [], stepsDismissed: false }),
      setHaptics: (v) => set({ hapticsEnabled: v }),
      completeStep: (id) =>
        set((state) =>
          state.completedSteps.includes(id)
            ? state
            : { completedSteps: [...state.completedSteps, id] },
        ),
      dismissSteps: () => set({ stepsDismissed: true }),
    }),
    {
      name: 'alcancia-app',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
