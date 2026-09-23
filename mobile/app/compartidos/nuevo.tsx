import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Switch, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { HeaderIconButton, PageHeader } from '@/components/common/PageHeader';
import { Icon } from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { fromMajor } from '@/engine/money';
import { GROUP_KINDS, kindMeta } from '@/features/shared/summary';
import { useAppStore } from '@/store/appStore';
import { useSharedStore } from '@/store/sharedStore';
import { useTheme } from '@/theme';
import type { GroupKind } from '@/types/shared';
import { parseMoneyInput } from '@/utils/validation';

type Person = { key: number; name: string; income: string };

export default function NewGroup() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const initialKind = (GROUP_KINDS.find((k) => k.kind === params.kind)?.kind ?? 'couple') as GroupKind;
  const myStoredName = useAppStore((s) => s.name);
  const createGroup = useSharedStore((s) => s.createGroup);

  const [kind, setKind] = useState<GroupKind>(initialKind);
  const [name, setName] = useState('');
  const [myName, setMyName] = useState(myStoredName.trim().split(/\s+/)[0] ?? '');
  const [myIncome, setMyIncome] = useState('');
  const [people, setPeople] = useState<Person[]>([{ key: 1, name: '', income: '' }]);
  const [useIncomes, setUseIncomes] = useState(false);

  const filled = people.filter((p) => p.name.trim().length > 0);
  const canSave = myName.trim().length > 0 && filled.length > 0;

  const updatePerson = (key: number, patch: Partial<Person>) =>
    setPeople((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const addPerson = () => {
    setPeople((list) => [...list, { key: (list.at(-1)?.key ?? 0) + 1, name: '', income: '' }]);
    Haptics.selectionAsync().catch(() => {});
  };
  const removePerson = (key: number) => setPeople((list) => (list.length > 1 ? list.filter((p) => p.key !== key) : list));

  const incomeMinor = (raw: string) => {
    if (!useIncomes) return undefined;
    const v = parseMoneyInput(raw);
    return v === null ? undefined : fromMajor(v).minor;
  };

  const save = () => {
    const result = createGroup({
      name: name.trim() || kindMeta(kind).defaultName,
      kind,
      me: { name: myName, incomeMinor: incomeMinor(myIncome) },
      others: filled.map((p) => ({ name: p.name, incomeMinor: incomeMinor(p.income) })),
    });
    if (!result.ok) {
      Alert.alert('Revisa el grupo', result.error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace({ pathname: '/compartidos/[id]', params: { id: result.value } });
  };

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={{ padding: theme.spacing.xl }}>
          <PageHeader
            title="Nuevo grupo"
            subtitle="Con quién compartes gastos"
            action={<HeaderIconButton icon="x" label="Cerrar" onPress={() => router.back()} />}
          />
        </View>

        <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: 0, gap: theme.spacing.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: theme.spacing.md }}>
            <Text variant="bodyStrong">Tipo de grupo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {GROUP_KINDS.map((k) => {
                const active = kind === k.kind;
                return (
                  <Pressable
                    key={k.kind}
                    onPress={() => { setKind(k.kind); Haptics.selectionAsync().catch(() => {}); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 44, paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: active ? theme.colors.brand.primary : theme.colors.border.subtle, backgroundColor: active ? theme.colors.brand.soft : theme.colors.surface.primary }}
                  >
                    <Icon name={k.icon} size={16} color={active ? 'brand' : 'secondary'} />
                    <Text variant="bodyStrong" color={active ? 'brand' : 'secondary'} style={{ fontSize: 14 }}>{k.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextField label="Nombre del grupo" placeholder={kindMeta(kind).defaultName} value={name} onChangeText={setName} />
          <TextField label="Tu nombre" placeholder="Cómo te verán en el grupo" value={myName} onChangeText={setMyName} autoCapitalize="words" />

          <View style={{ gap: theme.spacing.md }}>
            <Text variant="bodyStrong">¿Con quién?</Text>
            {people.map((p, i) => (
              <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    placeholder={`Nombre de la persona ${i + 1}`}
                    value={p.name}
                    onChangeText={(v) => updatePerson(p.key, { name: v })}
                    autoCapitalize="words"
                    accessibilityLabel={`Nombre de la persona ${i + 1}`}
                  />
                </View>
                {people.length > 1 ? (
                  <HeaderIconButton icon="x" label={`Quitar persona ${i + 1}`} onPress={() => removePerson(p.key)} />
                ) : null}
              </View>
            ))}
            <Pressable onPress={addPerson} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: 44, opacity: pressed ? 0.6 : 1 })}>
              <Icon name="user-plus" size={18} color="brand" />
              <Text variant="bodyStrong" color="brand">Agregar otra persona</Text>
            </Pressable>
          </View>

          <View style={{ gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface.secondary }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">Dividir según ingresos (opcional)</Text>
                <Text variant="caption" color="secondary">Quien gana más aporta un poco más. Es solo una sugerencia: ustedes deciden en cada gasto.</Text>
              </View>
              <Switch
                value={useIncomes}
                onValueChange={setUseIncomes}
                accessibilityLabel="Dividir según ingresos"
                trackColor={{ true: theme.colors.brand.primary, false: theme.colors.border.strong }}
                thumbColor={theme.colors.surface.primary}
              />
            </View>
            {useIncomes ? (
              <View style={{ gap: theme.spacing.md }}>
                <TextField label={`Ingreso mensual de ${myName.trim() || 'ti'}`} prefix="S/" keyboardType="decimal-pad" placeholder="0.00" value={myIncome} onChangeText={setMyIncome} />
                {filled.map((p) => (
                  <TextField key={p.key} label={`Ingreso mensual de ${p.name.trim()}`} prefix="S/" keyboardType="decimal-pad" placeholder="0.00" value={p.income} onChangeText={(v) => updatePerson(p.key, { income: v })} />
                ))}
              </View>
            ) : null}
          </View>

          <Button label="Crear grupo" size="lg" fullWidth icon="check" disabled={!canSave} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
