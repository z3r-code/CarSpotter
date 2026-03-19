import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../supabase';
import { recognizeCar, checkScanQuota, MAX_FREE_SCANS_PER_DAY } from '../../services/CarRecognitionService';
import { getXpForRarity } from '../../constants/levels';
import { awardCoins } from '../../services/CoinsService';
import { COINS_PER_RARITY } from '../../constants/coins';
import { C } from '../../constants/colors';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [scanning,     setScanning]     = useState(false);
  const [result,       setResult]       = useState<any>(null);
  const [scansToday,   setScansToday]   = useState(0);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [photoUri,     setPhotoUri]     = useState<string | null>(null);
  const [xpEarned,     setXpEarned]     = useState(0);
  const [coinsEarned,  setCoinsEarned]  = useState(0);

  const cameraRef    = useRef<CameraView>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const resultAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => { loadQuota(); }, []);

  const loadQuota = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const quota = await checkScanQuota(user.id);
    setScansToday(quota.scansToday);
  };

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260],
  });

  const handleScan = async () => {
    if (!cameraRef.current || scanning) return;
    if (scansToday >= MAX_FREE_SCANS_PER_DAY) {
      Alert.alert('Quota atteint', `Tu as utilisé tes ${MAX_FREE_SCANS_PER_DAY} scans du jour. Reviens demain !`);
      return;
    }

    setScanning(true);
    setResult(null);
    setPhotoUri(null);
    setSaved(false);

    try {
      // quality: 0.5 compresse nativement — pas besoin d'expo-image-manipulator
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        exif: false,
      });
      if (!photo?.uri) throw new Error('Aucune photo prise');
      if (!photo.base64) throw new Error('Base64 non disponible');

      setPhotoUri(photo.uri);

      const car = await recognizeCar(photo.base64);
      setResult(car);

      Animated.spring(resultAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }).start();
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? "Impossible d'identifier la voiture");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!result || saving) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      let photoUrl: string | null = null;
      if (photoUri) {
        const filename = `${user.id}/${Date.now()}.jpg`;
        const fileInfo = await FileSystem.getInfoAsync(photoUri);
        if (fileInfo.exists) {
          const base64 = await FileSystem.readAsStringAsync(photoUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const byteCharacters = atob(base64);
          const byteArray = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
          }
          const { error: uploadError } = await supabase.storage
            .from('spot-photos')
            .upload(filename, byteArray, { contentType: 'image/jpeg', upsert: false });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('spot-photos').getPublicUrl(filename);
            photoUrl = urlData.publicUrl;
          }
        }
      }

      let latitude: number | null  = null;
      let longitude: number | null = null;
      if (locationPermission?.granted) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude  = loc.coords.latitude;
        longitude = loc.coords.longitude;
      } else {
        await requestLocationPermission();
      }

      const { error: insertError } = await supabase.from('spots').insert({
        user_id:          user.id,
        make:             result.make,
        model:            result.model,
        year:             result.year,
        engine:           result.engine,
        horsepower:       result.horsepower,
        rarity:           result.rarity,
        photo_url:        photoUrl,
        latitude,
        longitude,
        pokedex_model_id: result.pokedex_model_id ?? null,
      });

      if (insertError) throw new Error(insertError.message);

      const xp    = getXpForRarity(result.rarity);
      const coins = COINS_PER_RARITY[result.rarity as keyof typeof COINS_PER_RARITY] ?? 1;
      await awardCoins(user.id, coins);

      setXpEarned(xp);
      setCoinsEarned(coins);
      setSaved(true);
      setScansToday(prev => prev + 1);
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
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

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'platine':    return 'PLATINE';
      case 'legendaire': return 'LÉGENDAIRE';
      case 'epique':     return 'ÉPIQUE';
      case 'rare':       return 'RARE';
      default:           return 'COMMUN';
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Accès caméra requis</Text>
        <Text style={styles.permSub}>CarSpotter a besoin de ta caméra pour identifier les voitures</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (result) {
    const rarityColor = getRarityColor(result.rarity);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultContent} bounces={false}>
        <Animated.View style={[
          styles.resultWrapper,
          { opacity: resultAnim, transform: [{ scale: resultAnim.interpolate({ inputRange: [0,1], outputRange: [0.95,1] }) }] },
        ]}>
          <Text style={styles.resultTitle}>SPOT RÉUSSI !</Text>

          <View style={[styles.photoFrame, { borderColor: rarityColor }]}>
            {photoUri
              ? <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              : <View style={[styles.photoPlaceholder, { backgroundColor: rarityColor + '22' }]}>
                  <Text style={{ fontSize: 48 }}>🚗</Text>
                </View>
            }
          </View>

          <View style={[styles.rarityBanner, { backgroundColor: rarityColor + '22', borderColor: rarityColor }]}>
            <Text style={[styles.rarityBannerText, { color: rarityColor }]}>
              {getRarityLabel(result.rarity)}
            </Text>
          </View>

          <View style={styles.carInfoCard}>
            <Text style={styles.carMake}>{result.make}</Text>
            <Text style={styles.carModel}>{result.model}</Text>
            <View style={styles.carSpecsDivider} />
            <View style={styles.carSpecs}>
              {[
                ['Moteur',       result.engine],
                ['Puissance',    `${result.horsepower} ch`],
                ['Confiance IA', `${result.confidence}%`],
              ].map(([label, value]) => (
                <View key={label} style={styles.specRow}>
                  <Text style={styles.specLabel}>{label}</Text>
                  <Text style={styles.specValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {saved ? (
            <View style={[styles.savedBanner, { borderColor: rarityColor + '55' }]}>
              <Text style={styles.savedCheck}>✓</Text>
              <Text style={styles.savedText}>Ajouté à ton Garage !</Text>
              <View style={[styles.xpPill, { backgroundColor: rarityColor + '22' }]}>
                <Text style={[styles.xpPillText, { color: rarityColor }]}>+{xpEarned} XP</Text>
              </View>
              <View style={styles.coinsPill}>
                <Text style={styles.coinsPillText}>+{coinsEarned} 🪙</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: rarityColor }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.saveBtnText}>Enregistrer le spot</Text>
              }
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.newScanBtn} onPress={() => {
            setResult(null); setPhotoUri(null); setSaved(false);
          }}>
            <Text style={styles.newScanText}>Nouveau scan</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  }

  const remaining = MAX_FREE_SCANS_PER_DAY - scansToday;

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">

        <View style={styles.quotaBar}>
          <Text style={styles.quotaText}>
            {remaining > 0
              ? `${remaining} scan${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}`
              : "Quota atteint pour aujourd'hui"}
          </Text>
        </View>

        <View style={styles.frameContainer}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: C.cyan }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: C.cyan }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: C.cyan }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: C.cyan }]} />
            <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }], backgroundColor: C.cyan }]} />
          </View>
          <Text style={styles.frameHint}>Centre la voiture dans le cadre</Text>
        </View>

        <View style={styles.bottomBar}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.scanBtn, scanning && styles.scanBtnScanning]}
              onPress={handleScan}
              disabled={scanning || remaining <= 0}
              activeOpacity={0.85}
            >
              {scanning
                ? <ActivityIndicator color="#fff" size="large" />
                : <Text style={styles.scanBtnText}>SCANNER</Text>
              }
            </TouchableOpacity>
          </Animated.View>
        </View>

      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera:    { flex: 1 },

  quotaBar:  { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  quotaText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },

  frameContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  frame:    { width: 280, height: 280, position: 'relative', alignItems: 'center' },
  corner:   { position: 'absolute', width: 28, height: 28, borderWidth: 3 },
  cornerTL: { top: 0,    left: 0,  borderRightWidth: 0,  borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0,    right: 0, borderLeftWidth: 0,   borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0,  borderRightWidth: 0,  borderTopWidth: 0,    borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0,   borderTopWidth: 0,    borderBottomRightRadius: 4 },
  scanLine: {
    position: 'absolute', top: 0, left: 8, right: 8,
    height: 1.5, opacity: 0.7,
  },
  frameHint: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 20, fontWeight: '400' },

  bottomBar: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  scanBtn: {
    backgroundColor:   C.cyan,
    borderRadius:      36,
    paddingHorizontal: 56,
    paddingVertical:   18,
    shadowColor:       C.cyan,
    shadowOffset:      { width: 0, height: 0 },
    shadowOpacity:     0.55,
    shadowRadius:      16,
    elevation:         10,
  },
  scanBtnScanning: { opacity: 0.7 },
  scanBtnText:     { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 2 },

  resultContent:    { padding: 24, paddingTop: 64, paddingBottom: 48 },
  resultWrapper:    { gap: 16 },
  resultTitle:      { color: C.cyan, fontSize: 26, fontWeight: '900', textAlign: 'center', letterSpacing: 1.5 },
  photoFrame:       { borderRadius: 16, borderWidth: 2, overflow: 'hidden' },
  photo:            { width: '100%', height: 240 },
  photoPlaceholder: { width: '100%', height: 240, justifyContent: 'center', alignItems: 'center' },
  rarityBanner:     { alignSelf: 'center', paddingHorizontal: 28, paddingVertical: 8, borderRadius: 24, borderWidth: 1.5 },
  rarityBannerText: { fontWeight: '800', fontSize: 14, letterSpacing: 2 },

  carInfoCard:     { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 20, gap: 4 },
  carMake:         { color: C.textSecondary, fontSize: 14 },
  carModel:        { color: C.textPrimary,   fontSize: 30, fontWeight: '900', lineHeight: 36 },
  carSpecsDivider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  carSpecs:        { gap: 10 },
  specRow:         { flexDirection: 'row', justifyContent: 'space-between' },
  specLabel:       { color: C.textSecondary, fontSize: 14 },
  specValue:       { color: C.textPrimary,   fontSize: 14, fontWeight: '600' },

  savedBanner:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 14, padding: 16, borderWidth: 1 },
  savedCheck:    { color: C.cyan,        fontSize: 16, fontWeight: '900' },
  savedText:     { color: C.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 },
  xpPill:        { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  xpPillText:    { fontSize: 13, fontWeight: '800' },
  coinsPill:     { backgroundColor: C.surfaceHigh, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  coinsPillText: { color: C.legendary, fontSize: 13, fontWeight: '800' },
  saveBtn:       { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  saveBtnText:   { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  newScanBtn:    { alignItems: 'center', paddingVertical: 12 },
  newScanText:   { color: C.textSecondary, fontSize: 15, fontWeight: '500' },

  permContainer: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  permIcon:      { fontSize: 52 },
  permTitle:     { color: C.textPrimary,   fontSize: 22, fontWeight: '800' },
  permSub:       { color: C.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn:       { backgroundColor: C.cyan, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  permBtnText:   { color: '#000', fontSize: 15, fontWeight: '800' },
});
