import { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { C } from '../../constants/colors';
import { RarityLevel, ScanResult } from '../../types/car.types';
import { hapticForRarity } from '../../services/hapticService';

interface Props {
  result:      ScanResult;
  coinsEarned: number;
  onDismiss:   () => void;
}

const { width: W } = Dimensions.get('window');
const CARD_W = W * 0.82;
const CARD_H = CARD_W * 1.5;

const RARITY_STYLE: Record<RarityLevel, { color: string; label: string }> = {
  commun:     { color: C.common,    label: 'COMMUN'     },
  rare:       { color: C.rare,      label: 'RARE'       },
  epique:     { color: C.epic,      label: '\u00c9PIQUE'      },
  legendaire: { color: C.legendary, label: 'L\u00c9GENDAIRE' },
  platine:    { color: C.platinum,  label: 'PLATINE'    },
};

export function CardFlipReveal({ result, coinsEarned, onDismiss }: Props) {
  const flip           = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);
  const cfg = RARITY_STYLE[result.rarity] ?? RARITY_STYLE.commun;

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 250 });
    const t = setTimeout(() => {
      flip.value = withSpring(180, { damping: 14, stiffness: 70 });
      hapticForRarity(result.rarity as RarityLevel);
    }, 700);
    return () => clearTimeout(t);
  }, []);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1400 },
      { rotateY: `${interpolate(flip.value, [0, 180], [0, 180])}deg` },
    ],
    opacity: interpolate(flip.value, [0, 89, 90], [1, 1, 0]),
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1400 },
      { rotateY: `${interpolate(flip.value, [0, 180], [180, 360])}deg` },
    ],
    opacity: interpolate(flip.value, [89, 90, 180], [0, 1, 1]),
  }));

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>

      {/* Face avant — brand placeholder */}
      <Animated.View style={[styles.card, styles.absolute, frontStyle, { borderColor: C.borderStrong }]}>
        <View style={styles.frontInner}>
          <Text style={styles.brandText}>
            CAR<Text style={{ color: C.cyan }}>SPOTTER</Text>
          </Text>
          <Text style={{ fontSize: 56, marginVertical: 24 }}>{"\uD83D\uDE97"}</Text>
          <Text style={styles.frontHint}>R\u00e9v\u00e9lation en cours...</Text>
        </View>
      </Animated.View>

      {/* Face arri\u00e8re — r\u00e9sultat */}
      <Animated.View style={[styles.card, styles.absolute, backStyle, { borderColor: cfg.color }]}>
        <View style={[styles.backGlow, { backgroundColor: cfg.color + '18' }]} />
        <View style={styles.backInner}>
          {result.photo_url ? (
            <Image source={{ uri: result.photo_url }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={{ fontSize: 48 }}>{"\uD83D\uDE97"}</Text>
            </View>
          )}
          <View style={[styles.rarityBadge, {
            backgroundColor: cfg.color + '33',
            borderColor:     cfg.color,
          }]}>
            <Text style={[styles.rarityLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.carMake}>
            {result.make}{result.year ? ` \u00b7 ${result.year}` : ''}
          </Text>
          <Text style={styles.carModel}>{result.model}</Text>
          {coinsEarned > 0 && (
            <View style={styles.rewardRow}>
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardText}>+{coinsEarned} {"\uD83E\uDE99"}</Text>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.ctaButton} onPress={onDismiss} activeOpacity={0.8}>
        <Text style={styles.ctaText}>Voir les d\u00e9tails \u2192</Text>
      </TouchableOpacity>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          100,
  },
  card: {
    width:           CARD_W,
    height:          CARD_H,
    borderRadius:    20,
    borderWidth:     2,
    backgroundColor: C.surface,
    overflow:        'hidden',
  },
  absolute: { position: 'absolute' },
  frontInner: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: C.surface,
  },
  brandText: {
    color:        C.textPrimary,
    fontSize:     22,
    fontWeight:   '900',
    letterSpacing: 3,
  },
  frontHint: {
    color:    C.textSecondary,
    fontSize: 13,
    letterSpacing: 1,
  },
  backGlow:  { ...StyleSheet.absoluteFillObject },
  backInner: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        20,
  },
  photo: {
    width:        '100%',
    height:       CARD_H * 0.42,
    borderRadius: 12,
    marginBottom: 16,
  },
  photoPlaceholder: {
    width:           '100%',
    height:          CARD_H * 0.42,
    borderRadius:    12,
    backgroundColor: C.surfaceHigh,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    16,
  },
  rarityBadge: {
    paddingHorizontal: 18,
    paddingVertical:   5,
    borderRadius:      8,
    borderWidth:       1,
    marginBottom:      14,
  },
  rarityLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
  carMake: {
    color:        C.textSecondary,
    fontSize:     14,
    fontWeight:   '600',
    marginBottom: 4,
  },
  carModel: {
    color:       C.textPrimary,
    fontSize:    28,
    fontWeight:  '900',
    textAlign:   'center',
    marginBottom: 16,
  },
  rewardRow:  { flexDirection: 'row' },
  rewardBadge: {
    backgroundColor: C.surfaceTop,
    borderRadius:    10,
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       C.border,
  },
  rewardText: { color: C.legendary, fontSize: 15, fontWeight: '900' },
  ctaButton: {
    position:          'absolute',
    bottom:            60,
    backgroundColor:   C.cyan,
    paddingHorizontal: 36,
    paddingVertical:   14,
    borderRadius:      14,
  },
  ctaText: {
    color:        '#000',
    fontSize:     15,
    fontWeight:   '900',
    letterSpacing: 0.5,
  },
});
