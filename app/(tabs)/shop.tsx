import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../supabase';
import {
  getProfile,
  purchaseItem,
  setActiveAvatar,
} from '../../services/CoinsService';
import { SHOP_ITEMS, ShopItem } from '../../constants/shopItems';
import { C } from '../../constants/colors';

type Profile = {
  coins:         number;
  owned_items:   string[];
  active_avatar: string | null;
};

export default function ShopScreen() {
  const [userId, setUserId]       = useState<string | null>(null);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying]       = useState<string | null>(null); // itemId en cours d'achat

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const p = await getProfile(user.id);
    if (p) setProfile({ coins: p.coins, owned_items: p.owned_items, active_avatar: p.active_avatar });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleBuy = async (item: ShopItem) => {
    if (!userId || !profile) return;
    if (profile.owned_items.includes(item.id)) {
      // Déjà possédé → activer comme avatar
      await setActiveAvatar(userId, item.id);
      setProfile(prev => prev ? { ...prev, active_avatar: item.id } : prev);
      return;
    }
    if (profile.coins < item.price) {
      Alert.alert('Pièces insuffisantes', `Il te faut ${item.price} \uD83E\uDE99 pour cet item.`);
      return;
    }
    setBuying(item.id);
    const result = await purchaseItem(userId, item.id, item.price);
    setBuying(null);
    if (result.success) {
      setProfile(prev => prev ? {
        ...prev,
        coins:       prev.coins - item.price,
        owned_items: [...prev.owned_items, item.id],
        active_avatar: item.id,
      } : prev);
    } else {
      Alert.alert('Erreur', result.reason ?? 'Achat impossible');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.cyan} />
      </View>
    );
  }

  const avatarItems = SHOP_ITEMS.filter(i => i.type === 'avatar');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchProfile(); }}
          tintColor={C.cyan} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shop</Text>
          <View style={styles.accentLine} />
          <Text style={styles.subtitle}>Dépense tes pièces avec goût</Text>
        </View>
        <View style={styles.coinsBadge}>
          <Text style={styles.coinsEmoji}>\uD83E\uDE99</Text>
          <Text style={styles.coinsValue}>{profile?.coins ?? 0}</Text>
        </View>
      </View>

      {/* Section avatars */}
      <Text style={styles.sectionTitle}>Avatars de profil</Text>
      <Text style={styles.sectionSub}>Choisis ton identité dans la communauté</Text>

      <View style={styles.grid}>
        {avatarItems.map((item) => {
          const owned   = profile?.owned_items.includes(item.id) ?? false;
          const active  = profile?.active_avatar === item.id;
          const loading = buying === item.id;

          return (
            <View key={item.id} style={[
              styles.itemCard,
              active && styles.itemCardActive,
            ]}>
              {/* Image */}
              <View style={[styles.imageWrapper,
                active && { borderColor: C.cyan }]}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
                {owned && !active && (
                  <View style={styles.ownedOverlay}>
                    <Text style={styles.ownedIcon}>\u2713</Text>
                  </View>
                )}
                {active && (
                  <View style={styles.activeOverlay}>
                    <Text style={styles.activeIcon}>\u2605</Text>
                  </View>
                )}
                {!owned && (
                  <View style={styles.lockOverlay}>
                    <Text style={styles.lockIcon}>\uD83D\uDD12</Text>
                  </View>
                )}
              </View>

              {/* Infos */}
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>

              {/* Bouton */}
              <TouchableOpacity
                style={[
                  styles.buyBtn,
                  owned  && !active && styles.buyBtnOwned,
                  active && styles.buyBtnActive,
                  (!owned && (profile?.coins ?? 0) < item.price) && styles.buyBtnLocked,
                ]}
                onPress={() => handleBuy(item)}
                disabled={loading || active}
                activeOpacity={0.75}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[
                      styles.buyBtnText,
                      active && { color: C.cyan },
                    ]}>
                      {active  ? '\u2605 Actif'
                       : owned ? 'Activer'
                       : `${item.price} \uD83E\uDE99`}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Coming soon */}
      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonEmoji}>\uD83D\uDCE6</Text>
        <Text style={styles.comingSoonTitle}>Bient\u00f4t disponible</Text>
        <Text style={styles.comingSoonSub}>
          Caisses de boîtes, badges exclusifs et items légendaires arrivent très vite...
        </Text>
      </View>

      {/* Règles de gains */}
      <View style={styles.earnCard}>
        <Text style={styles.earnTitle}>Comment gagner des \uD83E\uDE99 ?</Text>
        {[
          ['\uD83D\uDFE2 Commun',     '+1 pièce'],
          ['\uD83D\uDFE6 Rare',        '+2 pièces'],
          ['\uD83D\uDFE3 \u00c9pique',   '+3 pièces'],
          ['\uD83D\uDFE1 L\u00e9gendaire','+4 pièces'],
          ['\uD83E\uDEE6 Platine',     '+5 pièces'],
          ['\uD83C\uDFAF Qu\u00eate',   '+2 pièces'],
        ].map(([label, value]) => (
          <View key={label} style={styles.earnRow}>
            <Text style={styles.earnLabel}>{label}</Text>
            <Text style={styles.earnValue}>{value}</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { padding: 20, paddingTop: 0, paddingBottom: 40 },
  centered:  { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: 62, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28,
  },
  title:      { color: C.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  accentLine: { width: 36, height: 2, backgroundColor: C.cyan, marginTop: 6, marginBottom: 6, borderRadius: 1 },
  subtitle:   { color: C.textSecondary, fontSize: 13 },
  coinsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border,
  },
  coinsEmoji: { fontSize: 18 },
  coinsValue: { color: C.textPrimary, fontSize: 18, fontWeight: '900' },

  sectionTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionSub:   { color: C.textSecondary, fontSize: 13, marginBottom: 18 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },

  itemCard: {
    width: '47%',
    backgroundColor: C.surface,
    borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center',
  },
  itemCardActive: { borderColor: C.cyan + '88' },

  imageWrapper: {
    width: '100%', aspectRatio: 1,
    borderRadius: 10, overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
    position: 'relative',
  },
  itemImage: { width: '100%', height: '100%' },

  ownedOverlay: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: C.cyan,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  ownedIcon: { color: '#000', fontSize: 12, fontWeight: '900' },

  activeOverlay: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: C.cyan,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  activeIcon: { color: '#000', fontSize: 11, fontWeight: '900' },

  lockOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    paddingVertical: 6,
  },
  lockIcon: { fontSize: 18 },

  itemName: {
    color: C.textPrimary, fontSize: 14, fontWeight: '800',
    marginBottom: 3, textAlign: 'center',
  },
  itemDesc: {
    color: C.textSecondary, fontSize: 11,
    textAlign: 'center', marginBottom: 12, lineHeight: 15,
  },

  buyBtn: {
    width: '100%', paddingVertical: 10,
    borderRadius: 8, backgroundColor: C.cyan,
    alignItems: 'center',
  },
  buyBtnOwned:  { backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border },
  buyBtnActive: { backgroundColor: C.cyanSoft, borderWidth: 1, borderColor: C.cyan + '55' },
  buyBtnLocked: { backgroundColor: C.surfaceHigh, opacity: 0.55 },
  buyBtnText:   { color: '#000', fontSize: 13, fontWeight: '800' },

  comingSoon: {
    backgroundColor: C.surface,
    borderRadius: 14, padding: 22,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', marginBottom: 24, gap: 6,
  },
  comingSoonEmoji: { fontSize: 36, marginBottom: 4 },
  comingSoonTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '800' },
  comingSoonSub:   { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  earnCard: {
    backgroundColor: C.surface, borderRadius: 14,
    padding: 18, borderWidth: 1, borderColor: C.border,
  },
  earnTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 14 },
  earnRow:   {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  earnLabel: { color: C.textSecondary, fontSize: 13 },
  earnValue: { color: C.cyan, fontSize: 13, fontWeight: '700' },
});
