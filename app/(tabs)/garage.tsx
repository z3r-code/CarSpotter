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

type Spot = {
  id: string;
  make: string;
  model: string;
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

  const fetchSpots = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .eq('user_id', user.id)
      .order('spotted_at', { ascending: false });
    if (!error && data) {
      setSpots(data);
      setStats({
        total: data.length,
        legendary: data.filter(s => s.rarity === 'légendaire').length,
        epic: data.filter(s => s.rarity === 'épique').length,
      });
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchSpots(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchSpots(); };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'légendaire': return '#FFD700';
      case 'épique': return '#9B59B6';
      case 'rare': return '#3498DB';
      default: return '#555';
    }
  };

  const getRarityEmoji = (rarity: string) => {
    switch (rarity) {
      case 'légendaire': return '👑';
      case 'épique': return '🔥';
      case 'rare': return '💎';
      default: return '⚪';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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

      {/* Detail Modal */}
      <Modal
        visible={selectedSpot !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedSpot(null)}
      >
        {selectedSpot && (
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedSpot(null)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedSpot.photo_url ? (
                <Image
                  source={{ uri: selectedSpot.photo_url }}
                  style={styles.modalPhoto}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.modalPhotoPlaceholder}>
                  <Text style={{ fontSize: 60 }}>📷</Text>
                  <Text style={{ color: '#444', marginTop: 8 }}>Pas de photo</Text>
                </View>
              )}

              <View style={styles.modalContent}>
                <Text style={styles.modalMake}>{selectedSpot.make}</Text>
                <Text style={styles.modalModel}>{selectedSpot.model}</Text>

                <View style={[styles.modalBadge, { backgroundColor: getRarityColor(selectedSpot.rarity) }]}>
                  <Text style={styles.modalBadgeText}>
                    {getRarityEmoji(selectedSpot.rarity)} {selectedSpot.rarity.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.modalSpecs}>
                  <View style={styles.modalSpecRow}>
                    <Text style={styles.modalSpecLabel}>🔧 Moteur</Text>
                    <Text style={styles.modalSpecValue}>{selectedSpot.engine}</Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalSpecRow}>
                    <Text style={styles.modalSpecLabel}>⚡ Puissance</Text>
                    <Text style={styles.modalSpecValue}>{selectedSpot.horsepower} ch</Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalSpecRow}>
                    <Text style={styles.modalSpecLabel}>📅 Spotté</Text>
                    <Text style={styles.modalSpecValue}>{formatDate(selectedSpot.spotted_at)}</Text>
                  </View>
                  {selectedSpot.latitude && (
                    <>
                      <View style={styles.modalDivider} />
                      <View style={styles.modalSpecRow}>
                        <Text style={styles.modalSpecLabel}>📍 Localisation</Text>
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
        <Text style={styles.title}>🛠️ Mon Garage</Text>
        <Text style={styles.subtitle}>{stats.total} voiture{stats.total > 1 ? 's' : ''} spottée{stats.total > 1 ? 's' : ''}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#FFD700' }]}>{stats.legendary}</Text>
          <Text style={styles.statLabel}>👑 Légendaires</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#9B59B6' }]}>{stats.epic}</Text>
          <Text style={styles.statLabel}>🔥 Épiques</Text>
        </View>
      </View>

      {/* Liste */}
      {spots.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🚗</Text>
          <Text style={styles.emptyText}>Ton garage est vide !</Text>
          <Text style={styles.emptySubtext}>Va scanner ta première voiture</Text>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff00" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.spotCard} activeOpacity={0.8} onPress={() => setSelectedSpot(item)}>
              <View style={[styles.rarityBar, { backgroundColor: getRarityColor(item.rarity) }]} />

              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.spotThumbnail} resizeMode="cover" />
              ) : (
                <View style={[styles.spotThumbnail, styles.spotThumbnailEmpty]}>
                  <Text style={{ fontSize: 22 }}>🚗</Text>
                </View>
              )}

              <View style={styles.spotContent}>
                <View style={styles.spotHeader}>
                  <View>
                    <Text style={styles.spotMake}>{item.make}</Text>
                    <Text style={styles.spotModel}>{item.model}</Text>
                  </View>
                  <Text style={styles.rarityEmoji}>{getRarityEmoji(item.rarity)}</Text>
                </View>
                <View style={styles.spotFooter}>
                  <Text style={styles.spotSpec}>⚡ {item.horsepower} ch</Text>
                  <Text style={styles.spotSpec}>🔧 {item.engine}</Text>
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
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#555', fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  statNumber: { color: '#00ff00', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 11, marginTop: 2, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  emptySubtext: { color: '#555', fontSize: 14, marginTop: 8 },
  spotCard: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  rarityBar: { width: 4 },
  spotThumbnail: { width: 72, height: 72, margin: 10, borderRadius: 10 },
  spotThumbnailEmpty: { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  spotContent: { flex: 1, padding: 12 },
  spotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  spotMake: { color: '#888', fontSize: 12 },
  spotModel: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  rarityEmoji: { fontSize: 22 },
  spotFooter: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  spotSpec: { color: '#555', fontSize: 12 },
  spotDate: { color: '#333', fontSize: 12, marginLeft: 'auto' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalClose: { position: 'absolute', top: 16, right: 16, zIndex: 10, backgroundColor: '#222', borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalPhoto: { width: '100%', height: 280 },
  modalPhotoPlaceholder: { width: '100%', height: 280, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  modalContent: { padding: 24 },
  modalMake: { color: '#888', fontSize: 16, marginBottom: 4 },
  modalModel: { color: 'white', fontSize: 42, fontWeight: 'bold', marginBottom: 16 },
  modalBadge: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 24 },
  modalBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  modalSpecs: { backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#222' },
  modalSpecRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  modalSpecLabel: { color: '#666', fontSize: 15 },
  modalSpecValue: { color: 'white', fontSize: 15, fontWeight: '600' },
  modalDivider: { height: 1, backgroundColor: '#1a1a1a' },
});
