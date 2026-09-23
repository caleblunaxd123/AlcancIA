import { useAuthStore } from '@/store/authStore';

const base = { name: 'Ana', email: 'ana@mail.com', password: 'Ahorro2026', recoveryAnswer: 'Luna' };

describe('email-verified accounts', () => {
  beforeEach(() => useAuthStore.setState({ account: null, authenticated: false }));

  it('stores when the email was verified at sign-up', async () => {
    await useAuthStore.getState().register({ ...base, emailVerifiedAt: '2026-09-23T12:00:00.000Z' });
    expect(useAuthStore.getState().account?.emailVerifiedAt).toBe('2026-09-23T12:00:00.000Z');
  });

  it('resets the password after a verified email code, without the recovery word', async () => {
    await useAuthStore.getState().register(base);
    useAuthStore.getState().logout();
    const result = await useAuthStore.getState().resetPasswordWithVerifiedEmail({ email: 'ANA@mail.com', password: 'NuevaClave2027' });
    expect(result).toEqual({ ok: true });
    expect(useAuthStore.getState().authenticated).toBe(false);
    expect(useAuthStore.getState().account?.emailVerifiedAt).toBeTruthy();
    expect((await useAuthStore.getState().login('ana@mail.com', 'Ahorro2026')).ok).toBe(false);
    expect((await useAuthStore.getState().login('ana@mail.com', 'NuevaClave2027')).ok).toBe(true);
  });

  it('refuses a verified reset for another email, a weak password or a social account', async () => {
    await useAuthStore.getState().register(base);
    expect((await useAuthStore.getState().resetPasswordWithVerifiedEmail({ email: 'otro@mail.com', password: 'NuevaClave2027' })).ok).toBe(false);
    expect((await useAuthStore.getState().resetPasswordWithVerifiedEmail({ email: 'ana@mail.com', password: 'corta' })).ok).toBe(false);

    useAuthStore.setState({ account: null, authenticated: false });
    useAuthStore.getState().socialSignIn({ provider: 'google', providerUserId: 'g-1', name: 'Ana', email: 'ana@mail.com' });
    expect((await useAuthStore.getState().resetPasswordWithVerifiedEmail({ email: 'ana@mail.com', password: 'NuevaClave2027' })).ok).toBe(false);
  });

  it('changing the email drops its verification', async () => {
    await useAuthStore.getState().register({ ...base, emailVerifiedAt: '2026-09-23T12:00:00.000Z' });
    useAuthStore.getState().updateProfile({ name: 'Ana', email: 'ana@mail.com' });
    expect(useAuthStore.getState().account?.emailVerifiedAt).toBeTruthy();
    useAuthStore.getState().updateProfile({ name: 'Ana', email: 'nueva@mail.com' });
    expect(useAuthStore.getState().account?.emailVerifiedAt).toBeUndefined();
  });
});
