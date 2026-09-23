import { authRequest } from '@/services/apiClient';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useFinancialStore } from '@/store/financialStore';
import { useSharedStore } from '@/store/sharedStore';
import { useSyncStore } from '@/store/syncStore';
import type { FinancialSnapshot } from '@/types/domain';
import type { Settlement, SharedExpense, SharedGroup } from '@/types/shared';

/**
 * Offline-first cloud sync of the user's data as ONE versioned document.
 * The app always writes locally first; this module mirrors it to the server:
 *  - pull on sign-in / app foreground, push ~2.5 s after local edits;
 *  - server version mismatch (409) → the most recent edit wins, and when the
 *    other device wins the user is told. Nothing is merged field by field.
 * Figures are never computed server-side: the document is stored as-is (§38).
 */

export const SYNC_SCHEMA = 1;

export type SyncData = {
  schema: number;
  financial: FinancialSnapshot;
  shared: { groups: SharedGroup[]; expenses: SharedExpense[]; settlements: Settlement[] };
  app: {
    onboarded: boolean;
    mode: 'empty' | 'demo' | 'real';
    name: string;
    completedSteps: string[];
    claimedMissions: string[];
    stepsDismissed: boolean;
  };
};

type ServerDoc = { version: number; clientUpdatedAt: string; data: SyncData };

const PUSH_DELAY_MS = 2500;
const OTHER_DEVICE_NOTICE = 'Actualizamos tus datos con cambios más recientes de otro dispositivo.';

let applying = false;
let running: Promise<void> | null = null;
let again = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function collectData(): SyncData {
  const app = useAppStore.getState();
  const shared = useSharedStore.getState();
  return {
    schema: SYNC_SCHEMA,
    financial: useFinancialStore.getState().snapshot,
    shared: { groups: shared.groups, expenses: shared.expenses, settlements: shared.settlements },
    app: {
      onboarded: app.onboarded,
      mode: app.mode,
      name: app.name,
      completedSteps: app.completedSteps,
      claimedMissions: app.claimedMissions,
      stepsDismissed: app.stepsDismissed,
    },
  };
}

/** Replaces local data with the server copy without marking it as a local edit. */
export function applyData(data: SyncData) {
  if (!data || data.schema !== SYNC_SCHEMA || !data.financial) return;
  applying = true;
  try {
    useFinancialStore.getState().setSnapshot(data.financial);
    useSharedStore.setState({ groups: data.shared?.groups ?? [], expenses: data.shared?.expenses ?? [], settlements: data.shared?.settlements ?? [] });
    useAppStore.setState({ ...data.app, completedSteps: data.app.completedSteps as never, mode: data.app.mode });
  } finally {
    applying = false;
  }
}

function resetLocalData() {
  applying = true;
  try {
    useFinancialStore.getState().reset();
    useSharedStore.getState().reset();
    useAppStore.getState().resetOnboarding();
  } finally {
    applying = false;
  }
}

/** Erases every financial/progress record on this device (account deletion, full reset). */
export function wipeLocalData() {
  resetLocalData();
  useSyncStore.getState().resetFor(null);
}

const hasLocalData = () => {
  const s = useFinancialStore.getState().snapshot;
  return useAppStore.getState().onboarded || s.transactions.length > 0 || s.goals.length > 0 || s.currentBalance.minor !== 0;
};

const isCloudSession = () => {
  const auth = useAuthStore.getState();
  return auth.authenticated && !!auth.account?.serverId;
};

/** Local edit newer than the server's copy? */
const localWins = (serverClientUpdatedAt: string) => {
  const local = useSyncStore.getState().localUpdatedAt;
  return local != null && new Date(local).getTime() > new Date(serverClientUpdatedAt).getTime();
};

async function push(baseVersion: number, allowRetry = true): Promise<void> {
  const sync = useSyncStore.getState();
  const editedAt = sync.localUpdatedAt ?? new Date().toISOString();
  const result = await authRequest<{ version: number }>('PUT', '/api/sync', { baseVersion, clientUpdatedAt: editedAt, data: collectData() });

  if (result.ok) {
    // Edits made while the request was in flight stay dirty for the next push.
    const stillSame = useSyncStore.getState().localUpdatedAt === sync.localUpdatedAt;
    useSyncStore.setState({ version: result.data.version, dirty: !stillSame, lastSyncedAt: new Date().toISOString(), status: 'idle' });
    return;
  }
  if (result.status === 409 && allowRetry && result.data) {
    await resolveAgainst(result.data as ServerDoc, false);
    return;
  }
  useSyncStore.setState({ status: result.offline ? 'offline' : 'error' });
}

/** The server has a different version than ours: decide who wins. */
async function resolveAgainst(doc: ServerDoc, allowRetry: boolean) {
  const { dirty } = useSyncStore.getState();
  if (dirty && localWins(doc.clientUpdatedAt)) {
    await push(doc.version, allowRetry);
    return;
  }
  applyData(doc.data);
  useSyncStore.setState({
    version: doc.version,
    dirty: false,
    lastSyncedAt: new Date().toISOString(),
    status: 'idle',
    notice: dirty ? OTHER_DEVICE_NOTICE : null,
  });
}

async function runOnce(): Promise<void> {
  if (!isCloudSession()) return;
  useSyncStore.setState({ status: 'syncing' });
  const pulled = await authRequest<ServerDoc>('GET', '/api/sync');
  if (!pulled.ok) {
    useSyncStore.setState({ status: pulled.offline ? 'offline' : 'error' });
    return;
  }
  const sync = useSyncStore.getState();
  if (pulled.status === 204 || !pulled.data) {
    // Nothing in the cloud yet: upload what this device has (e.g. just activated).
    if (hasLocalData()) {
      if (!sync.localUpdatedAt) useSyncStore.getState().markDirty();
      await push(0);
    } else {
      useSyncStore.setState({ status: 'idle', lastSyncedAt: new Date().toISOString() });
    }
    return;
  }
  if (pulled.data.version === sync.version) {
    if (sync.dirty) await push(sync.version);
    else useSyncStore.setState({ status: 'idle', lastSyncedAt: new Date().toISOString() });
    return;
  }
  await resolveAgainst(pulled.data, true);
}

/** Pull + push now. Concurrent calls coalesce into one extra run. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await runOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

/**
 * After a successful sign-in. Data on this device belongs to one cloud user:
 * a different user starts clean (then gets their own copy from the server);
 * activating a legacy device account keeps its data and uploads it.
 */
export async function onSignedIn(userId: string, options: { keepLocalData?: boolean } = {}) {
  const sync = useSyncStore.getState();
  if (sync.ownerId !== userId) {
    const adopt = options.keepLocalData || (sync.ownerId == null && !hasLocalData());
    if (!adopt) resetLocalData();
    sync.resetFor(userId);
    if (options.keepLocalData && hasLocalData()) useSyncStore.getState().markDirty();
  }
  await syncNow();
}

/** Watches local stores and schedules a push after edits. Returns an unsubscribe. */
export function startSyncWatcher(): () => void {
  const schedule = () => {
    if (applying || !isCloudSession()) return;
    useSyncStore.getState().markDirty();
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      void syncNow();
    }, PUSH_DELAY_MS);
  };
  const unsubscribers = [
    useFinancialStore.subscribe((state, prev) => { if (state.snapshot !== prev.snapshot) schedule(); }),
    useSharedStore.subscribe((state, prev) => {
      if (state.groups !== prev.groups || state.expenses !== prev.expenses || state.settlements !== prev.settlements) schedule();
    }),
    useAppStore.subscribe((state, prev) => {
      if (state.onboarded !== prev.onboarded || state.mode !== prev.mode || state.name !== prev.name
        || state.completedSteps !== prev.completedSteps || state.claimedMissions !== prev.claimedMissions
        || state.stepsDismissed !== prev.stepsDismissed) schedule();
    }),
  ];
  return () => {
    unsubscribers.forEach((off) => off());
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = null;
  };
}

/** Test hook. */
export function __resetSyncForTests() {
  applying = false;
  running = null;
  again = false;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
}
