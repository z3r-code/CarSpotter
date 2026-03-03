import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet, Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

type Spot = {
  id: string;
  make: string;
  model: string;
  engine: string;
  horsepower: number;
  rarity: string;
  spotted_at: string;
};

export default function GarageScreen() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, legendary: 0, epic: 0 });

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchSpots();
  };

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
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛠️ Mon Garage</Text>
        <Text style={styles.subtitle}>{stats.total} voiture{stats.total > 1 ? 's' : ''} spottée{stats.total > 1 ? 's' : ''}</Text>
      </View>

      {/* Stats rapides */}
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

      {/* Liste des voitures */}
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
            <TouchableOpacity style={styles.spotCard} activeOpacity={0.8}>
              
              {/* Barre couleur rareté à gauche */}
              <View style={[styles.rarityBar, { backgroundColor: getRarityColor(item.rarity) }]} />
              
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
  spotContent: { flex: 1, padding: 14 },
  spotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  spotMake: { color: '#888', fontSize: 13 },
  spotModel: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  rarityEmoji: { fontSize: 24 },
  spotFooter: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  spotSpec: { color: '#555', fontSize: 12 },
  spotDate: { color: '#333', fontSize: 12, marginLeft: 'auto' },
});
