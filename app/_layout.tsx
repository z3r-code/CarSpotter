import { Image } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '../supabase';
import SplashLoader, { SPLASH_IMAGE_URI } from '../components/SplashLoader';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Preload splash image and auth check in parallel
    Image.prefetch(SPLASH_IMAGE_URI)
      .then(() => setImageReady(true))
      .catch(() => setImageReady(true)); // fail-open: show splash even without image

    // Safety timeout: if image takes > 3s, unblock anyway
    const timeout = setTimeout(() => setImageReady(true), 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Both auth AND image must be ready before the bar rushes to 100%
  const splashIsReady = authReady && imageReady;

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
          isReady={splashIsReady}
          onComplete={() => setShowSplash(false)}
        />
      )}
    </View>
  );
}
