import { emptySnapshot } from '@/engine/onboarding';
import { __resetApiClientForTests } from '@/services/apiClient';
import { __resetSyncForTests, collectData, onSignedIn, startSyncWatcher, syncNow } from '@/services/sync';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useFinancialStore } from '@/store/financialStore';
import { useSharedStore } from '@/store/sharedStore';
import { useSyncStore } from '@/store/syncStore';
import { installFakeApi, type FakeApi } from '@/test/fakeApi';

let api: FakeApi;

const balance = () => useFinancialStore.getState().snapshot.currentBalance.minor;
const setBalance = (minor: number) => {
  const s = useFinancialStore.getState().snapshot;
  useFinancialStore.getState().setSnapshot({ ...s, currentBalance: { ...s.currentBalance, minor } });
};

async function signUp(email = 'ana@mail.com') {
  api.tickets.add(`register|${email}`);
  await useAuthStore.getState().register({ name: 'Ana', email, password: 'Ahorro2026', ticket: 'ticket-ok' });
  return useAuthStore.getState().account!.serverId!;
}

describe('cloud sync', () => {
  beforeEach(async () => {
    api = installFakeApi();
    __resetApiClientForTests();
    __resetSyncForTests();
    useAuthStore.setState({ account: null, authenticated: false });
    useFinancialStore.setState({ snapshot: emptySnapshot() });
    useSharedStore.getState().reset();
    useAppStore.getState().resetOnboarding();
    useSyncStore.getState().resetFor(null);
  });
  afterEach(() => api.restore());

  it('uploads this device’s data the first time and pulls it on another device', async () => {
    const userId = await signUp();
    await onSignedIn(userId);
    setBalance(150000);
    useAppStore.getState().completeOnboarding('real', 'Ana');
    useSyncStore.getState().markDirty();
    await syncNow();
    expect(api.docs.get(userId)?.version).toBe(1);
    expect(useSyncStore.getState().dirty).toBe(false);

    // "Another phone": empty local stores, same account.
    useFinancialStore.setState({ snapshot: emptySnapshot() });
    useAppStore.getState().resetOnboarding();
    useSyncStore.getState().resetFor(userId);
    await syncNow();
    expect(balance()).toBe(150000);
    expect(useAppStore.getState().onboarded).toBe(true);
  });

  it('a different user on the same phone never sees the previous user’s data', async () => {
    const ana = await signUp('ana@mail.com');
    await onSignedIn(ana);
    setBalance(999900);
    useSyncStore.getState().markDirty();
    await syncNow();
    await useAuthStore.getState().logout();

    const eva = await signUp('eva@mail.com');
    await onSignedIn(eva);
    expect(balance()).toBe(0);
    expect(useSyncStore.getState().ownerId).toBe(eva);
  });

  it('activating a legacy account keeps and uploads the data already on the phone', async () => {
    setBalance(42000);
    useAppStore.getState().completeOnboarding('real', 'Leo');
    const userId = await signUp('leo@mail.com');
    await onSignedIn(userId, { keepLocalData: true });
    expect(balance()).toBe(42000);
    expect((api.docs.get(userId)?.data as ReturnType<typeof collectData>).financial.currentBalance.minor).toBe(42000);
  });

  it('when another device saved later, its version wins and the user is told', async () => {
    const userId = await signUp();
    await onSignedIn(userId);
    setBalance(1000);
    useSyncStore.getState().markDirty(new Date('2026-09-23T10:00:00Z'));
    await syncNow(); // server v1

    // Offline edit here (10:05), meanwhile the other phone saves at 10:10.
    setBalance(2000);
    useSyncStore.getState().markDirty(new Date('2026-09-23T10:05:00Z'));
    const other = { ...collectData(), financial: { ...collectData().financial, currentBalance: { minor: 3000, currency: 'PEN' as const } } };
    api.writeFromOtherDevice(userId, other, '2026-09-23T10:10:00Z');

    await syncNow();
    expect(balance()).toBe(3000);
    expect(useSyncStore.getState().notice).toContain('otro dispositivo');
    expect(useSyncStore.getState().version).toBe(2);
  });

  it('when this device edited later, it overwrites the older server copy', async () => {
    const userId = await signUp();
    await onSignedIn(userId);
    setBalance(1000);
    useSyncStore.getState().markDirty(new Date('2026-09-23T10:00:00Z'));
    await syncNow();

    api.writeFromOtherDevice(userId, collectData(), '2026-09-23T10:01:00Z');
    setBalance(5000);
    useSyncStore.getState().markDirty(new Date('2026-09-23T10:30:00Z'));
    await syncNow();

    expect(balance()).toBe(5000);
    expect(api.docs.get(userId)?.version).toBe(3);
    expect(useSyncStore.getState().dirty).toBe(false);
  });

  it('keeps changes pending while offline and uploads them later', async () => {
    const userId = await signUp();
    await onSignedIn(userId);
    api.offline = true;
    setBalance(7000);
    useSyncStore.getState().markDirty();
    await syncNow();
    expect(useSyncStore.getState().status).toBe('offline');
    expect(useSyncStore.getState().dirty).toBe(true);

    api.offline = false;
    await syncNow();
    expect(useSyncStore.getState().dirty).toBe(false);
    expect((api.docs.get(userId)?.data as ReturnType<typeof collectData>).financial.currentBalance.minor).toBe(7000);
  });

  it('the watcher marks local edits dirty but not data applied from the server', async () => {
    jest.useFakeTimers();
    const userId = await signUp();
    await onSignedIn(userId);
    const stop = startSyncWatcher();
    try {
      useSyncStore.setState({ dirty: false });
      setBalance(123);
      expect(useSyncStore.getState().dirty).toBe(true);

      useSyncStore.setState({ dirty: false });
      api.writeFromOtherDevice(userId, collectData(), new Date(Date.now() + 1000).toISOString());
      jest.useRealTimers();
      await syncNow(); // applies server data
      expect(useSyncStore.getState().dirty).toBe(false);
    } finally {
      stop();
      jest.useRealTimers();
    }
  });
});
