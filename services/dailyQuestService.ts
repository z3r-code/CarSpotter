import { supabase } from '../supabase';
import { DAILY_QUEST_POOL, RARITY_ORDER, DailyQuestDef } from '../constants/dailyQuests';
import { awardCoins } from './CoinsService';

export interface DailyQuestRow {
  id:            string;
  quest_key:     string;
  progress:      number;
  goal:          number;
  xp_reward:     number;
  coins_reward:  number;
  assigned_date: string;
  completed_at:  string | null;
  rewarded_at:   string | null;
  expires_at:    string;
}

export interface DailyQuestWithDef extends DailyQuestRow {
  def: DailyQuestDef;
}

const todayStr = () => new Date().toISOString().split('T')[0];

/** Expiration = lendemain à 06h00 heure locale */
function getTomorrowExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(6, 0, 0, 0);
  return d.toISOString();
}

function pickRandom(n: number): DailyQuestDef[] {
  return [...DAILY_QUEST_POOL]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(n, DAILY_QUEST_POOL.length));
}

/** Récupère les quêtes du jour, en assigne 3 si aucune n'existe */
export async function getOrAssignDailyQuests(
  userId: string,
): Promise<DailyQuestWithDef[]> {
  const date = todayStr();

  const { data: existing, error } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('assigned_date', date);

  if (error) throw error;

  if (existing && existing.length > 0) {
    return existing.map(attachDef);
  }

  const picks      = pickRandom(3);
  const expiresAt  = getTomorrowExpiry();

  const { data: inserted, error: insertErr } = await supabase
    .from('daily_quests')
    .insert(
      picks.map(def => ({
        user_id:       userId,
        quest_key:     def.key,
        progress:      0,
        goal:          def.goal,
        xp_reward:     def.xpReward,
        coins_reward:  def.coinsReward,
        assigned_date: date,
        expires_at:    expiresAt,
      })),
    )
    .select('*');

  if (insertErr) throw insertErr;
  return (inserted ?? []).map(attachDef);
}

export interface ScanContext {
  rarity: string;
  make:   string;
}

/**
 * Met à jour la progression des quêtes du jour après un scan.
 * Retourne les IDs des quêtes nouvellement complétées.
 */
export async function updateDailyQuestsOnScan(
  userId: string,
  ctx:    ScanContext,
): Promise<string[]> {
  const quests      = await getOrAssignDailyQuests(userId);
  const rarityIndex = RARITY_ORDER.indexOf(ctx.rarity as (typeof RARITY_ORDER)[number]);

  // Vérifie si la marque est nouvelle pour l'utilisateur
  const { data: prevSpots } = await supabase
    .from('spots')
    .select('make')
    .eq('user_id', userId)
    .ilike('make', ctx.make)
    .limit(2);

  // <= 1 car le scan courant vient d'être inséré
  const isNewBrand = !prevSpots || prevSpots.length <= 1;

  const completedIds: string[] = [];

  for (const quest of quests) {
    if (quest.completed_at) continue;

    const { trigger, rarityMinIndex } = quest.def;
    let increment = false;

    if (trigger === 'scan_any') {
      increment = true;
    } else if (trigger === 'scan_rarity_min' && rarityMinIndex !== undefined) {
      increment = rarityIndex >= rarityMinIndex;
    } else if (trigger === 'scan_new_brand') {
      increment = isNewBrand;
    }

    if (!increment) continue;

    const newProgress  = Math.min(quest.progress + 1, quest.goal);
    const isCompleted  = newProgress >= quest.goal;

    await supabase
      .from('daily_quests')
      .update({
        progress:     newProgress,
        ...(isCompleted ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', quest.id);

    if (isCompleted) completedIds.push(quest.id);
  }

  return completedIds;
}

/** Claim les récompenses d'une quête complétée */
export async function claimDailyQuestReward(
  userId:  string,
  questId: string,
): Promise<{ xpRewarded: number; coinsRewarded: number }> {
  const { data: quest, error } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('id', questId)
    .eq('user_id', userId)
    .single();

  if (error || !quest)    throw new Error('Quest not found');
  if (!quest.completed_at) throw new Error('Quest not completed');
  if (quest.rewarded_at)   throw new Error('Already claimed');

  await supabase
    .from('daily_quests')
    .update({ rewarded_at: new Date().toISOString() })
    .eq('id', questId);

  await awardCoins(userId, quest.coins_reward);

  // XP : RPC avec fallback manuel
  const { error: xpErr } = await supabase.rpc('increment_xp', {
    user_id: userId,
    amount:  quest.xp_reward,
  });
  if (xpErr) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single();
    if (profile) {
      await supabase
        .from('profiles')
        .update({ xp: (profile.xp ?? 0) + quest.xp_reward })
        .eq('id', userId);
    }
  }

  return { xpRewarded: quest.xp_reward, coinsRewarded: quest.coins_reward };
}

// ─── Helpers ──────────────────────────────────────────────────
function attachDef(row: DailyQuestRow): DailyQuestWithDef {
  return {
    ...row,
    def: DAILY_QUEST_POOL.find(d => d.key === row.quest_key) ?? DAILY_QUEST_POOL[0],
  };
}
