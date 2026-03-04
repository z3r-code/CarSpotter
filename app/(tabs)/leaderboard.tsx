import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../../supabase';

// ── XP System ─────────────────────────────────────────────
const XP_THRESHOLDS = [0, 10, 25, 50, 100];
const LEVEL_NAMES = ['', 'Novice', 'Observateur', 'Chasseur', 'Expert', 'Légende'];
const LEVEL_COLORS = ['', '#888888', '#3498DB', '#9B59B6', '#FFD700', '#00FFFF'];

function getXpForRarity(rarity: string): number {
  switch (rarity) {
    case 'platine': return 20;
    case 'légendaire': return 15;
    case 'épique': return 10;
    case 'rare': return 5;
    default: return 1;
  }
}

function getLevelInfo(totalXp: number) {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (totalXp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const isMax = level === 5;
  const from = XP_THRESHOLDS[level - 1];
  const to = isMax ? XP_THRESHOLDS[4] : XP_THRESHOLDS[level];
  const progress = isMax ? 1 : (totalXp - from) / (to - from);
  return { level, progress, nextXp: to, currentXp: totalXp, name: LEVEL_NAMES[level], color: LEVEL_COLORS[level] };
}
// ──────────────────────────────────────────────────────────

type LeaderboardEntry = {
  id: string;
  username: string;
  xp: number;
  spotCount: number;
  level: number;
  progress: number;
  nextXp: number;
  levelName: string;
  levelColor: string;
  isMe: boolean;
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setMyId(user.id);

    // Récupère tous les spots (user_id + rarity)
    const { data: allSpots } = await supabase
      .from('spots')
      .select('user_id, rarity');

    // Récupère tous les profils
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, username');

    if (!allSpots || !allUsers) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const board: LeaderboardEntry[] = allUsers.map(u => {
      const userSpots = allSpots.filter(s => s.user_id === u.id);
      const totalXp = userSpots.reduce((sum, s) => sum + getXpForRarity(s.rarity), 0);
      const lvl = getLevelInfo(totalXp);
      return {
        id: u.id,
        username: u.username || 'Spotter',
        xp: totalXp,
        spotCount: userSpots.length,
        level: lvl.level,
        progress: lvl.progress,
        nextXp: lvl.nextXp,
        levelName: lvl.name,
        levelColor: lvl.color,
        isMe: u.id === user?.id,
      };
    }).sort((a, b) => b.xp - a.xp);

    setEntries(board);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchLeaderboard(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchLeaderboard(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Classement</Text>
        <Text style={styles.subtitle}>{entries.length} spotter{entries.length > 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff00" />}
        renderItem={({ item, index }) => (
          <View style={[
            styles.card,
            item.isMe && styles.cardMe,
            index === 0 && styles.cardFirst,
          ]}>
            {/* Rang */}
            <View style={styles.rank}>
              {index < 3 ? (
                <Text style={styles.rankMedal}>{RANK_MEDALS[index]}</Text>
              ) : (
                <Text style={styles.rankNumber}>#{index + 1}</Text>
              )}
            </View>

            {/* Infos */}
            <View style={styles.info}>
              <View style={styles.infoTop}>
                <Text style={styles.username}>
                  {item.username}{item.isMe ? '  👤 Moi' : ''}
                </Text>
                <View style={[styles.levelBadge, { backgroundColor: item.levelColor + '22', borderColor: item.levelColor }]}>
                  <Text style={[styles.levelText, { color: item.levelColor }]}>LVL {item.level}</Text>
                </View>
              </View>

              <Text style={[styles.levelName, { color: item.levelColor }]}>{item.levelName}</Text>

              {/* Barre XP */}
              <View style={styles.xpBarBg}>
                <View style={{ flex: item.progress, backgroundColor: item.levelColor, borderRadius: 3 }} />
                <View style={{ flex: Math.max(0, 1 - item.progress) }} />
              </View>

              {/* Stats bas */}
              <View style={styles.infoBottom}>
                <Text style={styles.xpText}>⭐ {item.xp} XP</Text>
                <Text style={styles.spotText}>🚗 {item.spotCount} spot{item.spotCount > 1 ? 's' : ''}</Text>
                {item.level < 5 && (
                  <Text style={styles.nextText}>{item.nextXp - item.xp} XP → LVL {item.level + 1}</Text>
                )}
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#555', fontSize: 14, marginTop: 4 },
  card: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  cardMe: { borderColor: '#00ff00', backgroundColor: '#001a00' },
  cardFirst: { borderColor: '#FFD700' },
  rank: { width: 44, alignItems: 'center', marginRight: 12 },
  rankMedal: { fontSize: 28 },
  rankNumber: { color: '#555', fontSize: 18, fontWeight: 'bold' },
  info: { flex: 1 },
  infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  username: { color: 'white', fontSize: 16, fontWeight: 'bold', flex: 1 },
  levelBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, marginLeft: 8 },
  levelText: { fontSize: 12, fontWeight: 'bold' },
  levelName: { fontSize: 11, marginBottom: 6 },
  xpBarBg: { height: 5, backgroundColor: '#1a1a1a', borderRadius: 3, flexDirection: 'row', overflow: 'hidden', marginBottom: 6 },
  infoBottom: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  xpText: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  spotText: { color: '#555', fontSize: 12 },
  nextText: { color: '#333', fontSize: 11, marginLeft: 'auto' },
});
