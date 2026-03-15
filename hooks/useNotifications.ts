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
 * SDK 53+ : removeNotificationSubscription est supprimé.
 * La souscription retourne un objet avec .remove().
 */
export function useNotifications(): void {
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      if (Platform.OS !== 'web') {
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(user.id, token).catch(console.error);
        }
      }

      await scheduleStreakReminder().catch(() => {});
      await scheduleDailyQuestReminder().catch(() => {});
    })();

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
      // SDK 53+ : utiliser .remove() au lieu de removeNotificationSubscription
      responseListenerRef.current?.remove();
    };
  }, []);
}
