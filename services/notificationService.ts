import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

// Handler affichage en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  false,
    shouldSetBadge:   false,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ─── Enregistrement ────────────────────────────────────────────

/** Demande la permission et retourne le token Expo Push */
export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('carspotter', {
      name: 'CarSpotter',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#00FFFF',
      sound: 'default',
    });
  }

  try {
    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra as any)?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {},
    );
    return token;
  } catch {
    // Développement local ou simulateur — pas bloquant
    return null;
  }
}

/** Persiste le token dans Supabase */
export async function savePushToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .throwOnError();
}

// ─── Rappels planifiés ────────────────────────────────────────

/** 🔥 Rappel streak à 18h00 chaque jour */
export async function scheduleStreakReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('streak_reminder').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'streak_reminder',
    content: {
      title: '\uD83D\uDD25 Ton streak est en danger !',
      body:  'Scanne une voiture avant minuit pour maintenir ta série.',
      data:  { type: 'streak_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:   18,
      minute: 0,
    },
  });
}

/** \uD83C\uDFAF Rappel quêtes journalières à 9h00 */
export async function scheduleDailyQuestReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('quest_reminder').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'quest_reminder',
    content: {
      title: '\uD83C\uDFAF Nouvelles quêtes disponibles !',
      body:  '3 défis t\'attendent aujourd\'hui. Lance-toi !',
      data:  { type: 'quest_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:   9,
      minute: 0,
    },
  });
}

/** Annule toutes les notifications planifiées */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
