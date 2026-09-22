import { Tabs } from 'expo-router';

import { TabBar, type TabBarProps } from '@/components/navigation/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...(props as unknown as TabBarProps)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="movimientos" />
      <Tabs.Screen name="ia" />
      <Tabs.Screen name="metas" />
      <Tabs.Screen name="familia" />
    </Tabs>
  );
}
