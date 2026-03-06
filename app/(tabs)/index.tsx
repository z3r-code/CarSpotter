import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../supabase';
import {
  MAX_FREE_SCANS_PER_DAY,
  checkScanQuota,
  recognizeCar,
} from '../../services/CarRecognitionService';
import { ScanResult } from '../../types/car.types';

/**
 * Pure-JS base64 -> Uint8Array, no atob needed.
 * Works reliably in Hermes (React Native engine).
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  // Remove padding
  const b64 = base64.replace(/=+$/, '');
  const len = b64.length;
  let bufLen = Math.floor(len * 0.75);
  const bytes = new Uint8Array(bufLen);
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const e1 = lookup[b64.charCodeAt(i)];
    const e2 = lookup[b64.charCodeAt(i + 1)];
    const e3 = lookup[b64.charCodeAt(i + 2)] ?? 0;
    const e4 = lookup[b64.charCodeAt(i + 3)] ?? 0;
    if (p < bufLen) bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bufLen) bytes[p++] = ((e2 & 0xf) << 4) | (e3 >> 2);
    if (p < bufLen) bytes[p++] = ((e3 & 0x3) << 6) | e4;
  }
  return bytes;
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [scansToday, setScansToday] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const quota = await checkScanQuota(user.id).catch(() => ({ scansToday: 0, canScan: true }));
        setScansToday(quota.scansToday);
      }
    })();
  }, []);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission needed</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleScan = async () => {
    if (!cameraRef.current) return;
    setIsScanning(true);
    setSaved(false);
    setScanError(null);
    setDebugError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const quota = await checkScanQuota(user.id).catch(() => ({ scansToday: 0, canScan: true }));
      setScansToday(quota.scansToday);
      if (!quota.canScan) {
        setScanError('quota_exceeded');
        setIsScanning(false);
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo) throw new Error('takePictureAsync returned null');

      // Read as base64 once — reused for both AI and upload
      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let latitude: number | null = null;
      let longitude: number | null = null;
      let photoUrl: string | null = null;

      const [, , car] = await Promise.all([
        // GPS
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              latitude = loc.coords.latitude;
              longitude = loc.coords.longitude;
            }
          } catch (e) {
            console.log('GPS error:', e);
          }
        })(),

        // Upload photo using pure-JS base64 decode (reliable on Hermes)
        (async () => {
          try {
            const fileName = `${user.id}_${Date.now()}.jpg`;
            const uint8 = base64ToUint8Array(base64);
            const { error: uploadError } = await supabase.storage
              .from('spot-photos')
              .upload(fileName, uint8, { contentType: 'image/jpeg' });
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('spot-photos')
                .getPublicUrl(fileName);
              photoUrl = publicUrl;
              console.log('Upload OK:', photoUrl);
            } else {
              console.log('Upload error:', uploadError.message);
            }
          } catch (e) {
            console.log('Upload failed:', e);
          }
        })(),

        // AI recognition
        recognizeCar(base64),
      ]);

      setScanResult({ ...car, photo_url: photoUrl });
      setScansToday((prev) => prev + 1);

      const { error } = await supabase.from('spots').insert({
        user_id: user.id,
        make: car.make,
        model: car.model,
        year: car.year,
        engine: car.engine,
        horsepower: car.horsepower,
        rarity: car.rarity,
        latitude,
        longitude,
        photo_url: photoUrl,
      });
      if (error) console.log('Insert error:', error.message);
      else setSaved(true);

    } catch (err) {
      let msg = '';
      if (err instanceof Error) msg = err.message || err.toString();
      else if (typeof err === 'string') msg = err;
      else msg = JSON.stringify(err);
      if (!msg || msg === 'Error') msg = 'Unknown error';

      console.error('Scan error:', msg);
      setDebugError(msg);
      setScanError(msg.includes('no_car_detected') ? 'no_car' : 'generic');
    } finally {
      setIsScanning(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setSaved(false);
    setScanError(null);
    setDebugError(null);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'platine': return '#00FFFF';
      case 'legendaire': return '#FFD700';
      case 'epique': return '#9B59B6';
      case 'rare': return '#3498DB';
      default: return '#888';
    }
  };

  const scansLeft = MAX_FREE_SCANS_PER_DAY - scansToday;

  // ── Scan Result Screen ───────────────────────────────────
  if (scanResult) {
    return (
      <ScrollView contentContainerStyle={styles.resultContainer}>
        <Text style={styles.successText}>SPOT REUSSI !</Text>

        {/* Photo with rarity color border */}
        <View style={[styles.photoWrapper, { borderColor: getRarityColor(scanResult.rarity) }]}>
          {scanResult.photo_url ? (
            <Image
              source={{ uri: scanResult.photo_url }}
              style={styles.resultPhoto}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.resultPhotoPlaceholder}>
              <Text style={{ color: '#444', fontSize: 40 }}>No photo</Text>
            </View>
          )}
        </View>

        <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(scanResult.rarity) + '33', borderColor: getRarityColor(scanResult.rarity), borderWidth: 1 }]}>
          <Text style={[styles.rarityText, { color: getRarityColor(scanResult.rarity) }]}>
            {scanResult.rarity.toUpperCase()}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.carTitle}>
            {scanResult.make}{scanResult.year ? ` (${scanResult.year})` : ''}
          </Text>
          <Text style={styles.carModel}>{scanResult.model}</Text>
          <View style={styles.divider} />
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Moteur</Text>
            <Text style={styles.specValue}>{scanResult.engine}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Puissance</Text>
            <Text style={styles.specValue}>{scanResult.horsepower} ch</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Confiance IA</Text>
            <Text style={styles.specValue}>{scanResult.confidence}%</Text>
          </View>
        </View>

        {saved && (
          <View style={styles.savedBanner}>
            <Text style={styles.savedText}>Ajoute a ton Garage !</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={resetScan}>
          <Text style={styles.buttonText}>Scanner une autre voiture</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Camera Screen ────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" ref={cameraRef} />

      {/* Viewfinder corners */}
      <View style={styles.viewfinder} pointerEvents="none">
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
      </View>

      {/* Quota badge */}
      <View style={styles.quotaBanner} pointerEvents="none">
        <Text style={styles.quotaText}>
          {scansLeft > 0
            ? `${scansLeft} scan${scansLeft > 1 ? 's' : ''} gratuit${scansLeft > 1 ? 's' : ''} restant${scansLeft > 1 ? 's' : ''}`
            : 'Limite atteinte'}
        </Text>
      </View>

      {scanError === 'quota_exceeded' && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Limite atteinte</Text>
          <Text style={styles.errorSubtitle}>
            {`${MAX_FREE_SCANS_PER_DAY} scans utilises aujourd'hui.\nReviens demain !`}
          </Text>
          <TouchableOpacity style={styles.premiumButton}>
            <Text style={styles.premiumButtonText}>Passer Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostButton} onPress={resetScan}>
            <Text style={styles.ghostButtonText}>Plus tard</Text>
          </TouchableOpacity>
        </View>
      )}

      {scanError === 'no_car' && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Aucune voiture detectee</Text>
          <Text style={styles.errorSubtitle}>Reessaie avec une meilleure vue !</Text>
          <TouchableOpacity style={styles.button} onPress={resetScan}>
            <Text style={styles.buttonText}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {scanError === 'generic' && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorSubtitle}>{debugError}</Text>
          <TouchableOpacity style={styles.button} onPress={resetScan}>
            <Text style={styles.buttonText}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {isScanning && !scanError && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#00ff00" />
          <Text style={styles.scanningText}>Analyse IA en cours...</Text>
        </View>
      )}

      {!isScanning && !scanError && (
        <View style={styles.bottomBar}>
          <Text style={styles.hint}>Centre la voiture dans le cadre</Text>
          <TouchableOpacity
            style={[styles.scanButton, scansLeft <= 0 && styles.scanButtonDisabled]}
            onPress={handleScan}
            disabled={scansLeft <= 0}
          >
            <Text style={[styles.scanButtonText, scansLeft <= 0 && { color: '#666' }]}>
              {scansLeft <= 0 ? 'BLOQUE' : 'SCANNER'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  viewfinder: { position: 'absolute', top: '25%', left: '10%', right: '10%', bottom: '30%' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#00ff00' },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#00ff00' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#00ff00' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#00ff00' },
  quotaBanner: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  quotaText: { backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, fontSize: 13, fontWeight: '600', overflow: 'hidden' },
  bottomBar: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  hint: { color: '#aaa', fontSize: 13, marginBottom: 16 },
  scanButton: { backgroundColor: '#00ff00', paddingVertical: 16, paddingHorizontal: 50, borderRadius: 30 },
  scanButtonDisabled: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  scanButtonText: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  scanningText: { color: '#00ff00', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  errorTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  errorSubtitle: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 28, lineHeight: 20, paddingHorizontal: 10 },
  premiumButton: { backgroundColor: '#FFD700', paddingVertical: 15, paddingHorizontal: 44, borderRadius: 30, marginBottom: 14 },
  premiumButtonText: { fontSize: 17, fontWeight: 'bold', color: '#000' },
  ghostButton: { paddingVertical: 10 },
  ghostButtonText: { color: '#666', fontSize: 14 },
  // Result screen
  resultContainer: { flexGrow: 1, backgroundColor: '#000', alignItems: 'center', padding: 24, paddingTop: 80 },
  successText: { color: '#00ff00', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  photoWrapper: { width: '100%', borderRadius: 20, overflow: 'hidden', borderWidth: 3, marginBottom: 16 },
  resultPhoto: { width: '100%', height: 220 },
  resultPhotoPlaceholder: { width: '100%', height: 220, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  rarityBadge: { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  rarityText: { fontWeight: 'bold', fontSize: 13, letterSpacing: 2 },
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
