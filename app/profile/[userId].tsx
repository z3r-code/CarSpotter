import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { C } from '../../constants/colors';
import { usePublicProfile, RarityStats } from '../../hooks/usePublicProfile';

const RARITY_ORDER: Array<{ key: keyof RarityStats; label: string; color: string }> = [
  { key: 'platine',    label: 'Platine',    color: C.platinum  },
  { key: 'legendaire', label: 'L\u00e9gendaire', color: C.legendary },
  { key: 'epique',     label: '\u00c9pique',     color: C.epic      },
  { key: 'rare',       label: 'Rare',       color: C.rare      },
  { key: 'commun',     label: 'Commun',     color: C.common    },
];

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data, isLoading, error } = usePublicProfile(userId ?? '');

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.cyan} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Erreur'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={router.back}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { level, rarityStats } = data;
  const maxRarity = Math.max(
    ...Object.values(rarityStats).filter(v => typeof v === 'number'),
    1,
  );

  return (
    <View style={styles.container}>
      {/* Bouton fermer */}
      <TouchableOpacity style={styles.closeBtn} onPress={router.back}>
        <Text style={styles.closeBtnText}>\u2715</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero ─────────────────────── */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: data.avatarBg }]}>
            <Text style={styles.avatarEmoji}>{data.avatarEmoji}</Text>
            {data.isMe && (
              <View style={styles.meTag}>
                <Text style={styles.meTagText}>Moi</Text>
              </View>
            )}
          </View>

          <Text style={styles.username}>{data.username}</Text>

          <View style={[styles.levelBadge, {
            backgroundColor: level.color + '22',
            borderColor:     level.color,
          }]}>
            <Text style={[styles.levelBadgeText, { color: level.color }]}>
              LVL {level.level} \u00b7 {level.name}
            </Text>
          </View>

          {/* Barre XP */}
          <View style={styles.xpBarRow}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, {
                flex:            level.progress,
                backgroundColor: level.color,
              }]} />
              <View style={{ flex: Math.max(0, 1 - level.progress) }} />
            </View>
            <Text style={[styles.xpLabel, { color: level.color + 'aa' }]}>
              {level.totalXp} / {level.nextXp} XP
            </Text>
          </View>
        </View>

        {/* ─── Stats ───────────────────── */}
        <View style={styles.statsGrid}>
          {[
            { emoji: '\uD83D\uDE97', value: data.totalSpots,           label: 'Spots'   },
            { emoji: '\u2B50',      value: level.totalXp,             label: 'XP'      },
            { emoji: '\uD83D\uDD25', value: data.streakCount,          label: 'Streak'  },
            { emoji: '\uD83C\uDFAF', value: data.completedQuestsCount, label: 'Qu\u00eates' },
          ].map(({ emoji, value, label }) => (
            <View key={label} style={styles.statCell}>
              <Text style={styles.statEmoji}>{emoji}</Text>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ─── Raretés ─────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collection</Text>
          {RARITY_ORDER.map(({ key, label, color }) => {
            const count = rarityStats[key];
            const pct   = count / maxRarity;
            return (
              <View key={key} style={styles.rarityRow}>
                <Text style={[styles.rarityLabel, { color }]}>{label}</Text>
                <View style={styles.rarityBarBg}>
                  <View
                    style={[
                      styles.rarityBarFill,
                      { width: `${Math.max(pct * 100, count > 0 ? 4 : 0)}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={[styles.rarityCount, { color }]}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* ─── Spots récents ──────────────── */}
        {data.recentSpots.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spots récents</Text>
            <View style={styles.spotsGrid}>
              {data.recentSpots.map(spot => (
                <View key={spot.id} style={styles.spotCard}>
                  {spot.photo_url ? (
                    <Image
                      source={{ uri: spot.photo_url }}
                      style={styles.spotPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.spotPhoto, styles.spotPhotoPlaceholder]}>
                      <Text style={{ fontSize: 24 }}>\uD83D\uDE97</Text>
                    </View>
                  )}
                  <View style={styles.spotInfo}>
                    <Text style={styles.spotModel} numberOfLines={1}>{spot.model}</Text>
                    <Text style={styles.spotMake}  numberOfLines={1}>{spot.make}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { color: C.textSecondary, fontSize: 16 },

  closeBtn: {
    position:        'absolute',
    top:             16,
    right:           16,
    zIndex:          10,
    backgroundColor: C.surfaceHigh,
    borderRadius:    20,
    width:           36,
    height:          36,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     C.border,
  },
  closeBtnText: { color: C.textPrimary, fontSize: 14, fontWeight: 'bold' },
  backBtn:      { backgroundColor: C.cyan, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backBtnText:  { color: '#000', fontWeight: '800' },

  scroll: { paddingBottom: 40 },

  // ─── Hero
  hero: {
    alignItems:        'center',
    paddingTop:        70,
    paddingBottom:     24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom:      20,
  },
  avatar: {
    width:          100,
    height:         100,
    borderRadius:   50,
    justifyContent: 'center',
    alignItems:     'center',
    marginBottom:   14,
    borderWidth:    2,
    borderColor:    C.border,
  },
  avatarEmoji: { fontSize: 52 },
  meTag: {
    position:        'absolute',
    bottom:          -4,
    right:           -4,
    backgroundColor: C.cyan,
    borderRadius:    10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  meTagText:     { color: '#000', fontSize: 10, fontWeight: '900' },
  username:      { color: C.textPrimary, fontSize: 26, fontWeight: '900', marginBottom: 8 },
  levelBadge: {
    borderRadius:      10,
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderWidth:       1,
    marginBottom:      14,
  },
  levelBadgeText: { fontSize: 13, fontWeight: '700' },
  xpBarRow: { width: '100%', alignItems: 'flex-end', gap: 4 },
  xpBarBg: {
    width:           '100%',
    height:          6,
    backgroundColor: C.surfaceHigh,
    borderRadius:    3,
    flexDirection:   'row',
    overflow:        'hidden',
  },
  xpBarFill: { borderRadius: 3 },
  xpLabel:   { fontSize: 11 },

  // ─── Stats grid
  statsGrid: {
    flexDirection:     'row',
    paddingHorizontal: 16,
    marginBottom:      20,
    gap:               8,
  },
  statCell: {
    flex:            1,
    backgroundColor: C.surface,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     C.border,
    padding:         12,
    alignItems:      'center',
    gap:             3,
  },
  statEmoji: { fontSize: 20 },
  statValue: { color: C.textPrimary,   fontSize: 18, fontWeight: '900' },
  statLabel: { color: C.textTertiary,  fontSize: 10 },

  // ─── Sections
  section: {
    marginHorizontal:  16,
    marginBottom:      20,
    backgroundColor:   C.surface,
    borderRadius:      14,
    padding:           16,
    borderWidth:       1,
    borderColor:       C.border,
  },
  sectionTitle: {
    color:        C.textPrimary,
    fontSize:     15,
    fontWeight:   '800',
    marginBottom: 14,
  },

  // Rareté breakdown
  rarityRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  10,
    gap:           10,
  },
  rarityLabel:  { width: 80, fontSize: 12, fontWeight: '700' },
  rarityBarBg: {
    flex:            1,
    height:          6,
    backgroundColor: C.surfaceTop,
    borderRadius:    3,
    overflow:        'hidden',
  },
  rarityBarFill: { height: '100%', borderRadius: 3 },
  rarityCount:   { width: 28, textAlign: 'right', fontSize: 12, fontWeight: '700' },

  // Spots grid
  spotsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  spotCard: {
    width:           '47%',
    backgroundColor: C.bg,
    borderRadius:    10,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     C.border,
  },
  spotPhoto: { width: '100%', height: 90 },
  spotPhotoPlaceholder: {
    backgroundColor: C.surfaceHigh,
    justifyContent:  'center',
    alignItems:      'center',
  },
  spotInfo:  { padding: 8 },
  spotModel: { color: C.textPrimary,   fontSize: 12, fontWeight: '700', marginBottom: 1 },
  spotMake:  { color: C.textSecondary, fontSize: 10 },
});
