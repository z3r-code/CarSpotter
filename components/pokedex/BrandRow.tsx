import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { C } from '../../constants/colors';
import { PokedexBrand } from '../../hooks/usePokedex';

interface Props {
  brand:   PokedexBrand;
  onPress: () => void;
}

export function BrandRow({ brand, onPress }: Props) {
  const barW = useSharedValue(0);
  barW.value = withSpring(brand.progress, { damping: 16, stiffness: 70 });
  const barStyle = useAnimatedStyle(() => ({ width: `${barW.value * 100}%` as any }));

  const pct      = Math.round(brand.progress * 100);
  const initial  = (brand.name ?? '?').charAt(0).toUpperCase();
  const isMaster = brand.isMaster;
  const barColor = isMaster ? C.legendary : pct >= 60 ? C.cyan : C.cyanMid;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>

      {/* Avatar initiale */}
      <View style={[styles.avatar, { borderColor: barColor + '66' }]}>
        <Text style={[styles.avatarText, { color: barColor }]}>{initial}</Text>
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.brandName}>{brand.name}</Text>
          <View style={styles.rightCol}>
            {isMaster && <Text style={styles.masterBadge}>{"\uD83C\uDFC6"} MASTER</Text>}
            <Text style={[styles.pctText, { color: barColor }]}>{pct}%</Text>
          </View>
        </View>

        <View style={styles.progressBg}>
          <Animated.View
            style={[styles.progressFill, barStyle, { backgroundColor: barColor }]}
          />
        </View>

        <Text style={styles.countLabel}>
          {brand.unlockedModels}/{brand.totalModels} mod\u00e8le{brand.totalModels !== 1 ? 's' : ''}
        </Text>
      </View>

      <Text style={styles.chevron}>\u203a</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: C.surface,
    borderRadius:    12,
    marginBottom:    8,
    padding:         14,
    borderWidth:     1,
    borderColor:     C.border,
    gap:             12,
  },
  avatar: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: C.surfaceHigh,
    borderWidth:     1.5,
    justifyContent:  'center',
    alignItems:      'center',
  },
  avatarText:  { fontSize: 18, fontWeight: '900' },
  content:     { flex: 1 },
  topRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   8,
  },
  brandName:   { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  rightCol:    { alignItems: 'flex-end', gap: 2 },
  masterBadge: { fontSize: 9, fontWeight: '900', color: C.legendary, letterSpacing: 0.5 },
  pctText:     { fontSize: 13, fontWeight: '900' },
  progressBg: {
    height:          4,
    backgroundColor: C.surfaceTop,
    borderRadius:    2,
    overflow:        'hidden',
    marginBottom:    4,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  countLabel:   { color: C.textTertiary, fontSize: 11 },
  chevron:      { color: C.textTertiary, fontSize: 22, fontWeight: '300' },
});
