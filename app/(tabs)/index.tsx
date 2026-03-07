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
import { C } from '../../constants/colors';

// Couleurs spécifiques à l'écran scanner
const SCAN_RED  = '#FF2D2D'; // Bouton + coins viewfinder
const SCAN_RED_DIM = '#FF2D2D44';

function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
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
  const [isScanning, setIsScanning]     = useState(false);
  const [scanResult, setScanResult]     = useState<ScanResult | null>(null);
  const [saved, setSaved]               = useState(false);
  const [scansToday, setScansToday]     = useState(0);
  const [scanError, setScanError]       = useState<string | null>(null);
  const [debugError, setDebugError]     = useState<string | null>(null);
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
        <Text style={styles.text}>Permission cam\u00e9ra requise</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Autoriser la cam\u00e9ra</Text>
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
      if (!quota.canScan) { setScanError('quota_exceeded'); setIsScanning(false); return; }

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo) throw new Error('takePictureAsync returned null');

      const base64 = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let latitude: number | null  = null;
      let longitude: number | null = null;
      let photoUrl: string | null  = null;

      const [, , car] = await Promise.all([
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              latitude  = loc.coords.latitude;
              longitude = loc.coords.longitude;
            }
          } catch (e) { console.log('GPS error:', e); }
        })(),
        (async () => {
          try {
            const fileName = `${user.id}_${Date.now()}.jpg`;
            const uint8 = base64ToUint8Array(base64);
            const { error: uploadError } = await supabase.storage
              .from('spot-photos').upload(fileName, uint8, { contentType: 'image/jpeg' });
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('spot-photos').getPublicUrl(fileName);
              photoUrl = publicUrl;
            }
          } catch (e) { console.log('Upload failed:', e); }
        })(),
        recognizeCar(base64),
      ]);

      setScanResult({ ...car, photo_url: photoUrl });
      setScansToday(prev => prev + 1);

      const { error } = await supabase.from('spots').insert({
        user_id: user.id, make: car.make, model: car.model, year: car.year,
        engine: car.engine, horsepower: car.horsepower, rarity: car.rarity,
        latitude, longitude, photo_url: photoUrl,
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

  const resetScan = () => { setScanResult(null); setSaved(false); setScanError(null); setDebugError(null); };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'platine':    return C.platinum;
      case 'legendaire': return C.legendary;
      case 'epique':     return C.epic;
      case 'rare':       return C.rare;
      default:           return C.common;
    }
  };

  const scansLeft = MAX_FREE_SCANS_PER_DAY - scansToday;

  // ── Résultat du scan ─────────────────────────────────
  if (scanResult) {
    return (
      <ScrollView contentContainerStyle={styles.resultContainer}>
        <View style={styles.resultAccentLine} />
        <Text style={styles.successText}>SPOT R\u00c9USSI !</Text>

        <View style={[styles.photoWrapper, { borderColor: getRarityColor(scanResult.rarity) }]}>
          {scanResult.photo_url
            ? <Image source={{ uri: scanResult.photo_url }} style={styles.resultPhoto} resizeMode="cover" />
            : <View style={styles.resultPhotoPlaceholder}>
                <Text style={{ color: C.textSecondary, fontSize: 40 }}>\uD83D\uDE97</Text>
              </View>
          }
        </View>

        <View style={[styles.rarityBadge, {
          backgroundColor: getRarityColor(scanResult.rarity) + '33',
          borderColor: getRarityColor(scanResult.rarity),
        }]}>
          <Text style={[styles.rarityText, { color: getRarityColor(scanResult.rarity) }]}>
            {scanResult.rarity.toUpperCase()}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.carTitle}>
            {scanResult.make}{scanResult.year ? ` \u00b7 ${scanResult.year}` : ''}
          </Text>
          <Text style={styles.carModel}>{scanResult.model}</Text>
          <View style={styles.divider} />
          {[
            ['Moteur', scanResult.engine],
            ['Puissance', `${scanResult.horsepower} ch`],
            ['Confiance IA', `${scanResult.confidence}%`],
          ].map(([label, value]) => (
            <View key={label} style={styles.specRow}>
              <Text style={styles.specLabel}>{label}</Text>
              <Text style={styles.specValue}>{value}</Text>
            </View>
          ))}
        </View>

        {saved && (
          <View style={styles.savedBanner}>
            <Text style={styles.savedText}>\u2713 Ajout\u00e9 \u00e0 ton Garage !</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={resetScan}>
          <Text style={styles.buttonText}>Scanner une autre voiture</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Caméra ─────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" ref={cameraRef} />

      {/* Viewfinder — 4 coins rouges */}
      <View style={styles.viewfinder} pointerEvents="none">
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
        {/* Ligne de scan centrale */}
        <View style={styles.scanLine} />
      </View>

      {/* Quota */}
      <View style={styles.quotaBanner} pointerEvents="none">
        <Text style={styles.quotaText}>
          {scansLeft > 0
            ? `${scansLeft} scan${scansLeft > 1 ? 's' : ''} restant${scansLeft > 1 ? 's' : ''}`
            : 'Limite atteinte'}
        </Text>
      </View>

      {/* Quota dépassé */}
      {scanError === 'quota_exceeded' && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Limite atteinte</Text>
          <Text style={styles.errorSubtitle}>
            {`${MAX_FREE_SCANS_PER_DAY} scans utilis\u00e9s aujourd'hui.\nReviens demain !`}
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
          <Text style={styles.errorTitle}>Aucune voiture d\u00e9tect\u00e9e</Text>
          <Text style={styles.errorSubtitle}>R\u00e9essaie avec une meilleure vue !</Text>
          <TouchableOpacity style={styles.button} onPress={resetScan}>
            <Text style={styles.buttonText}>R\u00e9essayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {scanError === 'generic' && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorSubtitle}>{debugError}</Text>
          <TouchableOpacity style={styles.button} onPress={resetScan}>
            <Text style={styles.buttonText}>R\u00e9essayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {isScanning && !scanError && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={SCAN_RED} />
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
            <Text style={[styles.scanButtonText, scansLeft <= 0 && { color: C.textTertiary }]}>
              {scansLeft <= 0 ? 'BLOQU\u00c9' : 'SCANNER'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // ─ Viewfinder ─────────────────────────────────
  viewfinder: { position: 'absolute', top: '25%', left: '10%', right: '10%', bottom: '30%' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 34, height: 34,
    borderTopWidth: 3, borderLeftWidth: 3, borderColor: SCAN_RED, borderTopLeftRadius: 2 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 34, height: 34,
    borderTopWidth: 3, borderRightWidth: 3, borderColor: SCAN_RED, borderTopRightRadius: 2 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 34, height: 34,
    borderBottomWidth: 3, borderLeftWidth: 3, borderColor: SCAN_RED, borderBottomLeftRadius: 2 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34,
    borderBottomWidth: 3, borderRightWidth: 3, borderColor: SCAN_RED, borderBottomRightRadius: 2 },
  scanLine: {
    position: 'absolute', left: 12, right: 12,
    top: '50%', height: 1,
    backgroundColor: SCAN_RED_DIM,
  },

  // ─ Quota ───────────────────────────────────
  quotaBanner: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  quotaText: {
    backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff',
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, fontSize: 13, fontWeight: '600', overflow: 'hidden',
  },

  // ─ Bouton SCANNER ──────────────────────────
  bottomBar:  { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  hint:       { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 18 },
  scanButton: {
    backgroundColor: SCAN_RED,
    paddingVertical: 18, paddingHorizontal: 56,
    borderRadius: 14,
    shadowColor: SCAN_RED, shadowOpacity: 0.5,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  scanButtonDisabled: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, shadowOpacity: 0 },
  scanButtonText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 2 },

  // ─ Overlays ────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.84)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  scanningText:  { color: SCAN_RED, fontSize: 18, fontWeight: 'bold', marginTop: 20, letterSpacing: 1 },
  errorTitle:    { color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  errorSubtitle: { color: C.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  premiumButton: { backgroundColor: C.legendary, paddingVertical: 15, paddingHorizontal: 44, borderRadius: 12, marginBottom: 14 },
  premiumButtonText: { fontSize: 17, fontWeight: 'bold', color: '#000' },
  ghostButton:       { paddingVertical: 10 },
  ghostButtonText:   { color: C.textSecondary, fontSize: 14 },

  // ─ Résultat ─────────────────────────────────
  resultContainer: { flexGrow: 1, backgroundColor: C.bg, alignItems: 'center', padding: 24, paddingTop: 70 },
  resultAccentLine: { width: 48, height: 2, backgroundColor: C.cyan, borderRadius: 1, marginBottom: 20 },
  successText:    { color: C.cyan, fontSize: 26, fontWeight: '900', marginBottom: 20, letterSpacing: 2 },
  photoWrapper:   { width: '100%', borderRadius: 14, overflow: 'hidden', borderWidth: 2, marginBottom: 16 },
  resultPhoto:    { width: '100%', height: 220 },
  resultPhotoPlaceholder: { width: '100%', height: 220, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },
  rarityBadge:    { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 8, marginBottom: 20, borderWidth: 1 },
  rarityText:     { fontWeight: 'bold', fontSize: 12, letterSpacing: 2 },
  card: {
    backgroundColor: C.surface, borderRadius: 14,
    padding: 22, width: '100%',
    borderWidth: 1, borderColor: C.border, marginBottom: 20,
  },
  carTitle:  { color: C.textSecondary, fontSize: 16, fontWeight: '600' },
  carModel:  { color: C.textPrimary, fontSize: 36, fontWeight: 'bold', marginBottom: 16 },
  divider:   { height: 1, backgroundColor: C.border, marginBottom: 16 },
  specRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  specLabel: { color: C.textSecondary, fontSize: 14 },
  specValue: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  savedBanner: {
    backgroundColor: C.cyanSoft, borderWidth: 1, borderColor: C.cyan + '55',
    borderRadius: 10, padding: 12, width: '100%',
    alignItems: 'center', marginBottom: 20,
  },
  savedText: { color: C.cyan, fontSize: 15, fontWeight: '700' },
  button: {
    backgroundColor: SCAN_RED, padding: 16,
    borderRadius: 12, width: '100%', alignItems: 'center',
    shadowColor: SCAN_RED, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
  },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  text: { color: C.textPrimary, fontSize: 16, textAlign: 'center', marginBottom: 20 },
});
