import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../supabase';
import { getProfile, purchaseItem, setActiveAvatar } from '../../services/CoinsService';
import { SHOP_ITEMS, ShopItem } from '../../constants/shopItems';
import { C } from '../../constants/colors';

type Profile = {
  coins:         number;
  owned_items:   string[];
  active_avatar: string | null;
};

export default function ShopScreen() {
  const [userId, setUserId]         = useState<string | null>(null);
  const [profile, setProfile]       = useState<Profile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying]         = useState<string | null>(null);

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
      await setActiveAvatar(userId, item.id);
      setProfile(prev => prev ? { ...prev, active_avatar: item.id } : prev);
      return;
    }
    if (profile.coins < item.price) {
      Alert.alert('Pièces insuffisantes', `Il te faut ${item.price} 🪙 pour cet item.`);
      return;
    }
    setBuying(item.id);
    const result = await purchaseItem(userId, item.id, item.price);
    setBuying(null);
    if (result.success) {
      setProfile(prev => prev ? {
        ...prev,
        coins:        prev.coins - item.price,
        owned_items:  [...prev.owned_items, item.id],
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchProfile(); }}
          tintColor={C.cyan}
        />
      }
    >
      {/* ── Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shop</Text>
          <View style={styles.accentLine} />
          <Text style={styles.subtitle}>Dépense tes pièces avec goût</Text>
        </View>
        <View style={styles.coinsBadge}>
          <Text style={styles.coinsEmoji}>🪙</Text>
          <Text style={styles.coinsValue}>{profile?.coins ?? 0}</Text>
        </View>
      </View>

      {/* ── Avatars ───────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Avatars de profil</Text>
      <Text style={styles.sectionSub}>Choisis ton identité dans la communauté</Text>

      <View style={styles.grid}>
        {SHOP_ITEMS.map((item) => {
          const owned   = profile?.owned_items.includes(item.id) ?? false;
          const active  = profile?.active_avatar === item.id;
          const isLoading = buying === item.id;

          return (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                active && { borderColor: C.cyan + '88' },
              ]}
            >
              {/* Avatar visuel emoji */}
              <View style={[
                styles.avatarBox,
                { backgroundColor: item.bgColor, borderColor: active ? C.cyan : item.borderColor },
              ]}>
                <Text style={styles.avatarEmoji}>{item.emoji}</Text>

                {/* Badges état */}
                {active && (
                  <View style={[styles.stateBadge, { backgroundColor: C.cyan }]}>
                    <Text style={styles.stateBadgeText}>★</Text>
                  </View>
                )}
                {owned && !active && (
                  <View style={[styles.stateBadge, { backgroundColor: '#333' }]}>
                    <Text style={styles.stateBadgeText}>✓</Text>
                  </View>
                )}
                {!owned && (
                  <View style={styles.lockBar}>
                    <Text style={styles.lockText}>🔒</Text>
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
                  owned && !active && styles.buyBtnOwned,
                  active           && styles.buyBtnActive,
                  (!owned && (profile?.coins ?? 0) < item.price) && styles.buyBtnLocked,
                ]}
                onPress={() => handleBuy(item)}
                disabled={isLoading || active}
                activeOpacity={0.75}
              >
                {isLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[styles.buyBtnText, active && { color: C.cyan }]}>
                      {active ? '★ Actif' : owned ? 'Activer' : `${item.price} 🪙`}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* ── Coming soon ───────────────────────────────────── */}
      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonEmoji}>📦</Text>
        <Text style={styles.comingSoonTitle}>Bientôt disponible</Text>
        <Text style={styles.comingSoonSub}>
          Caisses de boîtes, badges exclusifs et items légendaires arrivent très vite...
        </Text>
      </View>

      {/* ── Tableau gains ─────────────────────────────────── */}
      <View style={styles.earnCard}>
        <Text style={styles.earnTitle}>Comment gagner des 🪙 ?</Text>
        {([
          ['🟢 Commun',      '+1 pièce'],
          ['🟦 Rare',         '+2 pièces'],
          ['🟣 Épique',       '+3 pièces'],
          ['🟡 Légendaire',   '+4 pièces'],
          ['🫧 Platine',      '+5 pièces'],
          ['🎯 Quête',        '+2 pièces'],
        ] as [string, string][]).map(([label, value], i, arr) => (
          <View
            key={label}
            style={[
              styles.earnRow,
              i === arr.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
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
  scroll:    { padding: 20, paddingTop: 0, paddingBottom: 50 },
  centered:  { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },

  // Header
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

  // Sections
  sectionTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionSub:   { color: C.textSecondary, fontSize: 13, marginBottom: 18 },

  // Grille
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },

  itemCard: {
    width: '47%',
    backgroundColor: C.surface, borderRadius: 14,
    padding: 12, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center',
  },

  // Avatar emoji box
  avatarBox: {
    width: '100%', aspectRatio: 1,
    borderRadius: 10, marginBottom: 10,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  avatarEmoji: { fontSize: 52 },

  stateBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  stateBadgeText: { color: '#000', fontSize: 11, fontWeight: '900' },

  lockBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4, alignItems: 'center',
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
  },
  lockText: { fontSize: 16 },

  itemName: { color: C.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 3, textAlign: 'center' },
  itemDesc: { color: C.textSecondary, fontSize: 11, textAlign: 'center', marginBottom: 12, lineHeight: 15 },

  buyBtn:       { width: '100%', paddingVertical: 10, borderRadius: 8, backgroundColor: C.cyan, alignItems: 'center' },
  buyBtnOwned:  { backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border },
  buyBtnActive: { backgroundColor: C.cyanSoft, borderWidth: 1, borderColor: C.cyan + '55' },
  buyBtnLocked: { backgroundColor: C.surfaceHigh, opacity: 0.5 },
  buyBtnText:   { color: '#000', fontSize: 13, fontWeight: '800' },

  // Coming soon
  comingSoon: {
    backgroundColor: C.surface, borderRadius: 14, padding: 22,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', marginBottom: 20, gap: 6,
  },
  comingSoonEmoji: { fontSize: 36, marginBottom: 4 },
  comingSoonTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '800' },
  comingSoonSub:   { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Gains
  earnCard: {
    backgroundColor: C.surface, borderRadius: 14,
    padding: 18, borderWidth: 1, borderColor: C.border,
  },
  earnTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 14 },
  earnRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  earnLabel: { color: C.textSecondary, fontSize: 13 },
  earnValue: { color: C.cyan, fontSize: 13, fontWeight: '700' },
});
