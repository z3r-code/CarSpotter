import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { C } from '../constants/colors';
import { QUESTS, QuestSpot } from '../constants/quests';

// Largeur utile de la barre de progression
// screen - (padding card 16x2) - (padding wrapper 16x2)
const BAR_W = Dimensions.get('window').width - 64;

interface Props {
  spots: QuestSpot[];
  totalXp: number;
}

export default function ActiveQuestCard({ spots, totalXp }: Props) {
  // — Animations ———————————————————————————————
  const barAnim     = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale   = useRef(new Animated.Value(0.96)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const prevQuestIdRef = useRef<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);

  // — Calcul des quêtes ———————————————————————————
  const processed = QUESTS.map((q, i) => {
    const current   = q.getProgress(spots, totalXp);
    const completed = current >= q.maxProgress;
    const pct       = Math.min(current / q.maxProgress, 1);
    return { ...q, current, completed, pct, questIndex: i + 1 };
  });

  const activeIndex    = processed.findIndex(q => !q.completed);
  const activeQuest    = activeIndex === -1 ? null : processed[activeIndex];
  const completedCount = processed.filter(q => q.completed).length;
  const nextQuest      = activeIndex !== -1 && activeIndex + 1 < QUESTS.length
    ? QUESTS[activeIndex + 1]
    : null;

  // — Animation d'entrée (montage) ——————————————————
  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(cardScale,   { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  // — Barre + détection changement de quête ————————————
  useEffect(() => {
    const targetPct = activeQuest?.pct ?? 1;

    // Une nouvelle quête vient d'être débloquée
    if (
      prevQuestIdRef.current !== null &&
      activeQuest &&
      prevQuestIdRef.current !== activeQuest.id
    ) {
      setJustUnlocked(true);
      barAnim.setValue(0); // repart de 0 pour la nouvelle quête

      // Rebond de la carte
      Animated.sequence([
        Animated.spring(cardScale, { toValue: 1.025, friction: 4, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1,     friction: 5, useNativeDriver: true }),
      ]).start();

      // Glow cyan temporaire
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(glowOpacity, { toValue: 0, duration: 800, useNativeDriver: false }),
      ]).start();

      setTimeout(() => setJustUnlocked(false), 2600);
    }

    // Barre qui se remplit en douceur
    Animated.timing(barAnim, {
      toValue: targetPct,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    prevQuestIdRef.current = activeQuest?.id ?? null;
  }, [activeQuest?.id, activeQuest?.pct]);

  const barWidth = barAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, BAR_W],
    extrapolate: 'clamp',
  });

  const cardBorderColor = glowOpacity.interpolate({
    inputRange:  [0, 1],
    outputRange: [C.border, C.cyan],
  });

  // ——————————————————————————————————————————————————
  // Toutes les quêtes accomplies
  // ——————————————————————————————————————————————————
  if (!activeQuest) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.activeDot} />
            <Text style={styles.headerLabel}>QU\u00caTE ACTIVE</Text>
          </View>
          <Text style={styles.headerCounter}>{completedCount} / {QUESTS.length} compl\u00e9t\u00e9es</Text>
        </View>
        <View style={[styles.card, styles.cardAllDone]}>
          <Text style={styles.allDoneEmoji}>\uD83C\uDFC6</Text>
          <Text style={styles.allDoneTitle}>L\u00e9gende CarSpotter</Text>
          <Text style={styles.allDoneSub}>
            Toutes les qu\u00eates accomplies \u2014 respect total \uD83E\uDEE6
          </Text>
        </View>
      </View>
    );
  }

  // ——————————————————————————————————————————————————
  // Quête active
  // ——————————————————————————————————————————————————
  return (
    <Animated.View style={[
      styles.wrapper,
      { opacity: cardOpacity, transform: [{ scale: cardScale }] },
    ]}>
      {/* En-t\u00eate */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.activeDot} />
          <Text style={styles.headerLabel}>QU\u00caTE ACTIVE</Text>
        </View>
        <Text style={styles.headerCounter}>{completedCount} / {QUESTS.length} compl\u00e9t\u00e9es</Text>
      </View>

      {/* Carte principale */}
      <Animated.View style={[styles.card, { borderColor: cardBorderColor }]}>

        {/* Ligne top : cat\u00e9gorie + num\u00e9ro + XP */}
        <View style={styles.topRow}>
          <View style={[styles.catBadge, {
            backgroundColor: activeQuest.categoryColor + '22',
            borderColor: activeQuest.categoryColor + '55',
          }]}>
            <Text style={[styles.catText, { color: activeQuest.categoryColor }]}>
              {activeQuest.category.toUpperCase()}
            </Text>
          </View>

          {justUnlocked
            ? <View style={styles.unlockedBadge}>
                <Text style={styles.unlockedText}>\uD83D\uDD13 D\u00c9BLOQU\u00c9E</Text>
              </View>
            : <Text style={styles.questNumber}>
                {activeQuest.questIndex} / {QUESTS.length}
              </Text>
          }

          <Text style={[styles.xpReward, { color: C.legendary }]}>
            +{activeQuest.xpReward}\u00a0XP
          </Text>
        </View>

        {/* Contenu : emoji + texte */}
        <View style={styles.mainRow}>
          <Text style={styles.emoji}>{activeQuest.emoji}</Text>
          <View style={styles.mainRight}>
            <Text style={styles.questName}>{activeQuest.name}</Text>
            <Text style={styles.description}>{activeQuest.description}</Text>
          </View>
        </View>

        {/* Barre de progression anim\u00e9e */}
        <View style={styles.progressTrack}>
          <Animated.View style={[
            styles.progressFill,
            { width: barWidth, backgroundColor: activeQuest.categoryColor },
          ]} />
        </View>

        {/* Compteur */}
        <View style={styles.bottomRow}>
          <Text style={styles.progressCount}>
            {activeQuest.current}\u00a0/\u00a0{activeQuest.maxProgress}
          </Text>
          <Text style={[styles.progressPct, { color: activeQuest.categoryColor }]}>
            {Math.round(activeQuest.pct * 100)}%
          </Text>
        </View>

        {/* Teaser qu\u00eate suivante */}
        {nextQuest && (
          <View style={styles.nextHint}>
            <Text style={styles.nextHintLabel}>SUIVANTE</Text>
            <Text style={styles.nextHintText}>
              {nextQuest.emoji}\u00a0{nextQuest.name}
            </Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, marginBottom: 6 },

  // En-t\u00eate au-dessus de la carte
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: C.cyan },
  headerLabel:  { color: C.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  headerCounter:{ color: C.textTertiary,  fontSize: 11 },

  // Carte
  card: {
    backgroundColor: C.surface,
    borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: C.border,
  },
  cardAllDone: {
    borderColor: C.cyan + '55',
    alignItems: 'center', gap: 8, paddingVertical: 24,
  },
  allDoneEmoji: { fontSize: 44 },
  allDoneTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '800' },
  allDoneSub:   { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Ligne sup\u00e9rieure
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  catBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 5, borderWidth: 1,
  },
  catText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  questNumber: { color: C.textTertiary, fontSize: 12 },
  xpReward:    { fontSize: 14, fontWeight: '800' },

  // Badge "vient d'être d\u00e9bloqu\u00e9e"
  unlockedBadge: {
    backgroundColor: C.cyanSoft,
    borderRadius: 5, borderWidth: 1, borderColor: C.cyan + '55',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  unlockedText: { color: C.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Contenu principal
  mainRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  emoji:     { fontSize: 36, lineHeight: 42 },
  mainRight: { flex: 1 },
  questName: { color: C.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  description: { color: C.textSecondary, fontSize: 13, lineHeight: 18 },

  // Barre de progression
  progressTrack: {
    height: 6, backgroundColor: C.surfaceHigh,
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 3 },

  // Bas
  bottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 0,
  },
  progressCount: { color: C.textSecondary, fontSize: 12 },
  progressPct:   { fontSize: 12, fontWeight: '700' },

  // Teaser qu\u00eate suivante
  nextHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  nextHintLabel: {
    color: C.textTertiary, fontSize: 9,
    fontWeight: '800', letterSpacing: 1.5,
  },
  nextHintText: { color: C.textSecondary, fontSize: 12 },
});
