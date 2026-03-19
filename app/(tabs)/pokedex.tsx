import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../supabase';
import { C } from '../../constants/colors';
import { getXpForRarity } from '../../constants/levels';

type Spot = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  engine: string;
  horsepower: number;
  rarity: string;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  spotted_at: string;
};

type SortKey = 'date_desc' | 'date_asc' | 'az' | 'za' | 'rarity' | 'hp_desc';

const RARITY_ORDER: Record<string, number> = {
  platine: 5, legendaire: 4, epique: 3, rare: 2, commun: 1,
};

const RARITY_FILTERS = [
  { key: 'all',        label: 'Tous' },
  { key: 'platine',    label: '💎 Platine' },
  { key: 'legendaire', label: '🔥 Légendaire' },
  { key: 'epique',     label: '⚡ Épique' },
  { key: 'rare',       label: '⭐ Rare' },
  { key: 'commun',     label: '⚪ Commun' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_desc', label: 'Plus récent' },
  { key: 'date_asc',  label: 'Plus ancien' },
  { key: 'az',        label: 'A → Z' },
  { key: 'za',        label: 'Z → A' },
  { key: 'rarity',    label: 'Rareté' },
  { key: 'hp_desc',   label: 'Puissance' },
];

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'platine':    return C.platinum;
    case 'legendaire': return C.legendary;
    case 'epique':     return C.epic;
    case 'rare':       return C.rare;
    default:           return C.common;
  }
}

function getRarityLabel(rarity: string): string {
  switch (rarity) {
    case 'platine':    return 'PLATINE';
    case 'legendaire': return 'LÉGENDAIRE';
    case 'epique':     return 'ÉPIQUE';
    case 'rare':       return 'RARE';
    default:           return 'COMMUN';
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function CollectionScreen() {
  const [spots, setSpots]           = useState<Spot[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [sortKey, setSortKey]       = useState<SortKey>('date_desc');
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const fetchSpots = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('spots').select('*').eq('user_id', user.id);
    if (error) console.log('[collection] fetch error:', error.message);
    if (!error && data) setSpots(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchSpots(); }, [fetchSpots]);
  const onRefresh = () => { setRefreshing(true); fetchSpots(); };

  const displayed = useMemo(() => {
    let list = [...spots];
    if (rarityFilter !== 'all') list = list.filter(s => s.rarity === rarityFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(s =>
        s.make.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q) ||
        `${s.make} ${s.model}`.toLowerCase().includes(q)
      );
    }
    switch (sortKey) {
      case 'date_desc': list.sort((a, b) => (b.spotted_at ?? '').localeCompare(a.spotted_at ?? '')); break;
      case 'date_asc':  list.sort((a, b) => (a.spotted_at ?? '').localeCompare(b.spotted_at ?? '')); break;
      case 'az':        list.sort((a, b) => `${a.make}${a.model}`.localeCompare(`${b.make}${b.model}`)); break;
      case 'za':        list.sort((a, b) => `${b.make}${b.model}`.localeCompare(`${a.make}${a.model}`)); break;
      case 'rarity':    list.sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0)); break;
      case 'hp_desc':   list.sort((a, b) => (b.horsepower ?? 0) - (a.horsepower ?? 0)); break;
    }
    return list;
  }, [spots, search, rarityFilter, sortKey]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={C.cyan} /></View>;
  }

  return (
    <View style={styles.container}>

      {/* Detail Modal */}
      <Modal visible={selectedSpot !== null} animationType="slide"
        presentationStyle="pageSheet" onRequestClose={() => setSelectedSpot(null)}>
        {selectedSpot && (
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedSpot(null)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedSpot.photo_url && !brokenImages.has(selectedSpot.id)
                ? <Image source={{ uri: selectedSpot.photo_url }} style={styles.modalPhoto}
                    resizeMode="cover"
                    onError={() => setBrokenImages(p => new Set(p).add(selectedSpot.id))} />
                : <View style={[styles.modalPhotoPlaceholder, { borderBottomColor: getRarityColor(selectedSpot.rarity) }]}>
                    <Text style={{ fontSize: 48 }}>🚗</Text>
                  </View>
              }
              <View style={styles.modalContent}>
                <View style={[styles.modalAccent, { backgroundColor: getRarityColor(selectedSpot.rarity) }]} />
                <Text style={styles.modalMake}>{selectedSpot.make}{selectedSpot.year ? ` · ${selectedSpot.year}` : ''}</Text>
                <Text style={styles.modalModel}>{selectedSpot.model}</Text>
                <View style={[styles.rarityBadge, {
                  backgroundColor: getRarityColor(selectedSpot.rarity) + '22',
                  borderColor: getRarityColor(selectedSpot.rarity),
                }]}>
                  <Text style={[styles.rarityBadgeText, { color: getRarityColor(selectedSpot.rarity) }]}>
                    {getRarityLabel(selectedSpot.rarity)}
                  </Text>
                </View>
                <View style={styles.specCard}>
                  {([
                    ['Moteur',    selectedSpot.engine,                                        null],
                    ['Puissance', `${selectedSpot.horsepower} ch`,                            null],
                    ['XP gagné', `+${getXpForRarity(selectedSpot.rarity)} XP`,               getRarityColor(selectedSpot.rarity)],
                    ['Spotté le', selectedSpot.spotted_at ? formatDate(selectedSpot.spotted_at) : '-', null],
                  ] as [string, string, string | null][]).map(([label, value, color], i, arr) => (
                    <View key={label}>
                      <View style={styles.specRow}>
                        <Text style={styles.specLabel}>{label}</Text>
                        <Text style={[styles.specValue, color ? { color } : {}]}>{value}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={styles.specDivider} />}
                    </View>
                  ))}
                  {selectedSpot.latitude != null && (
                    <>
                      <View style={styles.specDivider} />
                      <View style={styles.specRow}>
                        <Text style={styles.specLabel}>GPS</Text>
                        <Text style={styles.specValue}>
                          {selectedSpot.latitude.toFixed(4)}, {selectedSpot.longitude?.toFixed(4)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Collection</Text>
        <View style={styles.accentLine} />
        <Text style={styles.subtitle}>
          {displayed.length}{rarityFilter !== 'all' || search ? ` / ${spots.length}` : ''} voiture{spots.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une voiture..."
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* ✅ Rarity chips — ScrollView sans maxHeight, padding vertical fixé */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        {RARITY_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, rarityFilter === f.key && styles.chipActive]}
            onPress={() => setRarityFilter(f.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, rarityFilter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ✅ Sort chips — même fix */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortScroll}
        contentContainerStyle={styles.sortContent}
      >
        {SORT_OPTIONS.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sortChip, sortKey === s.key && styles.sortChipActive]}
            onPress={() => setSortKey(s.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.sortChipText, sortKey === s.key && styles.sortChipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {displayed.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{search || rarityFilter !== 'all' ? '🔍' : '🚗'}</Text>
          <Text style={styles.emptyText}>
            {search || rarityFilter !== 'all' ? 'Aucun résultat' : 'Ta collection est vide'}
          </Text>
          <Text style={styles.emptySubtext}>
            {search || rarityFilter !== 'all' ? 'Essaie un autre filtre' : 'Va scanner ta première voiture !'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.75}
              onPress={() => setSelectedSpot(item)}>
              <View style={[styles.rarityBar, { backgroundColor: getRarityColor(item.rarity) }]} />
              {item.photo_url && !brokenImages.has(item.id)
                ? <Image source={{ uri: item.photo_url }} style={styles.thumbnail}
                    resizeMode="cover"
                    onError={() => setBrokenImages(p => new Set(p).add(item.id))} />
                : <View style={[styles.thumbnail, styles.thumbnailEmpty,
                    { borderColor: getRarityColor(item.rarity) + '44' }]}>
                    <Text style={{ fontSize: 22 }}>🚗</Text>
                  </View>
              }
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardMake}>{item.make}</Text>
                    <Text style={styles.cardModel} numberOfLines={1}>{item.model}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={[styles.cardXP, { color: getRarityColor(item.rarity) }]}>
                      +{getXpForRarity(item.rarity)} XP
                    </Text>
                    <View style={[styles.rarityPill, {
                      backgroundColor: getRarityColor(item.rarity) + '22',
                      borderColor: getRarityColor(item.rarity) + '66',
                    }]}>
                      <Text style={[styles.rarityPillText, { color: getRarityColor(item.rarity) }]}>
                        {getRarityLabel(item.rarity)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardSpec}>{item.horsepower} ch</Text>
                  <Text style={styles.cardDot}>·</Text>
                  <Text style={styles.cardSpec} numberOfLines={1} style={[styles.cardSpec, { flex: 1 }]}>{item.engine}</Text>
                  <Text style={styles.cardDate}>
                    {item.spotted_at ? formatDate(item.spotted_at) : '-'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  centered:   { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header:     { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 },
  title:      { color: C.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  accentLine: { width: 36, height: 2, backgroundColor: C.cyan, marginTop: 6, marginBottom: 6, borderRadius: 1 },
  subtitle:   { color: C.textSecondary, fontSize: 13 },

  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 44,
  },
  searchIcon:  { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: 15 },

  // ✅ Plus de maxHeight qui coupe les chips
  chipsScroll:   { marginTop: 10, marginBottom: 2 },
  chipsContent:  { paddingHorizontal: 16, paddingVertical: 4, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: C.border, backgroundColor: C.surface,
  },
  chipActive:     { backgroundColor: C.cyan + '22', borderColor: C.cyan },
  chipText:       { color: C.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: C.cyan, fontWeight: '700' },

  sortScroll:  { marginBottom: 8 },
  sortContent: { paddingHorizontal: 16, paddingVertical: 4, gap: 6, flexDirection: 'row', alignItems: 'center' },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1,
    borderColor: 'transparent', backgroundColor: 'transparent',
  },
  sortChipActive:     { borderColor: C.border, backgroundColor: C.surfaceHigh },
  sortChipText:       { color: C.textTertiary, fontSize: 12 },
  sortChipTextActive: { color: C.textPrimary, fontWeight: '700' },

  listContent: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  card: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 10, marginBottom: 10,
    overflow: 'hidden', borderWidth: 1, borderColor: C.border,
  },
  rarityBar:      { width: 3 },
  thumbnail:      { width: 72, height: 72, margin: 10, borderRadius: 8 },
  thumbnailEmpty: {
    backgroundColor: C.surfaceHigh, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1,
  },
  cardContent: { flex: 1, paddingVertical: 10, paddingRight: 12 },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardMake:    { color: C.textSecondary, fontSize: 11, fontWeight: '500' },
  cardModel:   { color: C.textPrimary, fontSize: 16, fontWeight: '800' },
  cardRight:   { alignItems: 'flex-end', gap: 4 },
  cardXP:      { fontSize: 12, fontWeight: '700' },
  rarityPill:  { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  rarityPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardSpec:    { color: C.textSecondary, fontSize: 12 },
  cardDot:     { color: C.textTertiary, fontSize: 10 },
  cardDate:    { color: C.textTertiary, fontSize: 12 },

  empty:        { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 80 },
  emptyIcon:    { fontSize: 40 },
  emptyText:    { color: C.textPrimary, fontSize: 20, fontWeight: 'bold' },
  emptySubtext: { color: C.textSecondary, fontSize: 14 },

  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalClose: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    backgroundColor: C.surfaceHigh, borderRadius: 20,
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  modalCloseText:  { color: C.textPrimary, fontSize: 14, fontWeight: 'bold' },
  modalPhoto:      { width: '100%', height: 280 },
  modalPhotoPlaceholder: {
    width: '100%', height: 220, backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2,
  },
  modalContent: { padding: 24 },
  modalAccent:  { height: 2, width: 48, borderRadius: 1, marginBottom: 16 },
  modalMake:    { color: C.textSecondary, fontSize: 15, marginBottom: 4 },
  modalModel:   { color: C.textPrimary, fontSize: 34, fontWeight: 'bold', marginBottom: 16 },
  rarityBadge:  {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, marginBottom: 24, borderWidth: 1,
  },
  rarityBadgeText: { fontWeight: 'bold', fontSize: 12, letterSpacing: 1.5 },
  specCard:    { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  specRow:     { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  specLabel:   { color: C.textSecondary, fontSize: 14 },
  specValue:   { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  specDivider: { height: 1, backgroundColor: C.border },
});
