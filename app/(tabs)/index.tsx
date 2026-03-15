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
import { COINS_PER_RARITY } from '../../constants/coins';
import { XP_PER_RARITY } from '../../constants/xp';
import { awardCoins } from '../../services/CoinsService';
import { updateDailyQuestsOnScan } from '../../services/dailyQuestService';
import { shareSpotCard } from '../../services/shareCardService';
import { levelUpEmitter } from '../../services/levelUpEmitter';
import { CardFlipReveal } from '../../components/scan/CardFlipReveal';
import { FloatingReward } from '../../components/ui/FloatingRewards';
import { useFloatingRewards } from '../../hooks/useFloatingRewards';

const SCAN_RED     = '#FF2D2D';
const SCAN_RED_DIM = '#FF2D2D44';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000];

function getLevelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const b64    = base64.replace(/=+$/, '');
  const len    = b64.length;
  const bufLen = Math.floor(len * 0.75);
  const bytes  = new Uint8Array(bufLen);
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
  const [showFlip,   setShowFlip]       = useState(false);
  const [saved,      setSaved]          = useState(false);
  const [coinsEarned, setCoinsEarned]   = useState(0);
  const [xpEarned,    setXpEarned]      = useState(0);
  const [scansToday, setScansToday]     = useState(0);
  const [scanError,  setScanError]      = useState<string | null>(null);
  const [debugError, setDebugError]     = useState<string | null>(null);
  const [isSharing,  setIsSharing]      = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const { rewards, triggerReward, removeReward } = useFloatingRewards();

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
        <Text style={styles.text}>Permission caméra requise</Text>
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
    setCoinsEarned(0);
    setXpEarned(0);
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

      let latitude:  number | null = null;
      let longitude: number | null = null;
      let photoUrl:  string | null = null;

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

      // ✅ pokedex_model_id maintenant typé et retourné par recognizeCar
      const pokedexModelId = car.pokedex_model_id ?? null;

      console.log(`[scan] ${car.make} ${car.model} -> pokedex_model_id: ${pokedexModelId}`);

      setScanResult({ ...car, photo_url: photoUrl });
      setShowFlip(true);
      setScansToday(prev => prev + 1);

      const { error: insertError } = await supabase.from('spots').insert({
        user_id:          user.id,
        make:             car.make,
        model:            car.model,
        year:             car.year,
        engine:           car.engine,
        horsepower:       car.horsepower,
        rarity:           car.rarity,
        latitude,
        longitude,
        photo_url:        photoUrl,
        pokedex_model_id: pokedexModelId,
      });

      if (!insertError) {
        setSaved(true);

        const coins = COINS_PER_RARITY[car.rarity] ?? 1;
        setCoinsEarned(coins);
        await awardCoins(user.id, coins);

        const xp = XP_PER_RARITY[car.rarity] ?? 10;
        setXpEarned(xp);

        const { data: profile } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', user.id)
          .single();

        if (profile) {
          const oldLevel = getLevelFromXp(profile.xp ?? 0);
          const newLevel = getLevelFromXp((profile.xp ?? 0) + xp);
          if (newLevel > oldLevel) {
            setTimeout(() => levelUpEmitter.emit('levelUp', { newLevel }), 2200);
          }
        }

        const { error: xpError } = await supabase.rpc('increment_xp', {
          user_id: user.id,
          amount:  xp,
        });
        if (xpError) console.log('XP increment error:', xpError.message);

        setTimeout(() => {
          triggerReward('xp',    xp);
          triggerReward('coins', coins);
        }, 900);

        updateDailyQuestsOnScan(user.id, { rarity: car.rarity, make: car.make })
          .then(completedIds => {
            if (completedIds.length > 0) setTimeout(() => triggerReward('quest', 0), 1400);
          })
          .catch(e => console.log('Daily quest update error:', e));

      } else {
        console.log('[scan] Insert error:', insertError.message);
      }

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

  const handleShare = async () => {
    if (!scanResult) return;
    setIsSharing(true);
    try {
      await shareSpotCard({
        make:     scanResult.make,
        model:    scanResult.model,
        year:     scanResult.year ?? null,
        rarity:   scanResult.rarity as any,
        photoUrl: scanResult.photo_url ?? null,
      });
    } finally {
      setIsSharing(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setShowFlip(false);
    setSaved(false);
    setCoinsEarned(0);
    setXpEarned(0);
    setScanError(null);
    setDebugError(null);
  };

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

  if (scanResult) {
    const rarityColor = getRarityColor(scanResult.rarity);
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={styles.resultAccentLine} />
          <Text style={styles.successText}>SPOT RÉUSSI !</Text>

          <View style={[styles.photoWrapper, { borderColor: rarityColor }]}>
            {scanResult.photo_url
              ? <Image source={{ uri: scanResult.photo_url }} style={styles.resultPhoto} resizeMode="cover" />
              : <View style={styles.resultPhotoPlaceholder}>
                  <Text style={{ color: C.textSecondary, fontSize: 40 }}>🚗</Text>
                </View>
            }
          </View>

          <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '33', borderColor: rarityColor }]}>
            <Text style={[styles.rarityText, { color: rarityColor }]}>{scanResult.rarity.toUpperCase()}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.carTitle}>{scanResult.make}{scanResult.year ? ` · ${scanResult.year}` : ''}</Text>
            <Text style={styles.carModel}>{scanResult.model}</Text>
            <View style={styles.divider} />
            {([
              ['Moteur',       scanResult.engine],
              ['Puissance',    `${scanResult.horsepower} ch`],
              ['Confiance IA', `${scanResult.confidence}%`],
            ] as [string, string][]).map(([label, value]) => (
              <View key={label} style={styles.specRow}>
                <Text style={styles.specLabel}>{label}</Text>
                <Text style={styles.specValue}>{value}</Text>
              </View>
            ))}
          </View>

          {saved && (
            <View style={styles.savedBanner}>
              <View style={styles.savedRow}>
                <Text style={styles.savedText}>✓ Ajouté à ton Garage !</Text>
                <View style={styles.savedRewards}>
                  {xpEarned > 0 && (
                    <View style={[styles.rewardPill, { borderColor: C.cyan + '55' }]}>
                      <Text style={[styles.rewardPillText, { color: C.cyan }]}>+{xpEarned} XP</Text>
                    </View>
                  )}
                  {coinsEarned > 0 && (
                    <View style={styles.coinsBadge}>
                      <Text style={styles.coinsText}>+{coinsEarned} 🪙</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.shareButton, { borderColor: rarityColor }]}
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.8}
            >
              <Text style={[styles.shareButtonText, { color: rarityColor }]}>
                {isSharing ? '...' : '📲 Partager'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={resetScan}>
              <Text style={styles.buttonText}>Scanner encore</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {showFlip && (
          <CardFlipReveal result={scanResult} coinsEarned={coinsEarned} onDismiss={() => setShowFlip(false)} />
        )}

        {rewards.map(item => (
          <FloatingReward key={item.id} item={item} onComplete={removeReward} bottomOffset={180} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" ref={cameraRef} />

      <View style={styles.viewfinder} pointerEvents="none">
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
        <View style={styles.scanLine} />
      </View>

      <View style={styles.quotaBanner} pointerEvents="none">
        <Text style={styles.quotaText}>
          {scansLeft > 0
            ? `${scansLeft} scan${scansLeft > 1 ? 's' : ''} restant${scansLeft > 1 ? 's' : ''}`
            : 'Limite atteinte'}
        </Text>
      </View>

      {scanError === 'quota_exceeded' && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Limite atteinte</Text>
          <Text style={styles.errorSubtitle}>{`${MAX_FREE_SCANS_PER_DAY} scans utilisés aujourd'hui.\nReviens demain !`}</Text>
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
          <Text style={styles.errorTitle}>Aucune voiture détectée</Text>
          <Text style={styles.errorSubtitle}>Réessaie avec une meilleure vue !</Text>
          <TouchableOpacity style={styles.button} onPress={resetScan}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {scanError === 'generic' && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorSubtitle}>{debugError}</Text>
          <TouchableOpacity style={styles.button} onPress={resetScan}>
            <Text style={styles.buttonText}>Réessayer</Text>
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
              {scansLeft <= 0 ? 'BLOQUÉ' : 'SCANNER'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  viewfinder: { position: 'absolute', top: '25%', left: '10%', right: '10%', bottom: '30%' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 34, height: 34, borderTopWidth: 3, borderLeftWidth: 3, borderColor: SCAN_RED, borderTopLeftRadius: 2 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 34, height: 34, borderTopWidth: 3, borderRightWidth: 3, borderColor: SCAN_RED, borderTopRightRadius: 2 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 34, height: 34, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: SCAN_RED, borderBottomLeftRadius: 2 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderBottomWidth: 3, borderRightWidth: 3, borderColor: SCAN_RED, borderBottomRightRadius: 2 },
  scanLine: { position: 'absolute', left: 12, right: 12, top: '50%', height: 1, backgroundColor: SCAN_RED_DIM },
  quotaBanner: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  quotaText:   { backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, fontSize: 13, fontWeight: '600', overflow: 'hidden' },
  bottomBar:   { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  hint:        { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 18 },
  scanButton:  { backgroundColor: SCAN_RED, paddingVertical: 18, paddingHorizontal: 56, borderRadius: 14, shadowColor: SCAN_RED, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  scanButtonDisabled: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, shadowOpacity: 0 },
  scanButtonText:     { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.84)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  scanningText:  { color: SCAN_RED, fontSize: 18, fontWeight: 'bold', marginTop: 20, letterSpacing: 1 },
  errorTitle:    { color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  errorSubtitle: { color: C.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  premiumButton:     { backgroundColor: C.legendary, paddingVertical: 15, paddingHorizontal: 44, borderRadius: 12, marginBottom: 14 },
  premiumButtonText: { fontSize: 17, fontWeight: 'bold', color: '#000' },
  ghostButton:       { paddingVertical: 10 },
  ghostButtonText:   { color: C.textSecondary, fontSize: 14 },
  resultContainer:  { flexGrow: 1, backgroundColor: C.bg, alignItems: 'center', padding: 24, paddingTop: 70 },
  resultAccentLine: { width: 48, height: 2, backgroundColor: C.cyan, borderRadius: 1, marginBottom: 20 },
  successText:   { color: C.cyan, fontSize: 26, fontWeight: '900', marginBottom: 20, letterSpacing: 2 },
  photoWrapper:  { width: '100%', borderRadius: 14, overflow: 'hidden', borderWidth: 2, marginBottom: 16 },
  resultPhoto:   { width: '100%', height: 220 },
  resultPhotoPlaceholder: { width: '100%', height: 220, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },
  rarityBadge:   { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 8, marginBottom: 20, borderWidth: 1 },
  rarityText:    { fontWeight: 'bold', fontSize: 12, letterSpacing: 2 },
  card:          { backgroundColor: C.surface, borderRadius: 14, padding: 22, width: '100%', borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  carTitle:      { color: C.textSecondary, fontSize: 16, fontWeight: '600' },
  carModel:      { color: C.textPrimary, fontSize: 36, fontWeight: 'bold', marginBottom: 16 },
  divider:       { height: 1, backgroundColor: C.border, marginBottom: 16 },
  specRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  specLabel:     { color: C.textSecondary, fontSize: 14 },
  specValue:     { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  savedBanner:   { backgroundColor: C.cyanSoft, borderWidth: 1, borderColor: C.cyan + '55', borderRadius: 10, padding: 14, width: '100%', marginBottom: 16 },
  savedRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savedText:     { color: C.cyan, fontSize: 15, fontWeight: '700' },
  savedRewards:  { flexDirection: 'row', gap: 6 },
  rewardPill:    { backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  rewardPillText: { fontSize: 12, fontWeight: '900' },
  coinsBadge:    { backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.border },
  coinsText:     { color: C.legendary, fontSize: 14, fontWeight: '900' },
  actionsRow:    { width: '100%', gap: 12 },
  shareButton:   { borderWidth: 1.5, padding: 16, borderRadius: 12, width: '100%', alignItems: 'center', backgroundColor: 'transparent' },
  shareButtonText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  button:        { backgroundColor: SCAN_RED, padding: 16, borderRadius: 12, width: '100%', alignItems: 'center', shadowColor: SCAN_RED, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  buttonText:    { fontSize: 16, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  text:          { color: C.textPrimary, fontSize: 16, textAlign: 'center', marginBottom: 20 },
});
