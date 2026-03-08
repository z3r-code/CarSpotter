import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../supabase';
import {
  registerForPushNotifications,
  savePushToken,
  scheduleDailyQuestReminder,
  scheduleStreakReminder,
} from '../services/notificationService';

/**
 * À appeler UNE SEULE FOIS dans RootLayout.
 *
 * Notes Expo Go + SDK 54 :
 * - Les notifications locales (scheduled) fonctionnent en Expo Go iOS.
 * - Le remote push token (getExpoPushTokenAsync) nécessite un dev build.
 *   Le WARN affiché en console est normal et non bloquant.
 */
export function useNotifications(): void {
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // ✅ Remote push token uniquement en dev build (pas en Expo Go)
      // En Expo Go, registerForPushNotifications() retourne null via try/catch
      if (Platform.OS !== 'web') {
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(user.id, token).catch(console.error);
        }
      }

      // ✅ Les rappels locaux (streak + quêtes) fonctionnent en Expo Go iOS
      await scheduleStreakReminder().catch(() => {});
      await scheduleDailyQuestReminder().catch(() => {});
    })();

    // Navigation au tap sur notification
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const type = response.notification.request.content.data?.type as string | undefined;
        switch (type) {
          case 'streak_reminder':
          case 'quest_reminder':
            router.push('/(tabs)/');
            break;
          default:
            break;
        }
      },
    );

    return () => {
      mounted = false;
      if (responseListenerRef.current) {
        Notifications.removeNotificationSubscription(responseListenerRef.current);
      }
    };
  }, []);
}
