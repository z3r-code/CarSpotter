import { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '../supabase';
import SplashLoader from '../components/SplashLoader';
import { DailyStreakModal } from '../components/streak/DailyStreakModal';
import { useStreak } from '../hooks/useStreak';

export default function RootLayout() {
  const [session,    setSession]    = useState<Session | null>(null);
  const [authReady,  setAuthReady]  = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const router   = useRouter();
  const segments = useSegments();

  const { streakStatus, showModal, isClaiming, claimStreak, dismissModal } = useStreak();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || showSplash) return;
    const inAuthScreen = segments[0] === 'auth';
    if (!session && !inAuthScreen) {
      router.replace('/auth');
    } else if (session && inAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [session, authReady, showSplash, segments]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Slot />

      {showSplash && (
        <SplashLoader
          isReady={authReady}
          onComplete={() => setShowSplash(false)}
        />
      )}

      {/* Daily Streak Modal — affiché uniquement après le splash et si connecté */}
      {session && streakStatus && !showSplash && (
        <DailyStreakModal
          visible={showModal}
          streakStatus={streakStatus}
          isClaiming={isClaiming}
          onClaim={claimStreak}
          onDismiss={dismissModal}
        />
      )}
    </View>
  );
}
