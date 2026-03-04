import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>On a besoin de la caméra pour spotter !</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScan = async () => {
    if (!cameraRef.current) return;
    setIsScanning(true);
    setSaved(false);

    await cameraRef.current.takePictureAsync({ quality: 0.5 });

    // Demande la permission GPS et récupère la position
    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
    } catch (e) {
      console.log('GPS non disponible:', e);
    }

    setTimeout(async () => {
      const fakeCar = {
        make: 'Audi',
        model: 'R8',
        engine: 'V10 5.2L',
        horsepower: 570,
        rarity: 'épique',
      };

      setScanResult(fakeCar);
      setIsScanning(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('spots').insert({
          user_id: user.id,
          make: fakeCar.make,
          model: fakeCar.model,
          engine: fakeCar.engine,
          horsepower: fakeCar.horsepower,
          rarity: fakeCar.rarity,
          latitude,
          longitude,
        });
        if (error) {
          console.log('Erreur Supabase:', error.message);
        } else {
          setSaved(true);
        }
      }
    }, 2000);
  };

  const resetScan = () => {
    setScanResult(null);
    setSaved(false);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'légendaire': return '#FFD700';
      case 'épique': return '#9B59B6';
      case 'rare': return '#3498DB';
      default: return '#888';
    }
  };

  if (scanResult) {
    return (
      <ScrollView contentContainerStyle={styles.resultContainer}>
        <Text style={styles.successText}>🎯 SPOT RÉUSSI !</Text>

        <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(scanResult.rarity) }]}>
          <Text style={styles.rarityText}>{scanResult.rarity.toUpperCase()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.carTitle}>{scanResult.make}</Text>
          <Text style={styles.carModel}>{scanResult.model}</Text>
          <View style={styles.divider} />
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>🔧 Moteur</Text>
            <Text style={styles.specValue}>{scanResult.engine}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>⚡ Puissance</Text>
            <Text style={styles.specValue}>{scanResult.horsepower} ch</Text>
          </View>
        </View>

        {saved && (
          <View style={styles.savedBanner}>
            <Text style={styles.savedText}>✅ Ajouté à ton Garage !</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={resetScan}>
          <Text style={styles.buttonText}>📸 Scanner une autre voiture</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        <View style={styles.viewfinder}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>

        {isScanning ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#00ff00" />
            <Text style={styles.scanningText}>Analyse IA en cours...</Text>
          </View>
        ) : (
          <View style={styles.bottomBar}>
            <Text style={styles.hint}>Centre la voiture dans le cadre</Text>
            <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
              <Text style={styles.scanButtonText}>📸 SCANNER</Text>
            </TouchableOpacity>
          </View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  viewfinder: { position: 'absolute', top: '25%', left: '10%', right: '10%', bottom: '30%' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#00ff00' },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#00ff00' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#00ff00' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#00ff00' },
  bottomBar: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  hint: { color: '#aaa', fontSize: 13, marginBottom: 16 },
  scanButton: { backgroundColor: '#00ff00', paddingVertical: 16, paddingHorizontal: 50, borderRadius: 30 },
  scanButtonText: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  scanningText: { color: '#00ff00', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  resultContainer: { flexGrow: 1, backgroundColor: '#000', alignItems: 'center', padding: 24, paddingTop: 80 },
  successText: { color: '#00ff00', fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  rarityBadge: { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  rarityText: { color: 'white', fontWeight: 'bold', fontSize: 13, letterSpacing: 2 },
  card: { backgroundColor: '#111', borderRadius: 20, padding: 24, width: '100%', borderWidth: 1, borderColor: '#222', marginBottom: 20 },
  carTitle: { color: '#aaa', fontSize: 18, fontWeight: '600' },
  carModel: { color: 'white', fontSize: 38, fontWeight: 'bold', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#222', marginBottom: 16 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  specLabel: { color: '#666', fontSize: 15 },
  specValue: { color: 'white', fontSize: 15, fontWeight: '600' },
  savedBanner: { backgroundColor: '#0a2a0a', borderWidth: 1, borderColor: '#00ff00', borderRadius: 12, padding: 12, width: '100%', alignItems: 'center', marginBottom: 20 },
  savedText: { color: '#00ff00', fontSize: 16, fontWeight: '600' },
  button: { backgroundColor: '#00ff00', padding: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: 'bold', color: '#000' },
  text: { color: 'white', fontSize: 16, textAlign: 'center', marginBottom: 20 },
});
