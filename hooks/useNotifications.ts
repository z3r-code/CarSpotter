import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
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
 * Gère :
 * - Demande de permission + enregistrement du token
 * - Planification des rappels streak & quêtes
 * - Navigation au tap sur une notification
 */
export function useNotifications(): void {
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      const token = await registerForPushNotifications();
      if (token) await savePushToken(user.id, token).catch(console.error);

      await scheduleStreakReminder().catch(console.error);
      await scheduleDailyQuestReminder().catch(console.error);
    })();

    // Navigation à partir d'un tap sur notification
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
