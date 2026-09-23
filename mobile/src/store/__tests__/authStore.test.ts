import { __resetApiClientForTests, getRefreshToken, hasSession } from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import { installFakeApi, type FakeApi } from '@/test/fakeApi';

let api: FakeApi;

async function registerAna() {
  api.tickets.add('register|ana@mail.com');
  return useAuthStore.getState().register({ name: '  Ana  ', email: ' ANA@MAIL.COM ', password: 'Ahorro2026', ticket: 'ticket-ok' });
}

describe('authStore (cloud accounts)', () => {
  beforeEach(async () => {
    api = installFakeApi();
    __resetApiClientForTests();
    await useAuthStore.getState().logout();
    useAuthStore.setState({ account: null, authenticated: false });
  });
  afterEach(() => api.restore());

  it('registers on the server with a verified-email ticket and keeps no password on the device', async () => {
    expect(await registerAna()).toEqual({ ok: true });
    const { account, authenticated } = useAuthStore.getState();
    expect(authenticated).toBe(true);
    expect(account?.serverId).toBe('user-1');
    expect(account?.email).toBe('ana@mail.com');
    expect(account?.name).toBe('Ana');
    expect(JSON.stringify(account)).not.toContain('Ahorro2026');
    expect(account?.passwordHash).toBeUndefined();
    expect(await getRefreshToken()).toBeTruthy();
  });

  it('refuses registration without a valid ticket', async () => {
    const result = await useAuthStore.getState().register({ name: 'Ana', email: 'ana@mail.com', password: 'Ahorro2026', ticket: 'inventado' });
    expect(result.ok).toBe(false);
    expect(useAuthStore.getState().authenticated).toBe(false);
  });

  it('logs in, logs out (revoking the session) and rejects wrong passwords', async () => {
    await registerAna();
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().authenticated).toBe(false);
    expect(await hasSession()).toBe(false);

    const wrong = await useAuthStore.getState().login('ana@mail.com', 'Otra2026x');
    expect(wrong).toEqual({ ok: false, error: 'Correo o contraseña incorrectos.' });
    expect(await useAuthStore.getState().login('ana@mail.com', 'Ahorro2026')).toEqual({ ok: true });
  });

  it('explains when the server cannot be reached', async () => {
    api.offline = true;
    const result = await useAuthStore.getState().login('ana@mail.com', 'Ahorro2026');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('conexión');
  });

  it('resets the password with an email ticket and signs out', async () => {
    await registerAna();
    api.tickets.add('recover|ana@mail.com');
    expect(await useAuthStore.getState().resetPassword({ email: 'ana@mail.com', password: 'Nueva2027x', ticket: 'x' })).toEqual({ ok: true });
    expect(useAuthStore.getState().authenticated).toBe(false);
    expect((await useAuthStore.getState().login('ana@mail.com', 'Nueva2027x')).ok).toBe(true);
  });

  it('updates the name and changes the password through the server', async () => {
    await registerAna();
    expect(await useAuthStore.getState().updateName('Ana María')).toEqual({ ok: true });
    expect(useAuthStore.getState().account?.name).toBe('Ana María');
    expect(api.users[0]!.name).toBe('Ana María');

    const bad = await useAuthStore.getState().changePassword({ currentPassword: 'NoEs2026x', password: 'Nueva2027x' });
    expect(bad.ok).toBe(false);
    expect(await useAuthStore.getState().changePassword({ currentPassword: 'Ahorro2026', password: 'Nueva2027x' })).toEqual({ ok: true });
    expect(useAuthStore.getState().authenticated).toBe(true);
  });

  it('signs in with Google only when the server accepts the token', async () => {
    expect((await useAuthStore.getState().googleSignIn('falso')).ok).toBe(false);
    api.googleTokens.set('bueno', { sub: '42', email: 'eva@gmail.com', name: 'Eva' });
    expect(await useAuthStore.getState().googleSignIn('bueno')).toEqual({ ok: true });
    expect(useAuthStore.getState().account?.provider).toBe('google');
  });
});

describe('account deletion', () => {
  beforeEach(async () => {
    api = installFakeApi();
    __resetApiClientForTests();
    useAuthStore.setState({ account: null, authenticated: false });
  });
  afterEach(() => api.restore());

  it('needs the email ticket, then erases the cloud account and the session', async () => {
    await registerAna();
    expect((await useAuthStore.getState().deleteAccount('inventado')).ok).toBe(false);
    expect(api.users).toHaveLength(1);

    api.tickets.add('delete|ana@mail.com');
    expect(await useAuthStore.getState().deleteAccount('ticket-ok')).toEqual({ ok: true });
    expect(api.users).toHaveLength(0);
    expect(useAuthStore.getState().account).toBeNull();
    expect(await hasSession()).toBe(false);
  });

  it('a device-only account is deleted locally without a code', async () => {
    useAuthStore.setState({ account: { id: 'x', name: 'Leo', email: 'leo@mail.com', createdAt: '2026-01-01', passwordHash: 'h', passwordSalt: 's' }, authenticated: true });
    expect(await useAuthStore.getState().deleteAccount()).toEqual({ ok: true });
    expect(useAuthStore.getState().account).toBeNull();
  });
});

describe('authStore (accounts created before the cloud)', () => {
  const legacy = {
    id: 'user-local',
    name: 'Leo',
    email: 'leo@mail.com',
    createdAt: '2026-01-01T00:00:00Z',
    passwordSalt: 'sal',
    recoverySalt: 'sal2',
    passwordHash: '',
    recoveryHash: '',
  };

  beforeEach(async () => {
    api = installFakeApi();
    __resetApiClientForTests();
    // Same hashing the old version used (mocked digest in tests).
    const Crypto = await import('expo-crypto');
    legacy.passwordHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, 'sal:Clave2026');
    legacy.recoveryHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, 'sal2:luna');
    useAuthStore.setState({ account: { ...legacy }, authenticated: false });
  });
  afterEach(() => api.restore());

  it('asks to activate in the cloud instead of failing', async () => {
    const result = await useAuthStore.getState().login('leo@mail.com', 'Clave2026');
    expect(result).toMatchObject({ ok: false, needsActivation: true });
  });

  it('still opens offline with the device password, as before', async () => {
    api.offline = true;
    expect(await useAuthStore.getState().login('leo@mail.com', 'Clave2026')).toEqual({ ok: true });
  });

  it('activation creates the cloud account with the same email and drops local secrets', async () => {
    api.tickets.add('register|leo@mail.com');
    expect(await useAuthStore.getState().activateInCloud({ password: 'Clave2026', ticket: 'ticket-ok' })).toEqual({ ok: true });
    const account = useAuthStore.getState().account!;
    expect(account.serverId).toBeTruthy();
    expect(account.email).toBe('leo@mail.com');
    expect(account.passwordHash).toBeUndefined();
  });

  it('the recovery word still resets a legacy account offline', async () => {
    const result = await useAuthStore.getState().resetPasswordWithWord({ email: 'leo@mail.com', recoveryAnswer: ' Luna ', password: 'Nueva2027x' });
    expect(result).toEqual({ ok: true });
    api.offline = true;
    expect(await useAuthStore.getState().login('leo@mail.com', 'Nueva2027x')).toEqual({ ok: true });
  });
});
