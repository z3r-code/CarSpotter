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

// Local asset — replace assets/splash/car.jpg with your photo (see README)
const CAR_IMAGE = require('../assets/splash/car.jpg');

const ACCENT = '#FF8C00'; // Orange sport — change to match your photo mood

interface Props {
  isReady: boolean;
  onComplete: () => void;
}

export default function SplashLoader({ isReady, onComplete }: Props) {
  const barProgress = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const id = barProgress.addListener(({ value }) => {
      setPercent(Math.round(value * 100));
    });
    return () => barProgress.removeListener(id);
  }, [barProgress]);

  // Stage 1: 0 -> 78% during auth check
  useEffect(() => {
    Animated.timing(barProgress, {
      toValue: 0.78,
      duration: 1600,
      easing: Easing.bezier(0.4, 0, 0.6, 1),
      useNativeDriver: false,
    }).start();
  }, []);

  // Stage 2: auth done -> rush 100% then fade out
  useEffect(() => {
    if (!isReady) return;
    Animated.sequence([
      Animated.timing(barProgress, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(300),
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
        source={CAR_IMAGE}
        style={styles.bg}
        resizeMode="cover"
      >
        {/* Dark overlay */}
        <View style={styles.overlay} />

        {/* Top: App name */}
        <View style={styles.topSection}>
          <Text style={styles.appNameTop}>CAR</Text>
          <Text style={[styles.appNameBottom, { color: ACCENT }]}>SPOTTER</Text>
          <Text style={styles.appTagline}>Spot. Collect. Dominate.</Text>
        </View>

        {/* Center: tagline */}
        <View style={styles.centerSection} pointerEvents="none">
          <Text style={[styles.centerTagline, { color: ACCENT + 'cc' }]}>
            L'app des passionnes
          </Text>
          <Text style={[styles.centerSub, { color: ACCENT + '66' }]}>
            Scanne. Identifie. Collectionne.
          </Text>
        </View>

        {/* Bottom: loading bar */}
        <View style={styles.bottomSection}>
          <View style={styles.barTrack}>
            <Animated.View
              style={[styles.barFill, { width: barWidth, backgroundColor: ACCENT }]}
            />
            <Animated.View
              style={[
                styles.barGlow,
                { left: barWidth, backgroundColor: ACCENT, shadowColor: ACCENT },
              ]}
            />
          </View>
          <Text style={[styles.percentText, { color: ACCENT }]}>{percent}%</Text>
          <Text style={styles.loadingLabel}>Chargement en cours...</Text>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  bg: { flex: 1, justifyContent: 'space-between', backgroundColor: '#0a0a0a' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  topSection: {
    paddingTop: 90, paddingHorizontal: 32, alignItems: 'center',
  },
  appNameTop: {
    fontSize: 54, fontWeight: '900', color: '#fff',
    letterSpacing: 16, lineHeight: 54,
  },
  appNameBottom: {
    fontSize: 54, fontWeight: '900',
    letterSpacing: 10, lineHeight: 58,
  },
  appTagline: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11,
    letterSpacing: 5, marginTop: 12, textTransform: 'uppercase',
  },
  centerSection: {
    alignItems: 'center', justifyContent: 'center', flex: 1,
  },
  centerTagline: {
    fontSize: 18, fontWeight: '600',
    letterSpacing: 2, textAlign: 'center',
  },
  centerSub: {
    fontSize: 12, letterSpacing: 1.5,
    textAlign: 'center', marginTop: 8,
  },
  bottomSection: {
    paddingBottom: 70, paddingHorizontal: 32,
    alignItems: 'center', gap: 10,
  },
  barTrack: {
    width: BAR_WIDTH, height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3, overflow: 'visible', position: 'relative',
  },
  barFill: { height: '100%', borderRadius: 3 },
  barGlow: {
    position: 'absolute', top: -3,
    width: 8, height: 8, borderRadius: 4,
    shadowOpacity: 1, shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8, marginLeft: -4,
  },
  percentText: {
    fontSize: 28, fontWeight: 'bold',
    letterSpacing: 2, marginTop: 14,
  },
  loadingLabel: {
    color: 'rgba(255,255,255,0.25)', fontSize: 10,
    letterSpacing: 3, textTransform: 'uppercase',
  },
});
