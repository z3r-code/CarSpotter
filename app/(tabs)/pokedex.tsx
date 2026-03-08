import { useState } from 'react';
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
import { C } from '../../constants/colors';
import { BrandEntry, usePokedex } from '../../hooks/usePokedex';
import { BrandRow } from '../../components/pokedex/BrandRow';

export default function PokedexScreen() {
  const { brands, isLoading, totalScanned, totalKnown, refresh } = usePokedex();
  const [refreshing,    setRefreshing]    = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandEntry | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
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
      case 'legendaire': return 'L\u00c9GENDAIRE';
      case 'epique':     return '\u00c9PIQUE';
      case 'rare':       return 'RARE';
      default:           return 'COMMUN';
    }
  };

  const globalPct = totalKnown > 0 ? Math.round((totalScanned / totalKnown) * 100) : 0;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.cyan} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Modal drill-down modèles */}
      <Modal
        visible={selectedBrand !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedBrand(null)}
      >
        {selectedBrand && (
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedBrand(null)}>
              <Text style={styles.modalCloseText}>\u2715</Text>
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedBrand.brand}</Text>
              <Text style={styles.modalSubtitle}>
                {selectedBrand.scanned}/{selectedBrand.total} mod\u00e8les\u00a0\u00b7\u00a0
                {Math.round(selectedBrand.pct * 100)}% complet
              </Text>

              {/* Barre de progression du modal */}
              <View style={styles.modalProgressBg}>
                <View
                  style={[
                    styles.modalProgressFill,
                    { width: `${Math.round(selectedBrand.pct * 100)}%` },
                  ]}
                />
              </View>
            </View>

            <FlatList
              data={selectedBrand.models}
              keyExtractor={(_, i) => String(i)}
              numColumns={2}
              contentContainerStyle={styles.modelGrid}
              renderItem={({ item }) => (
                <View style={styles.modelCard}>
                  {item.photo_url ? (
                    <Image
                      source={{ uri: item.photo_url }}
                      style={styles.modelPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.modelPhoto, styles.modelPhotoPlaceholder]}>
                      <Text style={{ fontSize: 28 }}>{"\uD83D\uDE97"}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.modelRarityBar,
                      { backgroundColor: getRarityColor(item.rarity) },
                    ]}
                  />
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelName} numberOfLines={1}>
                      {item.model}
                    </Text>
                    <Text
                      style={[styles.modelRarity, { color: getRarityColor(item.rarity) }]}
                    >
                      {getRarityLabel(item.rarity)}
                    </Text>
                  </View>
                </View>
              )}
            />
          </View>
        )}
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pok\u00e9dex {"\uD83D\uDCDA"}</Text>
          <View style={styles.accentLine} />
          <Text style={styles.subtitle}>
            {brands.length} marque{brands.length !== 1 ? 's' : ''} d\u00e9couvertes
          </Text>
        </View>
        <View style={styles.globalStats}>
          <Text style={styles.globalPctText}>{globalPct}%</Text>
          <Text style={styles.globalPctLabel}>complet</Text>
        </View>
      </View>

      {/* Barre globale */}
      <View style={styles.globalBarContainer}>
        <View style={styles.globalBarBg}>
          <View style={[styles.globalBarFill, { width: `${globalPct}%` }]} />
        </View>
        <Text style={styles.globalBarLabel}>
          {totalScanned}/{totalKnown} mod\u00e8les connus
        </Text>
      </View>

      {brands.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{"\uD83D\uDCDA"}</Text>
          <Text style={styles.emptyText}>Ton Pok\u00e9dex est vide !</Text>
          <Text style={styles.emptySubtext}>Scanne des voitures pour le remplir</Text>
        </View>
      ) : (
        <FlatList
          data={brands}
          keyExtractor={item => item.brand}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.cyan}
            />
          }
          renderItem={({ item }) => (
            <BrandRow brand={item} onPress={() => setSelectedBrand(item)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop:        60,
    paddingHorizontal: 20,
    paddingBottom:     10,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
  },
  title:      { color: C.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  accentLine: { width: 36, height: 2, backgroundColor: C.cyan, marginTop: 6, marginBottom: 6, borderRadius: 1 },
  subtitle:   { color: C.textSecondary, fontSize: 13 },
  globalStats: { alignItems: 'flex-end' },
  globalPctText:  { color: C.cyan, fontSize: 30, fontWeight: '900' },
  globalPctLabel: { color: C.textTertiary, fontSize: 11, marginTop: -2 },

  globalBarContainer: { paddingHorizontal: 20, marginBottom: 16 },
  globalBarBg: {
    height:          6,
    backgroundColor: C.surfaceHigh,
    borderRadius:    3,
    overflow:        'hidden',
    marginBottom:    4,
  },
  globalBarFill:  { height: '100%', backgroundColor: C.cyan, borderRadius: 3 },
  globalBarLabel: { color: C.textTertiary, fontSize: 11, textAlign: 'right' },

  list: { paddingHorizontal: 16, paddingBottom: 24 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyIcon:    { fontSize: 40 },
  emptyText:    { color: C.textPrimary,   fontSize: 20, fontWeight: 'bold' },
  emptySubtext: { color: C.textSecondary, fontSize: 14 },

  // ── Modal ───────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: C.bg },
  modalClose: {
    position:        'absolute',
    top:             16,
    right:           16,
    zIndex:          10,
    backgroundColor: C.surfaceHigh,
    borderRadius:    20,
    width:           36,
    height:          36,
    justifyContent:  'center',
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     C.border,
  },
  modalCloseText: { color: C.textPrimary, fontSize: 14, fontWeight: 'bold' },
  modalHeader: {
    paddingTop:        60,
    paddingHorizontal: 24,
    paddingBottom:     16,
  },
  modalTitle:    { color: C.textPrimary, fontSize: 28, fontWeight: '900', marginBottom: 4 },
  modalSubtitle: { color: C.textSecondary, fontSize: 13, marginBottom: 12 },
  modalProgressBg: {
    height:          6,
    backgroundColor: C.surfaceHigh,
    borderRadius:    3,
    overflow:        'hidden',
  },
  modalProgressFill: { height: '100%', backgroundColor: C.cyan, borderRadius: 3 },

  modelGrid: { padding: 16, gap: 10 },
  modelCard: {
    flex:            1,
    margin:          5,
    backgroundColor: C.surface,
    borderRadius:    10,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     C.border,
  },
  modelPhoto: { width: '100%', height: 110 },
  modelPhotoPlaceholder: {
    backgroundColor: C.surfaceHigh,
    justifyContent:  'center',
    alignItems:      'center',
  },
  modelRarityBar: { height: 2 },
  modelInfo:      { padding: 8 },
  modelName: {
    color:        C.textPrimary,
    fontSize:     12,
    fontWeight:   '700',
    marginBottom: 2,
  },
  modelRarity: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
});
