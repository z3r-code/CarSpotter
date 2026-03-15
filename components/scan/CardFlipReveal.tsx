import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../constants/colors';
import { RarityLevel, ScanResult } from '../../types/car.types';
import { hapticForRarity } from '../../services/hapticService';
import { playScanReveal } from '../../services/soundService';

interface Props {
  result:      ScanResult;
  coinsEarned: number;
  onDismiss:   () => void;
}

const { width: W } = Dimensions.get('window');
const CARD_W = W * 0.82;
const CARD_H = CARD_W * 1.5;

const RARITY_CONFIG: Record<RarityLevel, {
  color:    string;
  label:    string;
  shimmer1: string;
  shimmer2: string;
  particles: string[];
}> = {
  commun:     { color: C.common,    label: 'COMMUN',     shimmer1: '#ffffff18', shimmer2: '#ffffff08', particles: ['⬡','⬡'] },
  rare:       { color: C.rare,      label: 'RARE',       shimmer1: '#3B82F644', shimmer2: '#3B82F622', particles: ['✦','✦','✦'] },
  epique:     { color: C.epic,      label: 'ÉPIQUE',     shimmer1: '#A855F755', shimmer2: '#A855F722', particles: ['★','✦','★','✦'] },
  legendaire: { color: C.legendary, label: 'LÉGENDAIRE', shimmer1: '#FFD70066', shimmer2: '#FFD70033', particles: ['★','✦','🔥','✦','★'] },
  platine:    { color: C.cyan,      label: 'PLATINE',    shimmer1: '#00C8FF77', shimmer2: '#00C8FF33', particles: ['💎','★','✦','💎','★','✦'] },
};

function HoloShimmer({ color1, color2, intensity }: { color1: string; color2: string; intensity: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800 / intensity, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1800 / intensity, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-CARD_W, CARD_W] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { transform: [{ translateX }] },
      ]}
    >
      <View style={[
        StyleSheet.absoluteFillObject,
        {
          background: undefined,
          backgroundColor: 'transparent',
          borderLeftWidth: CARD_W * 0.3,
          borderRightWidth: CARD_W * 0.3,
          borderTopWidth: 0,
          borderBottomWidth: 0,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
        }
      ]} />
      <View style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: color1, opacity: 0.6 },
      ]} />
    </Animated.View>
  );
}

function ParticleBurst({ particles, color }: { particles: string[]; color: string }) {
  const anims = useRef(particles.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * 80),
        Animated.spring(anim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
      ])
    );
    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={styles.particleContainer} pointerEvents="none">
      {particles.map((p, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const radius = 80 + (i % 2) * 30;
        const tx = Math.cos(angle) * radius;
        const ty = Math.sin(angle) * radius;
        const scale = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
        const opacity = anims[i].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] });
        const translateX = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, tx] });
        const translateY = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, ty] });
        return (
          <Animated.Text
            key={i}
            style={[
              styles.particle,
              { color, transform: [{ translateX }, { translateY }, { scale }], opacity },
            ]}
          >
            {p}
          </Animated.Text>
        );
      })}
    </View>
  );
}

export function CardFlipReveal({ result, coinsEarned, onDismiss }: Props) {
  const flip           = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale      = useRef(new Animated.Value(0.85)).current;
  const cfg = RARITY_CONFIG[result.rarity] ?? RARITY_CONFIG.commun;
  const shimmerIntensity = result.rarity === 'platine' ? 2 : result.rarity === 'legendaire' ? 1.6 : 1;

  useEffect(() => {
    Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      hapticForRarity(result.rarity as RarityLevel);
      playScanReveal(result.rarity as RarityLevel);
      Animated.parallel([
        Animated.spring(flip, { toValue: 180, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      ]).start();
    }, 700);
    return () => clearTimeout(t);
  }, []);

  const frontRotateY = flip.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotateY  = flip.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flip.interpolate({ inputRange: [0, 89, 90], outputRange: [1, 1, 0] });
  const backOpacity  = flip.interpolate({ inputRange: [89, 90, 180], outputRange: [0, 1, 1] });

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>

      <Animated.View style={[styles.cardWrapper, { transform: [{ scale: cardScale }] }]}>

        {/* Face avant */}
        <Animated.View style={[
          styles.card, styles.absolute,
          { borderColor: C.borderStrong, opacity: frontOpacity, transform: [{ perspective: 1400 }, { rotateY: frontRotateY }] },
        ]}>
          <View style={styles.frontInner}>
            <Text style={styles.brandText}>CAR<Text style={{ color: C.cyan }}>SPOTTER</Text></Text>
            <Text style={{ fontSize: 56, marginVertical: 24 }}>🚗</Text>
            <Text style={styles.frontHint}>Révélation en cours...</Text>
          </View>
        </Animated.View>

        {/* Face arrière — holographique */}
        <Animated.View style={[
          styles.card, styles.absolute,
          { borderColor: cfg.color, borderWidth: 2.5, opacity: backOpacity, transform: [{ perspective: 1400 }, { rotateY: backRotateY }] },
        ]}>
          {/* Fond glow rareté */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: cfg.color + '14' }]} />

          {/* Shimmer holographique */}
          <HoloShimmer color1={cfg.shimmer1} color2={cfg.shimmer2} intensity={shimmerIntensity} />

          <View style={styles.backInner}>
            {result.photo_url ? (
              <Image source={{ uri: result.photo_url }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={{ fontSize: 48 }}>🚗</Text>
              </View>
            )}

            {/* Badge rareté avec glow */}
            <View style={[styles.rarityBadge, { backgroundColor: cfg.color + '33', borderColor: cfg.color }]}>
              <View style={[styles.rarityGlow, { backgroundColor: cfg.color }]} />
              <Text style={[styles.rarityLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>

            <Text style={styles.carMake}>{result.make}{result.year ? ` · ${result.year}` : ''}</Text>
            <Text style={styles.carModel}>{result.model}</Text>

            {coinsEarned > 0 && (
              <View style={styles.rewardRow}>
                <View style={[styles.rewardBadge, { borderColor: C.legendary + '55' }]}>
                  <Text style={styles.rewardText}>+{coinsEarned} 🪙</Text>
                </View>
              </View>
            )}
          </View>

          {/* Particules burst (rarités élevées) */}
          {(result.rarity === 'legendaire' || result.rarity === 'platine' || result.rarity === 'epique') && (
            <ParticleBurst particles={cfg.particles} color={cfg.color} />
          )}
        </Animated.View>

      </Animated.View>

      <TouchableOpacity style={[styles.ctaButton, { backgroundColor: cfg.color }]} onPress={onDismiss} activeOpacity={0.8}>
        <Text style={[styles.ctaText, { color: result.rarity === 'legendaire' ? '#000' : result.rarity === 'platine' ? '#000' : '#fff' }]}>
          Voir les détails →
        </Text>
      </TouchableOpacity>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  cardWrapper: {
    width: CARD_W,
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: C.surface,
    overflow: 'hidden',
  },
  absolute: { position: 'absolute' },
  frontInner: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  brandText:  { color: C.textPrimary, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  frontHint:  { color: C.textSecondary, fontSize: 13, letterSpacing: 1 },
  backInner:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  photo: { width: '100%', height: CARD_H * 0.42, borderRadius: 12, marginBottom: 16 },
  photoPlaceholder: {
    width: '100%', height: CARD_H * 0.42, borderRadius: 12,
    backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  rarityBadge: {
    paddingHorizontal: 18, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
    marginBottom: 14, overflow: 'hidden',
  },
  rarityGlow: { ...StyleSheet.absoluteFillObject, opacity: 0.12 },
  rarityLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
  carMake:    { color: C.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  carModel:   { color: C.textPrimary, fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  rewardRow:  { flexDirection: 'row' },
  rewardBadge: {
    backgroundColor: C.surfaceTop, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1,
  },
  rewardText: { color: C.legendary, fontSize: 15, fontWeight: '900' },
  ctaButton: {
    paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14,
    shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  ctaText:    { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  particleContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  particle:   { position: 'absolute', fontSize: 18 },
});
