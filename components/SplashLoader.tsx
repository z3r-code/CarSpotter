import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

const BAR_WIDTH = width - 64;

// 5 themed backgrounds - swap uri with local require() when adding real assets
const THEMES = [
  {
    id: 'porsche',
    brand: 'PORSCHE',
    tagline: 'Le frisson de la performance',
    uri: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1080&q=85',
    fallbackBg: '#0d0905',
    accent: '#FFD700',
    textColor: '#fff',
  },
  {
    id: 'rolls',
    brand: 'ROLLS-ROYCE',
    tagline: "L'excellence sans compromis",
    uri: 'https://images.unsplash.com/photo-1563720223809-b8d8f77cc6c0?auto=format&fit=crop&w=1080&q=85',
    fallbackBg: '#05050f',
    accent: '#C8C8C8',
    textColor: '#fff',
  },
  {
    id: 'ferrari',
    brand: 'FERRARI',
    tagline: 'Passion. Vitesse. Legende.',
    uri: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=1080&q=85',
    fallbackBg: '#1a0000',
    accent: '#FF2200',
    textColor: '#fff',
  },
  {
    id: 'lamborghini',
    brand: 'LAMBORGHINI',
    tagline: "L'art de la demesure",
    uri: 'https://images.unsplash.com/photo-1616455579100-2ceaa4eb2d37?auto=format&fit=crop&w=1080&q=85',
    fallbackBg: '#0f0800',
    accent: '#FF8C00',
    textColor: '#fff',
  },
  {
    id: 'bugatti',
    brand: 'BUGATTI',
    tagline: 'La perfection en mouvement',
    uri: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1080&q=85',
    fallbackBg: '#00040f',
    accent: '#00BFFF',
    textColor: '#fff',
  },
];

interface Props {
  isReady: boolean;      // becomes true when auth check completes
  onComplete: () => void; // called once bar hits 100% + fade out done
}

export default function SplashLoader({ isReady, onComplete }: Props) {
  // Pick a random theme once on mount
  const [theme] = useState(() => THEMES[Math.floor(Math.random() * THEMES.length)]);

  const barProgress = useRef(new Animated.Value(0)).current; // 0..1
  const fadeAnim = useRef(new Animated.Value(1)).current;     // 1..0 at the end
  const [percent, setPercent] = useState(0);

  // Listen to bar progress to update the percentage text
  useEffect(() => {
    const id = barProgress.addListener(({ value }) => {
      setPercent(Math.round(value * 100));
    });
    return () => barProgress.removeListener(id);
  }, [barProgress]);

  // Stage 1: animate 0 -> 0.78 while waiting for auth
  useEffect(() => {
    Animated.timing(barProgress, {
      toValue: 0.78,
      duration: 1600,
      easing: Easing.bezier(0.4, 0, 0.6, 1),
      useNativeDriver: false,
    }).start();
  }, []);

  // Stage 2: when app is ready, rush to 1.0 then fade out
  useEffect(() => {
    if (!isReady) return;
    Animated.sequence([
      Animated.timing(barProgress, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(350),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, [isReady]);

  const barWidth = barProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_WIDTH],
  });

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <ImageBackground
        source={{ uri: theme.uri }}
        style={styles.bg}
        resizeMode="cover"
        // If image fails to load, fallbackBg is visible
        imageStyle={{ backgroundColor: theme.fallbackBg }}
      >
        {/* Dark overlay for readability */}
        <View style={styles.overlay} />

        {/* ---- Top: App name ---- */}
        <View style={styles.topSection}>
          <Text style={styles.appNameTop}>CAR</Text>
          <Text style={[styles.appNameBottom, { color: theme.accent }]}>SPOTTER</Text>
          <Text style={styles.appTagline}>Spot. Collect. Dominate.</Text>
        </View>

        {/* ---- Center: Brand watermark ---- */}
        <View style={styles.centerSection} pointerEvents="none">
          <Text style={[styles.brandWatermark, { color: theme.accent + '18' }]}>
            {theme.brand}
          </Text>
          <Text style={[styles.brandTagline, { color: theme.accent + 'aa' }]}>
            {theme.tagline}
          </Text>
        </View>

        {/* ---- Bottom: Loading bar ---- */}
        <View style={styles.bottomSection}>
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                { width: barWidth, backgroundColor: theme.accent },
              ]}
            />
            {/* Glowing tip */}
            <Animated.View
              style={[
                styles.barGlow,
                {
                  left: barWidth,
                  backgroundColor: theme.accent,
                  shadowColor: theme.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.percentText, { color: theme.accent }]}>
            {percent}%
          </Text>
          <Text style={styles.loadingLabel}>Chargement en cours...</Text>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  bg: {
    flex: 1,
    justifyContent: 'space-between',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  // Top
  topSection: {
    paddingTop: 80,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  appNameTop: {
    fontSize: 52,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 14,
    lineHeight: 52,
  },
  appNameBottom: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 8,
    lineHeight: 56,
  },
  appTagline: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: 4,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  // Center watermark
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  brandWatermark: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 13,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Bottom
  bottomSection: {
    paddingBottom: 64,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 10,
  },
  barTrack: {
    width: BAR_WIDTH,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barGlow: {
    position: 'absolute',
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    marginLeft: -4,
  },
  percentText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 14,
  },
  loadingLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
