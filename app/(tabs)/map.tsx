import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '../../supabase';

type Spot = {
  id: string;
  make: string;
  model: string;
  rarity: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

export default function MapScreen() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpots();
  }, []);

  const fetchSpots = async () => {
    const { data, error } = await supabase
      .from('spots')
      .select('id, make, model, rarity, latitude, longitude, created_at')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (!error && data) {
      setSpots(data);
    }
    setLoading(false);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'légendaire': return '#FFD700';
      case 'épique': return '#9B59B6';
      case 'rare': return '#3498DB';
      default: return '#ff3333';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00ff00" />
        <Text style={styles.loaderText}>Chargement de la carte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺️ Carte des Spots</Text>
        <Text style={styles.headerSub}>{spots.length} spot{spots.length > 1 ? 's' : ''} dans le monde</Text>
      </View>

      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 46.8,
          longitude: 8.2,
          latitudeDelta: 40,
          longitudeDelta: 60,
        }}
        mapType="standard"
      >
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            pinColor={getRarityColor(spot.rarity)}
          >
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutMake}>{spot.make}</Text>
                <Text style={styles.calloutModel}>{spot.model}</Text>
                <View style={[styles.calloutBadge, { backgroundColor: getRarityColor(spot.rarity) }]}>
                  <Text style={styles.calloutRarity}>{spot.rarity.toUpperCase()}</Text>
                </View>
                <Text style={styles.calloutDate}>{formatDate(spot.created_at)}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {spots.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>📍 Aucun spot géolocalisé</Text>
          <Text style={styles.emptySubText}>Scanne une voiture pour placer ton premier pin !</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  loaderText: { color: '#00ff00', marginTop: 16, fontSize: 16 },
  header: {
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  headerTitle: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  headerSub: { color: '#666', fontSize: 13, marginTop: 2 },
  map: { flex: 1 },
  callout: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  calloutMake: { color: '#aaa', fontSize: 12 },
  calloutModel: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  calloutBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6 },
  calloutRarity: { color: 'white', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  calloutDate: { color: '#555', fontSize: 11 },
  emptyOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  emptyText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emptySubText: { color: '#666', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
