import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureFinancialStorage } from './secureStorage';
import {
  authRequest,
  clearSession,
  getRefreshToken,
  publicRequest,
  saveSession,
  type ServerSession,
  type ServerUser,
} from '@/services/apiClient';
import { normalizeEmail, validateEmail, validatePassword } from '@/utils/authValidation';

export type AuthProvider = 'password' | 'google' | 'facebook';

/**
 * The signed-in person. Cloud accounts carry `serverId`. Accounts created by
 * older versions live only on this device (no `serverId`, local password hash);
 * they keep working and can be activated in the cloud with an email code.
 */
export type Account = {
  id: string;
  serverId?: string;
  provider?: AuthProvider;
  name: string;
  email: string;
  emailVerifiedAt?: string;
  createdAt: string;
  /** Legacy local-only credentials (pre-cloud). Dropped once activated. */
  passwordHash?: string;
  passwordSalt?: string;
  recoveryHash?: string;
  recoverySalt?: string;
};

export type AuthResult = { ok: true } | { ok: false; error: string };
/** Login can also ask to activate a legacy device account in the cloud. */
export type LoginResult = AuthResult | { ok: false; error: string; needsActivation: true };

type AuthState = {
  account: Account | null;
  authenticated: boolean;
  hydrated: boolean;
  /** Create a cloud account. `ticket` proves the email code was verified. */
  register: (input: { name: string; email: string; password: string; ticket: string }) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Legacy device account → cloud account with the same email/password (code-verified). */
  activateInCloud: (input: { password: string; ticket: string }) => Promise<AuthResult>;
  /** Google sign-in: the server verifies the token with Google. */
  googleSignIn: (accessToken: string) => Promise<AuthResult>;
  /** Reset with an email-code ticket (cloud accounts). Signs out everywhere. */
  resetPassword: (input: { email: string; password: string; ticket: string }) => Promise<AuthResult>;
  /** Offline fallback for legacy device accounts: the recovery word. */
  resetPasswordWithWord: (input: { email: string; recoveryAnswer: string; password: string }) => Promise<AuthResult>;
  updateName: (name: string) => Promise<AuthResult>;
  changePassword: (input: { currentPassword: string; password: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  /**
   * Permanently deletes the account. Cloud accounts need a `delete` email ticket
   * (server erases user, sessions and data); legacy device accounts are local only.
   */
  deleteAccount: (ticket?: string) => Promise<AuthResult>;
  /** The server rejected our refresh token (revoked elsewhere): drop to login. */
  sessionLost: () => void;
};

const randomSalt = async () => {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const hashSecret = (value: string, salt: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${value.normalize('NFKC')}`);

const fromServer = (user: ServerUser, previous: Account | null): Account => ({
  id: user.id,
  serverId: user.id,
  provider: user.provider,
  name: user.name,
  email: user.email,
  emailVerifiedAt: user.emailVerifiedAt ?? undefined,
  createdAt: previous?.serverId === user.id ? previous.createdAt : new Date().toISOString(),
});

export const isLegacyAccount = (account: Account | null): boolean =>
  account != null && !account.serverId && !!account.passwordHash;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const start = async (session: ServerSession): Promise<AuthResult> => {
        await saveSession(session);
        set({ account: fromServer(session.user, get().account), authenticated: true });
        return { ok: true };
      };

      return {
        account: null,
        authenticated: false,
        hydrated: false,

        register: async ({ name, email, password, ticket }) => {
          const cleanName = name.trim();
          if (cleanName.length < 2) return { ok: false, error: 'Escribe tu nombre.' };
          const emailError = validateEmail(normalizeEmail(email));
          if (emailError) return { ok: false, error: emailError };
          const passwordError = validatePassword(password);
          if (passwordError) return { ok: false, error: passwordError };
          const result = await publicRequest<ServerSession>('POST', '/api/auth/register', { name: cleanName, email: normalizeEmail(email), password, ticket });
          return result.ok ? start(result.data) : { ok: false, error: result.error };
        },

        login: async (email, password) => {
          const cleanEmail = normalizeEmail(email);
          const result = await publicRequest<ServerSession>('POST', '/api/auth/login', { email: cleanEmail, password });
          if (result.ok) return start(result.data);

          // Not in the cloud yet? A matching legacy device account can be activated.
          const legacy = get().account;
          if (legacy && isLegacyAccount(legacy) && legacy.email === cleanEmail && legacy.passwordSalt
            && (await hashSecret(password, legacy.passwordSalt)) === legacy.passwordHash) {
            if (result.offline) {
              set({ authenticated: true }); // still works offline, exactly as before
              return { ok: true };
            }
            if (result.status === 401) {
              return { ok: false, needsActivation: true, error: 'Activa tu cuenta en la nube para protegerla y usarla en otros celulares.' };
            }
          }
          return { ok: false, error: result.error };
        },

        activateInCloud: async ({ password, ticket }) => {
          const legacy = get().account;
          if (!legacy || !isLegacyAccount(legacy)) return { ok: false, error: 'No hay una cuenta para activar en este dispositivo.' };
          const result = await publicRequest<ServerSession>('POST', '/api/auth/register', { name: legacy.name, email: legacy.email, password, ticket });
          return result.ok ? start(result.data) : { ok: false, error: result.error };
        },

        googleSignIn: async (accessToken) => {
          const result = await publicRequest<ServerSession>('POST', '/api/auth/google', { accessToken });
          return result.ok ? start(result.data) : { ok: false, error: result.error };
        },

        resetPassword: async ({ email, password, ticket }) => {
          const passwordError = validatePassword(password);
          if (passwordError) return { ok: false, error: passwordError };
          const result = await publicRequest('POST', '/api/auth/reset-password', { email: normalizeEmail(email), password, ticket });
          if (!result.ok) return { ok: false, error: result.error };
          await clearSession();
          set({ authenticated: false });
          return { ok: true };
        },

        resetPasswordWithWord: async ({ email, recoveryAnswer, password }) => {
          const account = get().account;
          if (!account || !isLegacyAccount(account) || normalizeEmail(email) !== account.email || !account.recoverySalt) {
            return { ok: false, error: 'La palabra de recuperación solo sirve para cuentas creadas antes en este dispositivo.' };
          }
          const passwordError = validatePassword(password);
          if (passwordError) return { ok: false, error: passwordError };
          if ((await hashSecret(recoveryAnswer.trim().toLowerCase(), account.recoverySalt)) !== account.recoveryHash) {
            return { ok: false, error: 'La palabra de recuperación no coincide.' };
          }
          const passwordSalt = await randomSalt();
          set({ account: { ...account, passwordSalt, passwordHash: await hashSecret(password, passwordSalt) }, authenticated: false });
          return { ok: true };
        },

        updateName: async (name) => {
          const account = get().account;
          const cleanName = name.trim();
          if (!account) return { ok: false, error: 'No hay una cuenta activa.' };
          if (cleanName.length < 2) return { ok: false, error: 'Escribe tu nombre.' };
          if (account.serverId) {
            const result = await authRequest<ServerUser>('PUT', '/api/auth/me', { name: cleanName });
            if (!result.ok) return { ok: false, error: result.error };
          }
          set({ account: { ...account, name: cleanName } });
          return { ok: true };
        },

        changePassword: async ({ currentPassword, password }) => {
          const account = get().account;
          if (!account?.serverId) return { ok: false, error: 'Activa tu cuenta en la nube para cambiar la contraseña.' };
          const passwordError = validatePassword(password);
          if (passwordError) return { ok: false, error: passwordError };
          const result = await authRequest<ServerSession>('POST', '/api/auth/me/password', { currentPassword, password });
          return result.ok ? start(result.data) : { ok: false, error: result.error };
        },

        logout: async () => {
          const token = await getRefreshToken();
          if (token) await publicRequest('POST', '/api/auth/logout', { refreshToken: token });
          await clearSession();
          set({ authenticated: false });
        },

        deleteAccount: async (ticket) => {
          const account = get().account;
          if (!account) return { ok: false, error: 'No hay una cuenta activa.' };
          if (account.serverId) {
            const result = await authRequest('DELETE', '/api/auth/me', { ticket });
            if (!result.ok) return { ok: false, error: result.error };
          }
          await clearSession();
          set({ account: null, authenticated: false });
          return { ok: true };
        },

        sessionLost: () => set({ authenticated: false }),
      };
    },
    {
      name: 'alcancia-auth',
      storage: createJSONStorage(() => secureFinancialStorage),
      version: 2,
      partialize: ({ account, authenticated }) => ({ account, authenticated }),
      // v1 accounts were device-only: they load as legacy (no serverId) and keep working.
      migrate: (persisted) => persisted as { account: Account | null; authenticated: boolean },
    },
  ),
);

useAuthStore.persist.onFinishHydration(() => useAuthStore.setState({ hydrated: true }));
