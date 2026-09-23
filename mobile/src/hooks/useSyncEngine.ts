import { useEffect } from 'react';
import { AppState } from 'react-native';

import { setSessionLostHandler } from '@/services/apiClient';
import { startSyncWatcher, syncNow } from '@/services/sync';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

const RETRY_MS = 60_000;

/**
 * Runs cloud sync for the whole app once stores are hydrated: watches local
 * edits, syncs on start and whenever the app returns to the foreground, and
 * retries pending changes every minute (e.g. after being offline).
 */
export function useSyncEngine(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    setSessionLostHandler(() => useAuthStore.getState().sessionLost());
    const stopWatching = startSyncWatcher();
    void syncNow();

    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    const retry = setInterval(() => {
      if (useSyncStore.getState().dirty) void syncNow();
    }, RETRY_MS);

    return () => {
      stopWatching();
      foreground.remove();
      clearInterval(retry);
      setSessionLostHandler(null);
    };
  }, [ready]);
}
