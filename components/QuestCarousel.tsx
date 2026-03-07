import { useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { C } from '../constants/colors';
import { QUESTS, QuestSpot } from '../constants/quests';

const { width } = Dimensions.get('window');
const CARD_W = width; // full width — pagingEnabled works perfectly

interface Props {
  spots: QuestSpot[];
  totalXp: number;
}

export default function QuestCarousel({ spots, totalXp }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const quests = QUESTS.map(q => {
    const current   = q.getProgress(spots, totalXp);
    const completed = current >= q.maxProgress;
    const pct       = Math.min(current / q.maxProgress, 1);
    return { ...q, current, completed, pct };
  });

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Qu\u00eates</Text>
        <Text style={styles.headerSub}>
          {quests.filter(q => q.completed).length}/{quests.length} compl\u00e9t\u00e9es
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={quests}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
          setActiveIndex(idx);
        }}
        renderItem={({ item }) => (
          <View style={{ width: CARD_W, paddingHorizontal: 16 }}>
            <View style={[styles.card, item.completed && styles.cardDone]}>
              {/* Badge cat\u00e9gorie */}
              <View style={[styles.catBadge, { backgroundColor: item.categoryColor + '22',
                borderColor: item.categoryColor + '55' }]}>
                <Text style={[styles.catText, { color: item.categoryColor }]}>
                  {item.category.toUpperCase()}
                </Text>
              </View>

              {/* Contenu principal */}
              <View style={styles.mainRow}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.mainRight}>
                  <Text style={styles.questName}>{item.name}</Text>
                  <Text style={styles.description}>{item.description}</Text>
                </View>
                <View style={styles.xpBlock}>
                  <Text style={[styles.xpValue, { color: item.completed ? C.cyan : C.legendary }]}>
                    +{item.xpReward}
                  </Text>
                  <Text style={styles.xpLabel}>XP</Text>
                </View>
              </View>

              {/* Barre de progression */}
              <View style={styles.progressTrack}>
                <View style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(item.pct * 100)}%`,
                    backgroundColor: item.completed ? C.cyan : item.categoryColor,
                  }
                ]} />
              </View>

              {/* Bas de carte */}
              <View style={styles.bottomRow}>
                <Text style={styles.progressCount}>
                  {item.current} / {item.maxProgress}
                </Text>
                {item.completed
                  ? <Text style={[styles.statusText, { color: C.cyan }]}>\u2705 COMPL\u00c9T\u00c9E</Text>
                  : <Text style={[styles.statusText, { color: C.textTertiary }]}>
                      {Math.round(item.pct * 100)}%
                    </Text>
                }
              </View>
            </View>
          </View>
        )}
      />

      {/* Indicateur de points */}
      <View style={styles.dots}>
        {quests.map((q, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex
                ? [styles.dotActive, { backgroundColor: quests[i].completed ? C.cyan : C.textSecondary }]
                : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 4 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', paddingHorizontal: 20, marginBottom: 10,
  },
  headerTitle: { color: C.textPrimary, fontSize: 17, fontWeight: '700' },
  headerSub:   { color: C.textSecondary, fontSize: 12 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  cardDone: {
    borderColor: C.cyan + '55',
    backgroundColor: C.cyanSoft,
  },

  catBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 5, borderWidth: 1, marginBottom: 10,
  },
  catText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  mainRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  emoji:    { fontSize: 30, lineHeight: 36 },
  mainRight:{ flex: 1 },
  questName:{ color: C.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  description: { color: C.textSecondary, fontSize: 12, lineHeight: 17 },

  xpBlock: { alignItems: 'center', minWidth: 40 },
  xpValue: { fontSize: 18, fontWeight: '900' },
  xpLabel: { color: C.textTertiary, fontSize: 9, letterSpacing: 1 },

  progressTrack: {
    height: 5, backgroundColor: C.surfaceHigh,
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 3 },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressCount: { color: C.textSecondary, fontSize: 12 },
  statusText:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  dots: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 4, marginTop: 10, marginBottom: 2,
  },
  dot:        { height: 5, borderRadius: 3 },
  dotActive:  { width: 16 },
  dotInactive:{ width: 5, backgroundColor: C.surfaceHigh },
});
