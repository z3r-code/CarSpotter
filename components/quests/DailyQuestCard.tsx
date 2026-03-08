import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { C } from '../../constants/colors';
import { DailyQuestWithDef } from '../../services/dailyQuestService';

interface Props {
  quest:      DailyQuestWithDef;
  onClaim:    (questId: string) => void;
  isClaiming?: boolean;
}

export function DailyQuestCard({ quest, onClaim, isClaiming }: Props) {
  const pct         = quest.goal > 0 ? Math.min(quest.progress / quest.goal, 1) : 0;
  const isCompleted = !!quest.completed_at;
  const isClaimed   = !!quest.rewarded_at;

  const barW = useSharedValue(0);
  barW.value = withSpring(pct, { damping: 16, stiffness: 80 });
  const barStyle = useAnimatedStyle(() => ({ width: `${barW.value * 100}%` as any }));

  // Temps restant
  const msLeft     = Math.max(0, new Date(quest.expires_at).getTime() - Date.now());
  const hoursLeft  = Math.floor(msLeft / 3_600_000);
  const minutesLeft= Math.floor((msLeft % 3_600_000) / 60_000);
  const timeLabel  = hoursLeft > 0
    ? `${hoursLeft}h restante${hoursLeft > 1 ? 's' : ''}`
    : `${minutesLeft}min`;

  return (
    <View
      style={[
        styles.card,
        isCompleted && !isClaimed && styles.cardCompleted,
        isClaimed && styles.cardClaimed,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{quest.def.emoji}</Text>
        <View style={styles.headerText}>
          <Text style={[styles.title, isClaimed && styles.textMuted]}>
            {quest.def.title}
          </Text>
          <Text style={styles.description}>{quest.def.description}</Text>
        </View>
        <View style={styles.rewardsCol}>
          <Text style={styles.xpText}>+{quest.xp_reward} XP</Text>
          <Text style={styles.coinsText}>+{quest.coins_reward} \uD83E\uDE99</Text>
        </View>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBg}>
        <Animated.View
          style={[
            styles.progressFill,
            barStyle,
            { backgroundColor: isCompleted ? C.cyan : C.cyanMid },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.progressLabel}>
          {quest.progress}/{quest.goal}
          {!isCompleted && (
            <Text style={styles.timer}>  \u00b7  \u23f1 {timeLabel}</Text>
          )}
        </Text>

        {isCompleted && !isClaimed && (
          <TouchableOpacity
            style={styles.claimBtn}
            onPress={() => onClaim(quest.id)}
            disabled={isClaiming}
            activeOpacity={0.8}
          >
            <Text style={styles.claimBtnText}>R\u00e9cup\u00e9rer</Text>
          </TouchableOpacity>
        )}

        {isClaimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedText}>\u2713 R\u00e9clam\u00e9</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius:    14,
    padding:         16,
    marginBottom:    10,
    borderWidth:     1,
    borderColor:     C.border,
  },
  cardCompleted: {
    borderColor:     C.cyan + '66',
    backgroundColor: C.cyanSoft,
  },
  cardClaimed: { opacity: 0.45 },
  header: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    marginBottom:   12,
    gap:            10,
  },
  emoji:       { fontSize: 28, marginTop: 2 },
  headerText:  { flex: 1 },
  title:       { color: C.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  textMuted:   { color: C.textSecondary },
  description: { color: C.textSecondary, fontSize: 12, lineHeight: 17 },
  rewardsCol:  { alignItems: 'flex-end' },
  xpText:      { color: C.cyan,     fontSize: 12, fontWeight: '700' },
  coinsText:   { color: C.legendary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  progressBg: {
    height:          4,
    backgroundColor: C.surfaceTop,
    borderRadius:    2,
    overflow:        'hidden',
    marginBottom:    8,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  footer: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  progressLabel: { color: C.textTertiary, fontSize: 11 },
  timer:         { color: C.textTertiary, fontSize: 11 },
  claimBtn: {
    backgroundColor: C.cyan,
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderRadius:      8,
  },
  claimBtnText:  { color: '#000', fontSize: 12, fontWeight: '900' },
  claimedBadge: {
    backgroundColor: C.surfaceTop,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      8,
  },
  claimedText: { color: C.textTertiary, fontSize: 11 },
});
