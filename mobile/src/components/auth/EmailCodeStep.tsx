import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Icon } from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import { requestEmailCode, verifyEmailCode, type EmailCodePurpose } from '@/services/emailVerification';
import { useTheme } from '@/theme';

const LENGTH = 6;

/**
 * "Te enviamos un código": 6 boxes backed by one hidden input (paste and SMS
 * autofill work), a resend countdown and a way back to fix the address.
 */
export function EmailCodeStep({
  email,
  purpose,
  challengeId: initialChallenge,
  resendAfterSeconds,
  onVerified,
  onChangeEmail,
}: {
  email: string;
  purpose: EmailCodePurpose;
  challengeId: string;
  resendAfterSeconds: number;
  /** Receives the server ticket that proves this code was verified. */
  onVerified: (ticket: string) => Promise<void> | void;
  onChangeEmail: () => void;
}) {
  const theme = useTheme();
  const input = useRef<TextInput>(null);
  // State updates are async: a ref stops auto-verify + a button tap from
  // spending the single-use code twice (the 2nd call would say "no válido").
  const inFlight = useRef(false);
  const [challengeId, setChallengeId] = useState(initialChallenge);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [wait, setWait] = useState(resendAfterSeconds);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const verify = async (value = code) => {
    if (inFlight.current || value.length !== LENGTH) return;
    inFlight.current = true;
    setVerifying(true);
    setError('');
    const result = await verifyEmailCode({ challengeId, email, purpose, code: value });
    if (!result.ok) {
      inFlight.current = false;
      setVerifying(false);
      setCode('');
      setError(result.error);
      input.current?.focus();
      return;
    }
    await onVerified(result.ticket);
    inFlight.current = false;
    setVerifying(false);
  };

  const resend = async () => {
    setResending(true);
    setError('');
    setNotice('');
    const result = await requestEmailCode(email, purpose);
    setResending(false);
    if (!result.ok) return setError(result.error);
    setChallengeId(result.challengeId);
    setWait(result.resendAfterSeconds);
    setCode('');
    setNotice('Te enviamos un código nuevo.');
  };

  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    setError('');
    if (digits.length === LENGTH) void verify(digits);
  };

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.brand.soft }}>
        <Icon name="mail-check" size={22} color="brand" />
        <Text variant="body" style={{ flex: 1 }}>
          Enviamos un código de 6 números a <Text variant="bodyStrong">{email}</Text>. Revisa también la carpeta de spam.
        </Text>
      </View>

      <Pressable onPress={() => input.current?.focus()} accessible={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}>
          {Array.from({ length: LENGTH }, (_, i) => {
            const filled = i < code.length;
            const active = i === code.length && !verifying;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  aspectRatio: 0.85,
                  maxHeight: 64,
                  borderRadius: theme.radius.md,
                  borderWidth: active || error ? 2 : 1,
                  borderColor: error ? theme.colors.money.negative : active ? theme.colors.brand.primary : theme.colors.border.strong,
                  backgroundColor: theme.colors.surface.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="title">{filled ? code[i] : ''}</Text>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={input}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={LENGTH}
          autoFocus
          accessibilityLabel="Código de verificación de 6 números"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        />
      </Pressable>

      {error ? <Text variant="caption" color="negative" accessibilityLiveRegion="polite">{error}</Text> : null}
      {notice && !error ? <Text variant="caption" color="brand" accessibilityLiveRegion="polite">{notice}</Text> : null}

      <Button label="Verificar código" size="lg" fullWidth loading={verifying} disabled={code.length !== LENGTH} onPress={() => verify()} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={onChangeEmail} accessibilityRole="button" hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text variant="body" color="secondary">Cambiar correo</Text>
        </Pressable>
        <Pressable onPress={resend} disabled={wait > 0 || resending} accessibilityRole="button" accessibilityState={{ disabled: wait > 0 || resending }} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text variant="bodyStrong" color={wait > 0 || resending ? 'muted' : 'brand'}>
            {resending ? 'Enviando…' : wait > 0 ? `Reenviar en ${wait} s` : 'Reenviar código'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
