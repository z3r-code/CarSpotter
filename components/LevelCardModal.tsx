import React, { useEffect, useRef } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  TIERS,
  getXpForLevel,
  getTierForLevel,
  isMilestoneLevel,
  LevelInfo,
  MAX_LEVEL,
  RARITY_XP_TABLE,
} from '../constants/levels';

const NORMAL_HEIGHT = 56;
const CURRENT_HEIGHT = 80;
const MILESTONE_HEIGHT = 96;

interface LevelRowData {
  level: number;
  isMilestone: boolean;
}

const ALL_LEVELS: LevelRowData[] = Array.from({ length: MAX_LEVEL }, (_, i) => ({
  level: i + 1,
  isMilestone: isMilestoneLevel(i + 1),
}));

interface Props {
  visible: boolean;
  onClose: () => void;
  levelInfo: LevelInfo;
  username: string;
}

export default function LevelCardModal({ visible, onClose, levelInfo, username }: Props) {
  const flatListRef = useRef<FlatList<LevelRowData>>(null);
  const currentLevel = levelInfo.level;

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index: Math.max(0, currentLevel - 2),
            animated: false,
            viewPosition: 0.3,
          });
        } catch (_) {}
      }, 200);
    }
  }, [visible, currentLevel]);

  const renderLevelRow = ({ item }: { item: LevelRowData }) => {
    const { level, isMilestone } = item;
    const tier = getTierForLevel(level);
    const unlocked = level <= currentLevel;
    const isCurrent = level === currentLevel;
    const xpRequired = getXpForLevel(level);
    const isMax = level >= MAX_LEVEL;

    // Find which milestone tier this level represents
    const milstoneTier = TIERS.find(t => t.minLevel === level);

    const rowHeight = isCurrent ? CURRENT_HEIGHT : isMilestone ? MILESTONE_HEIGHT : NORMAL_HEIGHT;
    const borderColor = isCurrent ? tier.color : isMilestone && unlocked ? tier.color + '66' : 'transparent';
    const bgColor = isCurrent ? tier.color + '15' : isMilestone ? '#0d0d0d' : '#000';

    return (
      <View
        style={[
          styles.row,
          { height: rowHeight, backgroundColor: bgColor, borderColor },
          isMilestone && styles.milestoneRow,
          isCurrent && styles.currentRow,
        ]}
      >
        {/* Level badge circle */}
        <View
          style={[
            styles.levelCircle,
            {
              backgroundColor: unlocked ? tier.color + '22' : '#111',
              borderColor: unlocked ? tier.color : '#333',
            },
          ]}
        >
          <Text style={[
            styles.levelCircleText,
            { color: unlocked ? tier.color : '#444', fontSize: level >= 100 ? 10 : level >= 10 ? 12 : 14 },
          ]}>
            {level}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.rowContent}>
          <Text style={[styles.tierTitle, { color: unlocked ? tier.color : '#333' }]}>
            {tier.title}
          </Text>

          {isCurrent && (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, levelInfo.progress * 100)}%`,
                      backgroundColor: tier.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.xpText, { color: tier.color }]}>
                {isMax ? 'MAX' : `${levelInfo.xpInCurrentLevel} / ${levelInfo.xpNeededInLevel} XP`}
              </Text>
            </View>
          )}

          {isMilestone && !isCurrent && milstoneTier && milstoneTier.trophyLabel && (
            <View style={styles.trophyRow}>
              <View
                style={[
                  styles.trophyBadge,
                  {
                    backgroundColor: unlocked ? tier.color + '22' : '#111',
                    borderColor: unlocked ? tier.color : '#222',
                  },
                ]}
              >
                <Text style={[styles.trophyLetter, { color: unlocked ? tier.color : '#333' }]}>
                  {milstoneTier.trophyEmoji}
                </Text>
                <Text style={[styles.trophyLabel, { color: unlocked ? tier.color : '#333' }]}>
                  {milstoneTier.trophyLabel}
                </Text>
              </View>
              <Text style={[styles.xpRequired, { color: unlocked ? '#555' : '#2a2a2a' }]}>
                {xpRequired.toLocaleString()} XP
              </Text>
            </View>
          )}

          {!isMilestone && !isCurrent && (
            <Text style={[styles.xpRequiredSmall, { color: unlocked ? '#444' : '#222' }]}>
              {xpRequired.toLocaleString()} XP
            </Text>
          )}
        </View>

        {/* Right status */}
        <View style={styles.statusContainer}>
          {isCurrent ? (
            <View style={[styles.currentBadge, { backgroundColor: tier.color }]}>
              <Text style={styles.currentBadgeText}>NOW</Text>
            </View>
          ) : unlocked ? (
            <View style={styles.checkContainer}>
              <Text style={[styles.checkmark, { color: tier.color }]}>OK</Text>
            </View>
          ) : (
            <Text style={styles.lockIcon}>--</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>X</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Progression</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Profile card */}
        <View style={[styles.profileCard, { borderColor: levelInfo.color + '66' }]}>
          <View style={[styles.avatar, { backgroundColor: levelInfo.color + '22', borderColor: levelInfo.color }]}>
            <Text style={[styles.avatarText, { color: levelInfo.color }]}>
              {username.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.username}>{username}</Text>
            <Text style={[styles.profileTitle, { color: levelInfo.color }]}>
              LVL {levelInfo.level} - {levelInfo.title}
            </Text>
            <View style={styles.profileXpRow}>
              <View style={styles.profileBarBg}>
                <View
                  style={[
                    styles.profileBarFill,
                    {
                      width: `${Math.min(100, levelInfo.progress * 100)}%`,
                      backgroundColor: levelInfo.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.profileXpText, { color: levelInfo.color }]}>
                {levelInfo.level >= MAX_LEVEL
                  ? 'MAX'
                  : `${levelInfo.currentXp.toLocaleString()} XP total`}
              </Text>
            </View>
          </View>
        </View>

        {/* XP legend */}
        <View style={styles.legendRow}>
          {RARITY_XP_TABLE.map((r) => (
            <View key={r.rarity} style={styles.legendItem}>
              <Text style={[styles.legendXp, { color: r.color }]}>+{r.xp}</Text>
              <Text style={[styles.legendRarity, { color: r.color }]}>{r.rarity.slice(0, 3).toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* Level list */}
        <FlatList
          ref={flatListRef}
          data={ALL_LEVELS}
          keyExtractor={(item) => String(item.level)}
          renderItem={renderLevelRow}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => {}}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  closeBtn: {
    width: 36, height: 36,
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  profileCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52, height: 52,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  username: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  profileTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  profileXpRow: { gap: 6 },
  profileBarBg: { height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' },
  profileBarFill: { height: '100%', borderRadius: 3 },
  profileXpText: { fontSize: 11, marginTop: 2 },

  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    marginBottom: 4,
  },
  legendItem: { alignItems: 'center', gap: 2 },
  legendXp: { fontSize: 13, fontWeight: 'bold' },
  legendRarity: { fontSize: 9, letterSpacing: 0.5 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    marginHorizontal: 0,
  },
  milestoneRow: {
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
  },
  currentRow: {
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
  },
  levelCircle: {
    width: 36, height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  levelCircleText: { fontWeight: 'bold' },
  rowContent: { flex: 1, justifyContent: 'center', gap: 3 },
  tierTitle: { fontSize: 13, fontWeight: '600' },
  progressBarContainer: { gap: 2 },
  progressBarBg: { height: 4, backgroundColor: '#1a1a1a', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  xpText: { fontSize: 10 },
  trophyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trophyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  trophyLetter: { fontSize: 11, fontWeight: 'bold' },
  trophyLabel: { fontSize: 10, fontWeight: '600' },
  xpRequired: { fontSize: 10 },
  xpRequiredSmall: { fontSize: 10 },
  statusContainer: { width: 44, alignItems: 'center' },
  currentBadge: {
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6,
  },
  currentBadgeText: { color: '#000', fontSize: 9, fontWeight: 'bold' },
  checkContainer: {},
  checkmark: { fontSize: 11, fontWeight: 'bold' },
  lockIcon: { color: '#2a2a2a', fontSize: 16 },
});
