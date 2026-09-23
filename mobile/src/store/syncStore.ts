import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

/**
 * Bookkeeping for cloud sync (no financial data here). `ownerId` is the cloud
 * user whose data is on this device: another user signing in never sees it.
 */
type SyncState = {
  ownerId: string | null;
  /** Server version this device last matched. 0 = never synced. */
  version: number;
  /** Local changes not yet accepted by the server. */
  dirty: boolean;
  /** When the user last changed something here (drives "most recent wins"). */
  localUpdatedAt: string | null;
  lastSyncedAt: string | null;
  status: SyncStatus;
  /** One-off message for the UI, e.g. changes arrived from another device. */
  notice: string | null;
  hydrated: boolean;
  markDirty: (at?: Date) => void;
  clearNotice: () => void;
  resetFor: (ownerId: string | null) => void;
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      ownerId: null,
      version: 0,
      dirty: false,
      localUpdatedAt: null,
      lastSyncedAt: null,
      status: 'idle',
      notice: null,
      hydrated: false,
      markDirty: (at = new Date()) => set({ dirty: true, localUpdatedAt: at.toISOString() }),
      clearNotice: () => set({ notice: null }),
      resetFor: (ownerId) =>
        set({ ownerId, version: 0, dirty: false, localUpdatedAt: null, lastSyncedAt: null, status: 'idle', notice: null }),
    }),
    {
      name: 'alcancia-sync',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: ({ ownerId, version, dirty, localUpdatedAt, lastSyncedAt }) => ({ ownerId, version, dirty, localUpdatedAt, lastSyncedAt }),
    },
  ),
);

useSyncStore.persist.onFinishHydration(() => useSyncStore.setState({ hydrated: true }));
