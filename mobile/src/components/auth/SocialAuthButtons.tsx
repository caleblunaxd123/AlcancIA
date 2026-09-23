import * as Facebook from 'expo-auth-session/providers/facebook';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/common/Text';
import {
  fetchFacebookProfile,
  fetchGoogleProfile,
  isFacebookConfigured,
  isGoogleConfigured,
  socialConfig,
} from '@/services/socialAuth';
import type { SocialProfile } from '@/store/authStore';
import { useTheme } from '@/theme';

// Closes the in-app browser tab when the OAuth redirect comes back.
WebBrowser.maybeCompleteAuthSession();

type Provider = 'google' | 'facebook';

const FACEBOOK_BLUE = '#1877F2'; // Meta brand guideline color

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </Svg>
  );
}

function FacebookLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        fill="#FFFFFF"
        d="M15.12 5.32H17V2.14A26.11 26.11 0 0014.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.03.28-1.73 1.76-1.73z"
      />
    </Svg>
  );
}

function ProviderButton({
  provider,
  label,
  onPress,
  busy,
  disabled,
}: {
  provider: Provider;
  label: string;
  onPress: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const isGoogle = provider === 'google';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: disabled || busy }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        borderRadius: theme.radius.pill,
        backgroundColor: isGoogle ? theme.colors.surface.primary : FACEBOOK_BLUE,
        borderWidth: isGoogle ? 1 : 0,
        borderColor: theme.colors.border.strong,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={isGoogle ? theme.colors.text.secondary : '#FFFFFF'} />
      ) : isGoogle ? (
        <GoogleLogo />
      ) : (
        <FacebookLogo />
      )}
      <Text variant="bodyStrong" style={{ color: isGoogle ? theme.colors.text.primary : '#FFFFFF', fontSize: 15 }}>
        {isGoogle ? 'Google' : 'Facebook'}
      </Text>
    </Pressable>
  );
}

type ChildProps = { onProfile: (p: SocialProfile) => void; onError: (message: string) => void; busy: boolean; setBusy: (b: boolean) => void };

function GoogleButton({ onProfile, onError, busy, setBusy }: ChildProps) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: socialConfig.google.androidClientId || undefined,
    iosClientId: socialConfig.google.iosClientId || undefined,
    webClientId: socialConfig.google.webClientId || undefined,
    scopes: ['openid', 'profile', 'email'],
  });

  // Each OAuth response is handled exactly once, even if callbacks change identity.
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (!response || handled.current === response) return;
    handled.current = response;
    if (response.type !== 'success') {
      setBusy(false);
      if (response.type === 'error') onError('Google no pudo completar el inicio de sesión.');
      return;
    }
    const token = response.authentication?.accessToken;
    if (!token) {
      setBusy(false);
      onError('Google no devolvió un acceso válido.');
      return;
    }
    fetchGoogleProfile(token)
      .then(onProfile)
      .catch(() => onError('No pudimos leer tu perfil de Google. Revisa tu conexión.'))
      .finally(() => setBusy(false));
  }, [response, onProfile, onError, setBusy]);

  return (
    <ProviderButton
      provider="google"
      label="Continuar con Google"
      busy={busy}
      disabled={!request}
      onPress={() => {
        setBusy(true);
        promptAsync().catch(() => setBusy(false));
      }}
    />
  );
}

function FacebookButton({ onProfile, onError, busy, setBusy }: ChildProps) {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: socialConfig.facebookAppId,
    scopes: ['public_profile', 'email'],
  });

  // Each OAuth response is handled exactly once, even if callbacks change identity.
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (!response || handled.current === response) return;
    handled.current = response;
    if (response.type !== 'success') {
      setBusy(false);
      if (response.type === 'error') onError('Facebook no pudo completar el inicio de sesión.');
      return;
    }
    const token = response.authentication?.accessToken ?? response.params?.access_token;
    if (!token) {
      setBusy(false);
      onError('Facebook no devolvió un acceso válido.');
      return;
    }
    fetchFacebookProfile(token)
      .then(onProfile)
      .catch(() => onError('No pudimos leer tu perfil de Facebook. Revisa tu conexión.'))
      .finally(() => setBusy(false));
  }, [response, onProfile, onError, setBusy]);

  return (
    <ProviderButton
      provider="facebook"
      label="Continuar con Facebook"
      busy={busy}
      disabled={!request}
      onPress={() => {
        setBusy(true);
        promptAsync().catch(() => setBusy(false));
      }}
    />
  );
}

/** Shown when a provider has no client id in this build — explains instead of failing. */
function UnconfiguredButton({ provider }: { provider: Provider }) {
  const name = provider === 'google' ? 'Google' : 'Facebook';
  return (
    <ProviderButton
      provider={provider}
      label={`Continuar con ${name}`}
      busy={false}
      onPress={() =>
        Alert.alert(
          `Acceso con ${name} no activado`,
          `Esta versión de AlcancIA aún no tiene habilitado el acceso con ${name}. Crea tu cuenta con tu correo en segundos; tus datos quedan igual de protegidos.`,
        )
      }
    />
  );
}

/**
 * "O continúa con": Google + Facebook side by side. Each provider hook is only
 * mounted when its client id exists (the hooks throw otherwise).
 */
export function SocialAuthButtons({
  onProfile,
  onError,
  dividerLabel = 'o continúa con',
  dividerFirst = true,
}: {
  onProfile: (p: SocialProfile) => void;
  onError: (message: string) => void;
  dividerLabel?: string;
  /** Login: divider above the buttons. Sign-up: buttons first, divider below. */
  dividerFirst?: boolean;
}) {
  const theme = useTheme();
  const [busy, setBusy] = useState<Provider | null>(null);

  const divider = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border.subtle }} />
      <Text variant="caption" color="muted">{dividerLabel}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border.subtle }} />
    </View>
  );

  return (
    <View style={{ gap: theme.spacing.md }}>
      {dividerFirst ? divider : null}
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        {isGoogleConfigured() ? (
          <GoogleButton onProfile={onProfile} onError={onError} busy={busy === 'google'} setBusy={(b) => setBusy(b ? 'google' : null)} />
        ) : (
          <UnconfiguredButton provider="google" />
        )}
        {isFacebookConfigured() ? (
          <FacebookButton onProfile={onProfile} onError={onError} busy={busy === 'facebook'} setBusy={(b) => setBusy(b ? 'facebook' : null)} />
        ) : (
          <UnconfiguredButton provider="facebook" />
        )}
      </View>
      {dividerFirst ? null : divider}
    </View>
  );
}
