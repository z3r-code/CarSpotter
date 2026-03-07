import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '../../supabase';
import { C } from '../../constants/colors';

// ~20 km de rayon = latitudeDelta / longitudeDelta de 0.36
const RADIUS_DELTA = 0.36;

type Spot = {
  id: string;
  make: string;
  model: string;
  rarity: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  spotted_at: string;
};

export default function MapScreen() {
  const [spots, setSpots]     = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchSpots();
    zoomToCurrentPosition();
  }, []);

  const zoomToCurrentPosition = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      // Petit délai pour s'assurer que la map est montée
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          {
            latitude:      loc.coords.latitude,
            longitude:     loc.coords.longitude,
            latitudeDelta:  RADIUS_DELTA,
            longitudeDelta: RADIUS_DELTA,
          },
          1200,
        );
      }, 600);
    } catch (e) {
      console.log('Map GPS error:', e);
    }
  };

  const fetchSpots = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('spots')
      .select('id, make, model, rarity, latitude, longitude, photo_url, spotted_at')
      .eq('user_id', user.id)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    if (!error && data) setSpots(data);
    setLoading(false);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendaire': return C.legendary;
      case 'epique':     return C.epic;
      case 'rare':       return C.rare;
      case 'platine':    return C.platinum;
      default:           return C.common;
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loaderText}>Localisation en cours...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Spots</Text>
        <View style={styles.headerAccentLine} />
        <Text style={styles.headerSub}>
          {spots.length} spot{spots.length > 1 ? 's' : ''} sur ta carte
        </Text>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude: 46.8, longitude: 8.2,
          latitudeDelta: 40, longitudeDelta: 60,
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
                {spot.photo_url
                  ? <Image source={{ uri: spot.photo_url }} style={styles.calloutPhoto} resizeMode="cover" />
                  : <View style={styles.calloutPhotoPlaceholder}>
                      <Text style={{ fontSize: 28 }}>\uD83D\uDE97</Text>
                    </View>
                }
                <View style={styles.calloutInfo}>
                  <Text style={styles.calloutMake}>{spot.make}</Text>
                  <Text style={styles.calloutModel}>{spot.model}</Text>
                  <View style={[styles.calloutBadge,
                    { backgroundColor: getRarityColor(spot.rarity) + '33',
                      borderColor: getRarityColor(spot.rarity) }]}>
                    <Text style={[styles.calloutRarity, { color: getRarityColor(spot.rarity) }]}>
                      {spot.rarity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.calloutDate}>{formatDate(spot.spotted_at)}</Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {spots.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>\uD83D\uDCCD Aucun spot g\u00e9olocalis\u00e9</Text>
          <Text style={styles.emptySubText}>Scanne une voiture pour placer ton premier pin !</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loader: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  loaderText: { color: C.cyan, marginTop: 16, fontSize: 15 },

  header: { paddingTop: 60, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: C.bg },
  headerTitle: { color: C.textPrimary, fontSize: 26, fontWeight: '900' },
  headerAccentLine: { width: 36, height: 2, backgroundColor: C.cyan, marginTop: 6, marginBottom: 6, borderRadius: 1 },
  headerSub: { color: C.textSecondary, fontSize: 13 },

  map: { flex: 1 },

  callout: {
    backgroundColor: C.surface, borderRadius: 12, overflow: 'hidden',
    width: 200, borderWidth: 1, borderColor: C.border,
  },
  calloutPhoto: { width: '100%', height: 120 },
  calloutPhotoPlaceholder: {
    width: '100%', height: 120,
    backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center',
  },
  calloutInfo:    { padding: 10 },
  calloutMake:    { color: C.textSecondary, fontSize: 11 },
  calloutModel:   { color: C.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  calloutBadge:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6, borderWidth: 1, alignSelf: 'flex-start' },
  calloutRarity:  { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  calloutDate:    { color: C.textTertiary, fontSize: 11 },

  emptyOverlay: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: 'rgba(12,12,15,0.92)', borderRadius: 14,
    padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  emptyText:    { color: C.textPrimary, fontSize: 16, fontWeight: 'bold' },
  emptySubText: { color: C.textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center' },
});
