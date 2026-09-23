import { useAuthStore } from '@/store/authStore';

describe('authStore', () => {
  beforeEach(() => useAuthStore.setState({ account: null, authenticated: false }));

  it('registers and normalizes a local account without retaining the password', async () => {
    const result = await useAuthStore.getState().register({ name: '  Ana  ', email: ' ANA@MAIL.COM ', password: 'Ahorro2026', recoveryAnswer: 'Luna' });
    expect(result).toEqual({ ok: true });
    const state = useAuthStore.getState();
    expect(state.account?.email).toBe('ana@mail.com');
    expect(state.account?.name).toBe('Ana');
    expect(JSON.stringify(state.account)).not.toContain('Ahorro2026');
    expect(state.authenticated).toBe(true);
  });

  it('rejects weak credentials and incorrect logins', async () => {
    const weak = await useAuthStore.getState().register({ name: 'Ana', email: 'ana@mail.com', password: '123', recoveryAnswer: 'Luna' });
    expect(weak.ok).toBe(false);
    await useAuthStore.getState().register({ name: 'Ana', email: 'ana@mail.com', password: 'Ahorro2026', recoveryAnswer: 'Luna' });
    useAuthStore.getState().logout();
    const result = await useAuthStore.getState().login('ana@mail.com', 'Equivocada9');
    expect(result).toEqual({ ok: false, error: 'Correo o contraseña incorrectos.' });
    expect(useAuthStore.getState().authenticated).toBe(false);
  });

  it('resets the password only with the recovery answer and keeps the session closed', async () => {
    await useAuthStore.getState().register({ name: 'Ana', email: 'ana@mail.com', password: 'Ahorro2026', recoveryAnswer: 'Luna' });
    const bad = await useAuthStore.getState().resetPassword({ email: 'ana@mail.com', recoveryAnswer: 'Sol', password: 'Nuevo2026A' });
    expect(bad.ok).toBe(false);
    const good = await useAuthStore.getState().resetPassword({ email: 'ana@mail.com', recoveryAnswer: 'Luna', password: 'Nuevo2026A' });
    expect(good).toEqual({ ok: true });
    expect(useAuthStore.getState().authenticated).toBe(false);
    expect(await useAuthStore.getState().login('ana@mail.com', 'Nuevo2026A')).toEqual({ ok: true });
  });

  it('updates profile data and changes the password after verifying the current one', async () => {
    await useAuthStore.getState().register({ name: 'Ana', email: 'ana@mail.com', password: 'Ahorro2026', recoveryAnswer: 'Luna' });
    expect(useAuthStore.getState().updateProfile({ name: 'Ana María', email: 'ana.nueva@mail.com' })).toEqual({ ok: true });
    expect(useAuthStore.getState().account).toMatchObject({ name: 'Ana María', email: 'ana.nueva@mail.com' });
    expect((await useAuthStore.getState().changePassword({ currentPassword: 'Incorrecta9', password: 'Nueva2027A' })).ok).toBe(false);
    expect(await useAuthStore.getState().changePassword({ currentPassword: 'Ahorro2026', password: 'Nueva2027A' })).toEqual({ ok: true });
    useAuthStore.getState().logout();
    expect(await useAuthStore.getState().login('ana.nueva@mail.com', 'Nueva2027A')).toEqual({ ok: true });
  });
});
