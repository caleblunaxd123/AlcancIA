import { useAuthStore } from '@/store/authStore';

const google = { provider: 'google' as const, providerUserId: 'g-123', name: 'Ana', email: 'ANA@GMAIL.COM' };

describe('socialSignIn', () => {
  beforeEach(() => useAuthStore.setState({ account: null, authenticated: false }));

  it('creates the device account from a Google profile, without any password', () => {
    expect(useAuthStore.getState().socialSignIn(google)).toEqual({ ok: true });
    const { account, authenticated } = useAuthStore.getState();
    expect(authenticated).toBe(true);
    expect(account?.provider).toBe('google');
    expect(account?.email).toBe('ana@gmail.com');
    expect(account?.name).toBe('Ana');
    expect(account?.passwordHash).toBe('');
  });

  it('signs the same identity back in after logout', () => {
    useAuthStore.getState().socialSignIn(google);
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().socialSignIn(google)).toEqual({ ok: true });
    expect(useAuthStore.getState().authenticated).toBe(true);
  });

  it('refuses a different identity when the device already has an account', async () => {
    await useAuthStore.getState().register({ name: 'Ana', email: 'ana@mail.com', password: 'Ahorro2026', recoveryAnswer: 'Luna' });
    useAuthStore.getState().logout();
    const result = useAuthStore.getState().socialSignIn({ provider: 'facebook', providerUserId: 'fb-9', name: 'Otro' });
    expect(result.ok).toBe(false);
    expect(useAuthStore.getState().authenticated).toBe(false);
  });

  it('password login and reset explain that the account uses Google', async () => {
    useAuthStore.getState().socialSignIn(google);
    useAuthStore.getState().logout();
    const login = await useAuthStore.getState().login('ana@gmail.com', 'cualquiera1A');
    expect(login.ok).toBe(false);
    if (!login.ok) expect(login.error).toContain('Google');
    const reset = await useAuthStore.getState().resetPassword({ email: 'ana@gmail.com', recoveryAnswer: 'x', password: 'Nuevo2026A' });
    expect(reset.ok).toBe(false);
  });

  it('rejects a profile without a provider id', () => {
    expect(useAuthStore.getState().socialSignIn({ ...google, providerUserId: '' }).ok).toBe(false);
  });
});
