import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** How the current data was seeded. */
export type AppMode = 'empty' | 'demo' | 'real';

/** First-run guided steps the user can complete (§26/§33). */
export type FirstStepId = 'transaction' | 'goal' | 'ask-ai' | 'review';

export type ThemePreference = 'light' | 'dark' | 'system';

type AppState = {
  onboarded: boolean;
  mode: AppMode;
  name: string;
  hapticsEnabled: boolean;
  themePreference: ThemePreference;
  completedSteps: FirstStepId[];
  claimedMissions: string[];
  stepsDismissed: boolean;
  hydrated: boolean;

  completeOnboarding: (mode: AppMode, name: string) => void;
  setName: (name: string) => void;
  resetOnboarding: () => void;
  setHaptics: (v: boolean) => void;
  setThemePreference: (p: ThemePreference) => void;
  completeStep: (id: FirstStepId) => void;
  claimMission: (id: string) => void;
  dismissSteps: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboarded: false,
      mode: 'empty',
      name: '',
      hapticsEnabled: true,
      themePreference: 'light',
      completedSteps: [],
      claimedMissions: [],
      stepsDismissed: false,
      hydrated: false,

      completeOnboarding: (mode, name) => set({ onboarded: true, mode, name }),
      setName: (name) => set({ name: name.trim() }),
      resetOnboarding: () =>
        set({ onboarded: false, mode: 'empty', name: '', completedSteps: [], claimedMissions: [], stepsDismissed: false }),
      setHaptics: (v) => set({ hapticsEnabled: v }),
      setThemePreference: (p) => set({ themePreference: p }),
      completeStep: (id) =>
        set((state) =>
          state.completedSteps.includes(id)
            ? state
            : { completedSteps: [...state.completedSteps, id] },
        ),
      claimMission: (id) =>
        set((state) =>
          state.claimedMissions.includes(id)
            ? state
            : { claimedMissions: [...state.claimedMissions, id] },
        ),
      dismissSteps: () => set({ stepsDismissed: true }),
    }),
    {
      name: 'alcancia-app',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<AppState>;
        return {
          ...state,
          themePreference: version < 2 ? 'light' : (state.themePreference ?? 'light'),
        } as AppState;
      },
    },
  ),
);

// Mutating state inside onRehydrateStorage would not notify subscribers, which
// can leave the splash gate stuck; setState is the only way to re-render.
useAppStore.persist.onFinishHydration(() => {
  useAppStore.setState({ hydrated: true });
});
