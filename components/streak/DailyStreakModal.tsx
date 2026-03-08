import { useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { C } from '../../constants/colors';
import { StreakStatus } from '../../services/streakService';

interface Props {
  visible:      boolean;
  streakStatus: StreakStatus | null; // ✅ accepté null — le parent gère le guard
  isClaiming:   boolean;
  onClaim:      () => void;
  onDismiss:    () => void;
}

const MILESTONES = [1, 3, 7, 14, 30] as const;

export function DailyStreakModal({
  visible,
  streakStatus,
  isClaiming,
  onClaim,
  onDismiss,
}: Props) {
  const scale   = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value   = withSpring(1,    { damping: 14, stiffness: 120 });
      opacity.value = withSpring(1,    { damping: 20 });
    } else {
      scale.value   = withSpring(0.85);
      opacity.value = withSpring(0);
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  // ✅ Guard null — ne jamais crasher si streakStatus n'est pas encore chargé
  if (!streakStatus) return null;

  const { claimedToday, streakCount, nextReward, longestStreak } = streakStatus;
  const nextMilestone = MILESTONES.find(m => m > streakCount) ?? 30;
  const progress      = Math.min((streakCount / nextMilestone) * 100, 100);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, cardStyle]}>

          {/* Icône + titre */}
          <Text style={styles.fire}>{"\uD83D\uDD25"}</Text>
          <Text style={styles.title}>
            {claimedToday
              ? `${streakCount} jour${streakCount > 1 ? 's' : ''} de streak !`
              : 'Streak quotidien'}
          </Text>
          <Text style={styles.subtitle}>
            {claimedToday
              ? 'Reviens demain pour continuer ta série !'
              : `Série actuelle\u00a0: ${streakCount} jour${streakCount > 1 ? 's' : ''}`}
          </Text>

          {/* Barre de progression vers le prochain palier */}
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              Prochain palier : Jour {nextMilestone}
              {longestStreak > 0 ? `  \u00b7  Record\u00a0: ${longestStreak}j` : ''}
            </Text>
          </View>

          {/* Récompense */}
          <View style={styles.rewardBox}>
            <Text style={styles.rewardEmoji}>{nextReward.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardMeta}>
                {claimedToday ? 'Récompense demain' : "Récompense d'aujourd'hui"}
              </Text>
              <Text style={styles.rewardLabel}>{nextReward.label}</Text>
            </View>
          </View>

          {/* CTA */}
          {claimedToday ? (
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={styles.closeBtnText}>Super, \u00e0 demain ! {"\uD83D\uDC4B"}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.claimBtn, isClaiming && styles.claimBtnDisabled]}
              onPress={onClaim}
              disabled={isClaiming}
              activeOpacity={0.85}
            >
              {isClaiming
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.claimBtnText}>Récupérer ma récompense</Text>
              }
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.skipBtn} onPress={onDismiss}>
            <Text style={styles.skipBtnText}>Plus tard</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         24,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius:    24,
    padding:         28,
    width:           '100%',
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     C.borderStrong,
  },
  fire:     { fontSize: 52, marginBottom: 8 },
  title:    { color: C.textPrimary, fontSize: 24, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  subtitle: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },

  progressWrap: { width: '100%', marginBottom: 20 },
  progressBg:   { height: 6, backgroundColor: C.surfaceTop, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: C.cyan, borderRadius: 3 },
  progressLabel: { color: C.textTertiary, fontSize: 11, textAlign: 'right' },

  rewardBox: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             14,
    backgroundColor: C.surfaceHigh,
    borderRadius:    14,
    padding:         16,
    width:           '100%',
    marginBottom:    22,
    borderWidth:     1,
    borderColor:     C.border,
  },
  rewardEmoji: { fontSize: 32 },
  rewardMeta:  { color: C.textSecondary, fontSize: 11, marginBottom: 2 },
  rewardLabel: { color: C.textPrimary,   fontSize: 15, fontWeight: '700' },

  claimBtn: {
    backgroundColor: C.cyan,
    paddingVertical: 15,
    borderRadius:    14,
    width:           '100%',
    alignItems:      'center',
    marginBottom:    10,
    minHeight:       50,
    justifyContent:  'center',
  },
  claimBtnDisabled: { opacity: 0.6 },
  claimBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },

  closeBtn: {
    backgroundColor: C.surfaceHigh,
    paddingVertical: 15,
    borderRadius:    14,
    width:           '100%',
    alignItems:      'center',
    marginBottom:    10,
    borderWidth:     1,
    borderColor:     C.border,
  },
  closeBtnText: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  skipBtn:      { paddingVertical: 8 },
  skipBtnText:  { color: C.textTertiary, fontSize: 13 },
});
