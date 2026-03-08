import 'react-native-reanimated';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useStreak } from '../hooks/useStreak';
import { DailyStreakModal } from '../components/streak/DailyStreakModal';
import { useNotifications } from '../hooks/useNotifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { showModal, currentStreak, onClaim } = useStreak();
  useNotifications();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="profile/[userId]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
      <DailyStreakModal
        visible={showModal}
        streak={currentStreak}
        onClaim={onClaim}
      />
    </GestureHandlerRootView>
  );
}
