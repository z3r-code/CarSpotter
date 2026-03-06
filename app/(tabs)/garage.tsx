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
import {
  getLevelInfo,
  getXpForRarity,
  LevelInfo,
} from '../../constants/levels';
import LevelCardModal from '../../components/LevelCardModal';

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
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, legendary: 0, epic: 0 });
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [levelInfo, setLevelInfo] = useState<LevelInfo>(getLevelInfo(0));
  const [levelCardVisible, setLevelCardVisible] = useState(false);
  const [username, setUsername] = useState('Spotter');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const fetchSpots = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get username from email
    setUsername(user.email?.split('@')[0] ?? 'Spotter');

    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .eq('user_id', user.id)
      .order('spotted_at', { ascending: false });

    if (!error && data) {
      setSpots(data);
      setStats({
        total: data.length,
        legendary: data.filter(s => s.rarity === 'legendaire').length,
        epic: data.filter(s => s.rarity === 'epique').length,
      });
      const totalXp = data.reduce((sum, s) => sum + getXpForRarity(s.rarity), 0);
      setLevelInfo(getLevelInfo(totalXp));
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchSpots(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchSpots(); };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'platine':    return '#00FFFF';
      case 'legendaire': return '#FFD700';
      case 'epique':     return '#9B59B6';
      case 'rare':       return '#3498DB';
      default:           return '#555';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'platine':    return 'PLATINE';
      case 'legendaire': return 'LEGENDAIRE';
      case 'epique':     return 'EPIQUE';
      case 'rare':       return 'RARE';
      default:           return 'COMMUN';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const handleImageError = (id: string) => {
    setBrokenImages(prev => new Set(prev).add(id));
  };

  const renderThumbnail = (item: Spot) => {
    if (item.photo_url && !brokenImages.has(item.id)) {
      return (
        <Image
          source={{ uri: item.photo_url }}
          style={styles.spotThumbnail}
          resizeMode="cover"
          onError={() => handleImageError(item.id)}
        />
      );
    }
    return (
      <View style={[styles.spotThumbnail, styles.spotThumbnailEmpty, { borderColor: getRarityColor(item.rarity) + '44' }]}>
        <View style={[styles.rarityDot, { backgroundColor: getRarityColor(item.rarity) }]} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Level Card Modal */}
      <LevelCardModal
        visible={levelCardVisible}
        onClose={() => setLevelCardVisible(false)}
        levelInfo={levelInfo}
        username={username}
      />

      {/* Spot Detail Modal */}
      <Modal
        visible={selectedSpot !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedSpot(null)}
      >
        {selectedSpot && (
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedSpot(null)}>
              <Text style={styles.modalCloseText}>X</Text>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedSpot.photo_url && !brokenImages.has(selectedSpot.id) ? (
                <Image
                  source={{ uri: selectedSpot.photo_url }}
                  style={styles.modalPhoto}
                  resizeMode="cover"
                  onError={() => handleImageError(selectedSpot.id)}
                />
              ) : (
                <View style={[styles.modalPhotoPlaceholder, { borderBottomColor: getRarityColor(selectedSpot.rarity) }]}>
                  <View style={[styles.rarityDotLg, { backgroundColor: getRarityColor(selectedSpot.rarity) }]} />
                  <Text style={{ color: '#333', marginTop: 8, fontSize: 12 }}>Pas de photo</Text>
                </View>
              )}
              <View style={styles.modalContent}>
                <Text style={styles.modalMake}>
                  {selectedSpot.make}{selectedSpot.year ? ` (${selectedSpot.year})` : ''}
                </Text>
                <Text style={styles.modalModel}>{selectedSpot.model}</Text>
                <View style={[styles.modalBadge, {
                  backgroundColor: getRarityColor(selectedSpot.rarity) + '22',
                  borderColor: getRarityColor(selectedSpot.rarity),
                  borderWidth: 1,
                }]}>
                  <Text style={[styles.modalBadgeText, { color: getRarityColor(selectedSpot.rarity) }]}>
                    {getRarityLabel(selectedSpot.rarity)}
                  </Text>
                </View>
                <View style={styles.modalSpecs}>
                  <View style={styles.modalSpecRow}>
                    <Text style={styles.modalSpecLabel}>Moteur</Text>
                    <Text style={styles.modalSpecValue}>{selectedSpot.engine}</Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalSpecRow}>
                    <Text style={styles.modalSpecLabel}>Puissance</Text>
                    <Text style={styles.modalSpecValue}>{selectedSpot.horsepower} ch</Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalSpecRow}>
                    <Text style={styles.modalSpecLabel}>XP gagne</Text>
                    <Text style={[styles.modalSpecValue, { color: getRarityColor(selectedSpot.rarity) }]}>
                      +{getXpForRarity(selectedSpot.rarity)} XP
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalSpecRow}>
                    <Text style={styles.modalSpecLabel}>Spotte le</Text>
                    <Text style={styles.modalSpecValue}>{formatDate(selectedSpot.spotted_at)}</Text>
                  </View>
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
          <Text style={styles.subtitle}>
            {stats.total} voiture{stats.total > 1 ? 's' : ''} spottee{stats.total > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Tappable level badge -> opens LevelCard */}
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => setLevelCardVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.levelBadge,
            { backgroundColor: levelInfo.color + '22', borderColor: levelInfo.color },
          ]}>
            <Text style={[styles.levelText, { color: levelInfo.color }]}>LVL {levelInfo.level}</Text>
          </View>
          <Text style={[styles.levelName, { color: levelInfo.color }]}>{levelInfo.title}</Text>
          <View style={styles.xpBarBg}>
            <View style={[
              styles.xpBarFill,
              { flex: levelInfo.progress, backgroundColor: levelInfo.color },
            ]} />
            <View style={{ flex: Math.max(0, 1 - levelInfo.progress) }} />
          </View>
          <Text style={[styles.xpText, { color: levelInfo.color + 'aa' }]}>
            {levelInfo.level < 99
              ? `${levelInfo.xpInCurrentLevel}/${levelInfo.xpNeededInLevel} XP`
              : 'MAX'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#FFD700' }]}>{stats.legendary}</Text>
          <Text style={styles.statLabel}>Legendaires</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#9B59B6' }]}>{stats.epic}</Text>
          <Text style={styles.statLabel}>Epiques</Text>
        </View>
      </View>

      {/* Spot list */}
      {spots.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Ton garage est vide !</Text>
          <Text style={styles.emptySubtext}>Va scanner ta premiere voiture</Text>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff00" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.spotCard}
              activeOpacity={0.8}
              onPress={() => setSelectedSpot(item)}
            >
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
                    <Text style={[styles.rarityBadgeSmall, { color: getRarityColor(item.rarity), borderColor: getRarityColor(item.rarity) + '44' }]}>
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
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end', minWidth: 110 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#555', fontSize: 14, marginTop: 4 },
  levelBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, marginBottom: 2 },
  levelText: { fontSize: 13, fontWeight: 'bold' },
  levelName: { fontSize: 10, marginBottom: 4 },
  xpBarBg: {
    width: 100, height: 5,
    backgroundColor: '#1a1a1a', borderRadius: 3,
    flexDirection: 'row', overflow: 'hidden', marginBottom: 2,
  },
  xpBarFill: { borderRadius: 3 },
  xpText: { fontSize: 10 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: '#111', borderRadius: 12,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#222',
  },
  statNumber: { color: '#00ff00', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 11, marginTop: 2, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  emptySubtext: { color: '#555', fontSize: 14, marginTop: 8 },
  spotCard: {
    flexDirection: 'row', backgroundColor: '#111',
    borderRadius: 14, marginBottom: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#222',
  },
  rarityBar: { width: 4 },
  spotThumbnail: { width: 72, height: 72, margin: 10, borderRadius: 10 },
  spotThumbnailEmpty: {
    backgroundColor: '#0d0d0d', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  rarityDot: { width: 12, height: 12, borderRadius: 6 },
  rarityDotLg: { width: 24, height: 24, borderRadius: 12 },
  spotContent: { flex: 1, padding: 12 },
  spotHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  spotMake: { color: '#888', fontSize: 12 },
  spotModel: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  spotRight: { alignItems: 'flex-end', gap: 3 },
  xpBadge: { fontSize: 12, fontWeight: 'bold' },
  rarityBadgeSmall: {
    fontSize: 9, fontWeight: '700', letterSpacing: 0.5,
    borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  spotFooter: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  spotSpec: { color: '#555', fontSize: 12 },
  spotDate: { color: '#333', fontSize: 12, marginLeft: 'auto' },
  // Detail modal
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalClose: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    backgroundColor: '#222', borderRadius: 20,
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
  },
  modalCloseText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  modalPhoto: { width: '100%', height: 280 },
  modalPhotoPlaceholder: {
    width: '100%', height: 280, backgroundColor: '#0d0d0d',
    justifyContent: 'center', alignItems: 'center',
    borderBottomWidth: 2,
  },
  modalContent: { padding: 24 },
  modalMake: { color: '#888', fontSize: 16, marginBottom: 4 },
  modalModel: { color: 'white', fontSize: 36, fontWeight: 'bold', marginBottom: 16 },
  modalBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 16,
    paddingVertical: 6, borderRadius: 20, marginBottom: 24,
  },
  modalBadgeText: { fontWeight: 'bold', fontSize: 13, letterSpacing: 1 },
  modalSpecs: { backgroundColor: '#0d0d0d', borderRadius: 16, borderWidth: 1, borderColor: '#1a1a1a' },
  modalSpecRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  modalSpecLabel: { color: '#555', fontSize: 15 },
  modalSpecValue: { color: 'white', fontSize: 15, fontWeight: '600' },
  modalDivider: { height: 1, backgroundColor: '#1a1a1a' },
});
