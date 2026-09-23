import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureFinancialStorage } from './secureStorage';
import { createId } from '@/utils/id';
import { normalizeEmail, validateEmail, validatePassword } from '@/utils/authValidation';

export type AuthProvider = 'password' | 'google' | 'facebook';

type LocalAccount = {
  id: string;
  /** How the owner signs in. Missing on accounts created before social login (= password). */
  provider?: AuthProvider;
  /** Stable id from Google/Facebook for social accounts. */
  providerUserId?: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  recoveryHash: string;
  recoverySalt: string;
  createdAt: string;
};

type AuthResult = { ok: true } | { ok: false; error: string };

export type SocialProfile = { provider: Exclude<AuthProvider, 'password'>; providerUserId: string; name: string; email?: string };

type AuthState = {
  account: LocalAccount | null;
  authenticated: boolean;
  hydrated: boolean;
  register: (input: { name: string; email: string; password: string; recoveryAnswer: string }) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  /** Sign in (or create the device account) with a verified Google/Facebook profile. */
  socialSignIn: (profile: SocialProfile) => AuthResult;
  resetPassword: (input: { email: string; recoveryAnswer: string; password: string }) => Promise<AuthResult>;
  updateProfile: (input: { name: string; email: string }) => AuthResult;
  changePassword: (input: { currentPassword: string; password: string }) => Promise<AuthResult>;
  logout: () => void;
};

const randomSalt = async () => {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const hashSecret = (value: string, salt: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${value.normalize('NFKC')}`);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      account: null,
      authenticated: false,
      hydrated: false,

      register: async ({ name, email, password, recoveryAnswer }) => {
        const cleanName = name.trim();
        const cleanEmail = normalizeEmail(email);
        if (cleanName.length < 2) return { ok: false, error: 'Escribe tu nombre.' };
        const emailError = validateEmail(cleanEmail);
        if (emailError) return { ok: false, error: emailError };
        const passwordError = validatePassword(password);
        if (passwordError) return { ok: false, error: passwordError };
        if (recoveryAnswer.trim().length < 2) return { ok: false, error: 'Escribe tu respuesta de recuperación.' };
        if (get().account) return { ok: false, error: 'Ya existe una cuenta en este dispositivo.' };

        const [passwordSalt, recoverySalt] = await Promise.all([randomSalt(), randomSalt()]);
        const [passwordHash, recoveryHash] = await Promise.all([
          hashSecret(password, passwordSalt),
          hashSecret(recoveryAnswer.trim().toLowerCase(), recoverySalt),
        ]);
        set({
          account: {
            id: createId('user'),
            name: cleanName,
            email: cleanEmail,
            passwordHash,
            passwordSalt,
            recoveryHash,
            recoverySalt,
            createdAt: new Date().toISOString(),
          },
          authenticated: true,
        });
        return { ok: true };
      },

      login: async (email, password) => {
        const account = get().account;
        if (!account) return { ok: false, error: 'No hay una cuenta registrada en este dispositivo.' };
        if (account.provider && account.provider !== 'password') {
          return { ok: false, error: `Esta cuenta entra con ${account.provider === 'google' ? 'Google' : 'Facebook'}. Usa ese botón.` };
        }
        const cleanEmail = normalizeEmail(email);
        const candidate = await hashSecret(password, account.passwordSalt);
        if (cleanEmail !== account.email || candidate !== account.passwordHash) {
          return { ok: false, error: 'Correo o contraseña incorrectos.' };
        }
        set({ authenticated: true });
        return { ok: true };
      },

      socialSignIn: (profile) => {
        const account = get().account;
        if (!profile.providerUserId) return { ok: false, error: 'No pudimos leer tu perfil. Intenta de nuevo.' };
        if (account) {
          const sameIdentity = account.provider === profile.provider && account.providerUserId === profile.providerUserId;
          if (!sameIdentity) {
            return { ok: false, error: 'En este celular ya hay otra cuenta de AlcancIA. Entra con tu correo y contraseña.' };
          }
          set({ authenticated: true });
          return { ok: true };
        }
        set({
          account: {
            id: createId('user'),
            provider: profile.provider,
            providerUserId: profile.providerUserId,
            name: profile.name.trim() || 'Tú',
            email: profile.email ? normalizeEmail(profile.email) : '',
            // Social accounts have no local password or recovery secret.
            passwordHash: '',
            passwordSalt: '',
            recoveryHash: '',
            recoverySalt: '',
            createdAt: new Date().toISOString(),
          },
          authenticated: true,
        });
        return { ok: true };
      },

      resetPassword: async ({ email, recoveryAnswer, password }) => {
        const account = get().account;
        if (!account || normalizeEmail(email) !== account.email) {
          return { ok: false, error: 'No encontramos esa cuenta en este dispositivo.' };
        }
        if (account.provider && account.provider !== 'password') {
          return { ok: false, error: 'Esta cuenta no usa contraseña: entra con Google o Facebook.' };
        }
        const passwordError = validatePassword(password);
        if (passwordError) return { ok: false, error: passwordError };
        const recoveryHash = await hashSecret(recoveryAnswer.trim().toLowerCase(), account.recoverySalt);
        if (recoveryHash !== account.recoveryHash) return { ok: false, error: 'La respuesta de recuperación no coincide.' };
        const passwordSalt = await randomSalt();
        const passwordHash = await hashSecret(password, passwordSalt);
        set({ account: { ...account, passwordSalt, passwordHash }, authenticated: false });
        return { ok: true };
      },

      updateProfile: ({ name, email }) => {
        const account = get().account;
        if (!account) return { ok: false, error: 'No hay una cuenta activa.' };
        const cleanName = name.trim();
        const cleanEmail = normalizeEmail(email);
        if (cleanName.length < 2) return { ok: false, error: 'Escribe tu nombre.' };
        const emailError = validateEmail(cleanEmail);
        if (emailError) return { ok: false, error: emailError };
        set({ account: { ...account, name: cleanName, email: cleanEmail } });
        return { ok: true };
      },

      changePassword: async ({ currentPassword, password }) => {
        const account = get().account;
        if (!account) return { ok: false, error: 'No hay una cuenta activa.' };
        const currentHash = await hashSecret(currentPassword, account.passwordSalt);
        if (currentHash !== account.passwordHash) return { ok: false, error: 'La contraseña actual no coincide.' };
        const passwordError = validatePassword(password);
        if (passwordError) return { ok: false, error: passwordError };
        if (currentPassword === password) return { ok: false, error: 'La nueva contraseña debe ser diferente.' };
        const passwordSalt = await randomSalt();
        const passwordHash = await hashSecret(password, passwordSalt);
        set({ account: { ...account, passwordSalt, passwordHash } });
        return { ok: true };
      },

      logout: () => set({ authenticated: false }),
    }),
    {
      name: 'alcancia-auth',
      storage: createJSONStorage(() => secureFinancialStorage),
      version: 1,
      partialize: ({ account, authenticated }) => ({ account, authenticated }),
    },
  ),
);

useAuthStore.persist.onFinishHydration(() => useAuthStore.setState({ hydrated: true }));
