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
import { C } from '../constants/colors';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width - 64;

// 3 fonds d'écran locaux — tournent aléatoirement à chaque lancement
// Pour remplacer : curl -L "https://unsplash.com/photos/{ID}/download?force=true" -o assets/splash/carN.jpg
const BACKGROUNDS = [
  require('../assets/splash/car.jpg'),  // Lamborghini gris
  require('../assets/splash/car2.jpg'), // Voiture sport noire
  require('../assets/splash/car3.jpg'), // Voiture route forêt
];

interface Props {
  isReady: boolean;
  onComplete: () => void;
}

export default function SplashLoader({ isReady, onComplete }: Props) {
  const [bgImage] = useState(() => BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)]);

  const barProgress = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(1)).current;
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const id = barProgress.addListener(({ value }) => setPercent(Math.round(value * 100)));
    return () => barProgress.removeListener(id);
  }, [barProgress]);

  // Stage 1 : 0 → 78 % pendant le chargement auth
  useEffect(() => {
    Animated.timing(barProgress, {
      toValue: 0.78,
      duration: 1600,
      easing: Easing.bezier(0.4, 0, 0.6, 1),
      useNativeDriver: false,
    }).start();
  }, []);

  // Stage 2 : auth ok → rush 100 % puis fade
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
      <ImageBackground source={bgImage} style={styles.bg} resizeMode="cover">
        <View style={styles.overlay} />

        {/* Ligne décorative cyan en haut */}
        <View style={styles.topAccentLine} />

        {/* Nom de l'app */}
        <View style={styles.topSection}>
          <Text style={styles.appNameTop}>CAR</Text>
          <Text style={[styles.appNameBottom, { color: C.cyan }]}>SPOTTER</Text>
          <View style={styles.taglineDivider} />
          <Text style={styles.appTagline}>Spot. Collect. Dominate.</Text>
        </View>

        {/* Centre */}
        <View style={styles.centerSection} pointerEvents="none">
          <Text style={[styles.centerTagline, { color: C.cyan + 'cc' }]}>L'app des passionnes</Text>
          <Text style={[styles.centerSub, { color: C.cyan + '55' }]}>Scanne · Identifie · Collectionne</Text>
        </View>

        {/* Barre de chargement */}
        <View style={styles.bottomSection}>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width: barWidth }]} />
            <Animated.View style={[styles.barGlow, { left: barWidth }]} />
          </View>
          <Text style={[styles.percentText, { color: C.cyan }]}>{percent}%</Text>
          <Text style={styles.loadingLabel}>Chargement en cours...</Text>
        </View>

        {/* Ligne décorative cyan en bas */}
        <View style={styles.bottomAccentLine} />
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:    { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  bg:      { flex: 1, justifyContent: 'space-between', backgroundColor: C.bg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.60)' },

  // Lignes décoratives
  topAccentLine:    { height: 2, backgroundColor: C.cyan, opacity: 0.6 },
  bottomAccentLine: { height: 2, backgroundColor: C.cyan, opacity: 0.3 },
  taglineDivider:   { width: 32, height: 1, backgroundColor: C.cyanMid, marginVertical: 10 },

  topSection: { paddingTop: 86, paddingHorizontal: 32, alignItems: 'center' },
  appNameTop: {
    fontSize: 54, fontWeight: '900', color: '#fff',
    letterSpacing: 16, lineHeight: 54,
  },
  appNameBottom: { fontSize: 54, fontWeight: '900', letterSpacing: 10, lineHeight: 58 },
  appTagline: {
    color: 'rgba(255,255,255,0.30)', fontSize: 11,
    letterSpacing: 5, textTransform: 'uppercase',
  },
  centerSection: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  centerTagline: { fontSize: 17, fontWeight: '600', letterSpacing: 1.5, textAlign: 'center' },
  centerSub:     { fontSize: 12, letterSpacing: 1.5, textAlign: 'center', marginTop: 8 },

  bottomSection: { paddingBottom: 30, paddingHorizontal: 32, alignItems: 'center', gap: 10 },
  barTrack: {
    width: BAR_WIDTH, height: 3,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 3, overflow: 'visible', position: 'relative',
  },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: C.cyan },
  barGlow: {
    position: 'absolute', top: -3, width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.cyan, shadowColor: C.cyan,
    shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
    elevation: 8, marginLeft: -4,
  },
  percentText:  { fontSize: 28, fontWeight: 'bold', letterSpacing: 2, marginTop: 12 },
  loadingLabel: {
    color: 'rgba(255,255,255,0.22)', fontSize: 10,
    letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4,
  },
});
