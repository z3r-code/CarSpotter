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
  // ✅ Noms corrects issus du hook useStreak
  const {
    showModal,
    streakStatus,
    isClaiming,
    claimStreak,
    dismissModal,
  } = useStreak();

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

      {/* ✅ Guard : on n'affiche le modal que si streakStatus est chargé */}
      {streakStatus !== null && (
        <DailyStreakModal
          visible={showModal}
          streakStatus={streakStatus}
          isClaiming={isClaiming}
          onClaim={claimStreak}
          onDismiss={dismissModal}
        />
      )}
    </GestureHandlerRootView>
  );
}
