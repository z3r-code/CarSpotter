import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useStreak } from '../hooks/useStreak';
import { DailyStreakModal } from '../components/streak/DailyStreakModal';
import { useNotifications } from '../hooks/useNotifications';
import { LevelUpModal } from '../components/ui/LevelUpModal';
import { LevelUpEvent, levelUpEmitter } from '../services/levelUpEmitter';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { showModal, streakStatus, isClaiming, claimStreak, dismissModal } = useStreak();
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number } | null>(null);

  useNotifications();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Écoute les évènements level-upémis depuis n'importe quel écran
  useEffect(() => {
    const unsub = levelUpEmitter.on('levelUp', (e: LevelUpEvent) => {
      setLevelUpData({ newLevel: e.newLevel });
    });
    return unsub;
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

      {streakStatus !== null && (
        <DailyStreakModal
          visible={showModal}
          streakStatus={streakStatus}
          isClaiming={isClaiming}
          onClaim={claimStreak}
          onDismiss={dismissModal}
        />
      )}

      {/* Level Up Modal — global, par-dessus tout */}
      <LevelUpModal
        visible={levelUpData !== null}
        newLevel={levelUpData?.newLevel ?? 1}
        onClose={() => setLevelUpData(null)}
      />
    </GestureHandlerRootView>
  );
}
