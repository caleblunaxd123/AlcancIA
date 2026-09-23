import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/common/PageHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import { LEGAL_UPDATED, PRIVACY_POLICY, TERMS } from '@/content/legal';
import { useTheme } from '@/theme';

/** /legal/privacidad and /legal/terminos — readable before signing up. */
export default function LegalDocument() {
  const router = useRouter();
  const theme = useTheme();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const isTerms = doc === 'terminos';
  const sections = isTerms ? TERMS : PRIVACY_POLICY;

  return (
    <Screen edges={{ top: true }}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.xl, paddingBottom: theme.spacing.huge }} showsVerticalScrollIndicator={false}>
        <PageHeader
          title={isTerms ? 'Términos de uso' : 'Política de privacidad'}
          subtitle={`Actualizado el ${LEGAL_UPDATED}`}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        {sections.map((section) => (
          <View key={section.title} style={{ gap: theme.spacing.sm }}>
            <Text variant="subtitle" accessibilityRole="header">{section.title}</Text>
            {section.body.map((paragraph, index) => (
              <Text key={index} variant="body" color="secondary">{paragraph}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
