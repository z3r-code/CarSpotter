import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../supabase';
import { getLevelInfo, getXpForRarity, LevelInfo } from '../../constants/levels';
import LevelCardModal from '../../components/LevelCardModal';
import QuestCarousel from '../../components/QuestCarousel';
import { C } from '../../constants/colors';

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

export default function GarageScreen() {
  const [spots, setSpots]         = useState<Spot[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSpots, setTotalSpots] = useState(0);
  const [totalXp, setTotalXp]     = useState(0);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [levelInfo, setLevelInfo]  = useState<LevelInfo>(getLevelInfo(0));
  const [levelCardVisible, setLevelCardVisible] = useState(false);
  const [username, setUsername]    = useState('Spotter');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const fetchSpots = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUsername(user.email?.split('@')[0] ?? 'Spotter');
    const { data, error } = await supabase
      .from('spots').select('*').eq('user_id', user.id)
      .order('spotted_at', { ascending: false });
    if (!error && data) {
      setSpots(data);
      setTotalSpots(data.length);
      const xp = data.reduce((sum, s) => sum + getXpForRarity(s.rarity), 0);
      setTotalXp(xp);
      setLevelInfo(getLevelInfo(xp));
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchSpots(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchSpots(); };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'platine':    return C.platinum;
      case 'legendaire': return C.legendary;
      case 'epique':     return C.epic;
      case 'rare':       return C.rare;
      default:           return C.common;
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'platine':    return 'PLATINE';
      case 'legendaire': return 'L\u00c9GENDAIRE';
      case 'epique':     return '\u00c9PIQUE';
      case 'rare':       return 'RARE';
      default:           return 'COMMUN';
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleImageError = (id: string) =>
    setBrokenImages(prev => new Set(prev).add(id));

  const renderThumbnail = (item: Spot) => {
    if (item.photo_url && !brokenImages.has(item.id)) {
      return (
        <Image source={{ uri: item.photo_url }} style={styles.spotThumbnail}
          resizeMode="cover" onError={() => handleImageError(item.id)} />
      );
    }
    return (
      <View style={[styles.spotThumbnail, styles.spotThumbnailEmpty,
        { borderColor: getRarityColor(item.rarity) + '44' }]}>
        <View style={[styles.rarityDot, { backgroundColor: getRarityColor(item.rarity) }]} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.cyan} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LevelCardModal
        visible={levelCardVisible}
        onClose={() => setLevelCardVisible(false)}
        levelInfo={levelInfo}
        username={username}
      />

      {/* Spot Detail Modal */}
      <Modal visible={selectedSpot !== null} animationType="slide"
        presentationStyle="pageSheet" onRequestClose={() => setSelectedSpot(null)}>
        {selectedSpot && (
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedSpot(null)}>
              <Text style={styles.modalCloseText}>\u2715</Text>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedSpot.photo_url && !brokenImages.has(selectedSpot.id)
                ? <Image source={{ uri: selectedSpot.photo_url }} style={styles.modalPhoto}
                    resizeMode="cover" onError={() => handleImageError(selectedSpot.id)} />
                : <View style={[styles.modalPhotoPlaceholder,
                    { borderBottomColor: getRarityColor(selectedSpot.rarity) }]}>
                    <View style={[styles.rarityDotLg, { backgroundColor: getRarityColor(selectedSpot.rarity) }]} />
                  </View>
              }
              <View style={styles.modalContent}>
                <View style={[styles.modalAccentLine, { backgroundColor: getRarityColor(selectedSpot.rarity) }]} />
                <Text style={styles.modalMake}>
                  {selectedSpot.make}{selectedSpot.year ? ` \u00b7 ${selectedSpot.year}` : ''}
                </Text>
                <Text style={styles.modalModel}>{selectedSpot.model}</Text>
                <View style={[styles.modalBadge, {
                  backgroundColor: getRarityColor(selectedSpot.rarity) + '22',
                  borderColor: getRarityColor(selectedSpot.rarity),
                }]}>
                  <Text style={[styles.modalBadgeText, { color: getRarityColor(selectedSpot.rarity) }]}>
                    {getRarityLabel(selectedSpot.rarity)}
                  </Text>
                </View>
                <View style={styles.modalSpecs}>
                  {[
                    ['Moteur', selectedSpot.engine, null],
                    ['Puissance', `${selectedSpot.horsepower} ch`, null],
                    ['XP gagn\u00e9', `+${getXpForRarity(selectedSpot.rarity)} XP`, getRarityColor(selectedSpot.rarity)],
                    ['Spott\u00e9 le', formatDate(selectedSpot.spotted_at), null],
                  ].map(([label, value, color], i, arr) => (
                    <View key={String(label)}>
                      <View style={styles.modalSpecRow}>
                        <Text style={styles.modalSpecLabel}>{label}</Text>
                        <Text style={[styles.modalSpecValue, color ? { color: String(color) } : {}]}>{value}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={styles.modalDivider} />}
                    </View>
                  ))}
                  {selectedSpot.latitude != null && (
                    <>
                      <View style={styles.modalDivider} />
                      <View style={styles.modalSpecRow}>
                        <Text style={styles.modalSpecLabel}>Localisation</Text>
                        <Text style={styles.modalSpecValue}>
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
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Mon Garage</Text>
          <View style={styles.headerAccentLine} />
          <Text style={styles.subtitle}>
            {totalSpots} voiture{totalSpots > 1 ? 's' : ''} spott\u00e9e{totalSpots > 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerRight}
          onPress={() => setLevelCardVisible(true)} activeOpacity={0.7}>
          <View style={[styles.levelBadge,
            { backgroundColor: levelInfo.color + '22', borderColor: levelInfo.color }]}>
            <Text style={[styles.levelText, { color: levelInfo.color }]}>LVL {levelInfo.level}</Text>
          </View>
          <Text style={[styles.levelName, { color: levelInfo.color }]}>{levelInfo.title}</Text>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill,
              { flex: levelInfo.progress, backgroundColor: levelInfo.color }]} />
            <View style={{ flex: Math.max(0, 1 - levelInfo.progress) }} />
          </View>
          <Text style={[styles.xpText, { color: levelInfo.color + 'aa' }]}>
            {levelInfo.level < 99
              ? `${levelInfo.xpInCurrentLevel}/${levelInfo.xpNeededInLevel} XP`
              : 'MAX'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quest Carousel — remplace les 3 cartes stats */}
      <QuestCarousel spots={spots} totalXp={totalXp} />

      {/* Liste des spots */}
      {spots.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>\uD83D\uDE97</Text>
          <Text style={styles.emptyText}>Ton garage est vide !</Text>
          <Text style={styles.emptySubtext}>Va scanner ta premi\u00e8re voiture</Text>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.spotCard} activeOpacity={0.75}
              onPress={() => setSelectedSpot(item)}>
              <View style={[styles.rarityBar, { backgroundColor: getRarityColor(item.rarity) }]} />
              {renderThumbnail(item)}
              <View style={styles.spotContent}>
                <View style={styles.spotHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.spotMake}>{item.make}</Text>
                    <Text style={styles.spotModel}>{item.model}</Text>
                  </View>
                  <View style={styles.spotRight}>
                    <Text style={[styles.xpBadge, { color: getRarityColor(item.rarity) }]}>
                      +{getXpForRarity(item.rarity)} XP
                    </Text>
                    <Text style={[styles.rarityBadgeSmall,
                      { color: getRarityColor(item.rarity),
                        borderColor: getRarityColor(item.rarity) + '44' }]}>
                      {getRarityLabel(item.rarity)}
                    </Text>
                  </View>
                </View>
                <View style={styles.spotFooter}>
                  <Text style={styles.spotSpec}>{item.horsepower} ch</Text>
                  <Text style={styles.spotSpec}>{item.engine}</Text>
                  <Text style={styles.spotDate}>{formatDate(item.spotted_at)}</Text>
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
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerLeft:  { flex: 1 },
  headerRight: { alignItems: 'flex-end', minWidth: 110 },
  title: { color: C.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  headerAccentLine: { width: 36, height: 2, backgroundColor: C.cyan, marginTop: 6, marginBottom: 6, borderRadius: 1 },
  subtitle: { color: C.textSecondary, fontSize: 13 },
  levelBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, marginBottom: 2 },
  levelText:  { fontSize: 13, fontWeight: 'bold' },
  levelName:  { fontSize: 10, marginBottom: 4 },
  xpBarBg: {
    width: 100, height: 4, backgroundColor: C.surfaceHigh,
    borderRadius: 2, flexDirection: 'row', overflow: 'hidden', marginBottom: 2,
  },
  xpBarFill: { borderRadius: 2 },
  xpText: { fontSize: 10 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyIcon:    { fontSize: 40 },
  emptyText:    { color: C.textPrimary, fontSize: 20, fontWeight: 'bold' },
  emptySubtext: { color: C.textSecondary, fontSize: 14 },
  spotCard: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 10, marginBottom: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: C.border,
  },
  rarityBar: { width: 3 },
  spotThumbnail: { width: 72, height: 72, margin: 10, borderRadius: 8 },
  spotThumbnailEmpty: {
    backgroundColor: C.bg, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1,
  },
  rarityDot:   { width: 12, height: 12, borderRadius: 6 },
  rarityDotLg: { width: 24, height: 24, borderRadius: 12 },
  spotContent: { flex: 1, padding: 12 },
  spotHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  spotMake:  { color: C.textSecondary, fontSize: 12 },
  spotModel: { color: C.textPrimary, fontSize: 17, fontWeight: 'bold' },
  spotRight: { alignItems: 'flex-end', gap: 3 },
  xpBadge:   { fontSize: 12, fontWeight: 'bold' },
  rarityBadgeSmall: {
    fontSize: 9, fontWeight: '700', letterSpacing: 0.5,
    borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  spotFooter: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  spotSpec:   { color: C.textSecondary, fontSize: 12 },
  spotDate:   { color: C.textTertiary, fontSize: 12, marginLeft: 'auto' },
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalClose: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    backgroundColor: C.surfaceHigh, borderRadius: 20,
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  modalCloseText: { color: C.textPrimary, fontSize: 14, fontWeight: 'bold' },
  modalPhoto: { width: '100%', height: 280 },
  modalPhotoPlaceholder: {
    width: '100%', height: 280, backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2,
  },
  modalContent:    { padding: 24 },
  modalAccentLine: { height: 2, width: 48, borderRadius: 1, marginBottom: 16 },
  modalMake:       { color: C.textSecondary, fontSize: 15, marginBottom: 4 },
  modalModel:      { color: C.textPrimary, fontSize: 34, fontWeight: 'bold', marginBottom: 16 },
  modalBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: 8, marginBottom: 24, borderWidth: 1,
  },
  modalBadgeText:  { fontWeight: 'bold', fontSize: 12, letterSpacing: 1.5 },
  modalSpecs:      { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  modalSpecRow:    { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  modalSpecLabel:  { color: C.textSecondary, fontSize: 14 },
  modalSpecValue:  { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  modalDivider:    { height: 1, backgroundColor: C.border },
});
