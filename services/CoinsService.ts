import { supabase } from '../supabase';

// ──────────────────────────────────────────────────────────────
type Profile = {
  id:               string;
  coins:            number;
  owned_items:      string[];
  active_avatar:    string | null;
  completed_quests: string[];
};
// ──────────────────────────────────────────────────────────────

/** Récupère (ou crée) le profil de l'utilisateur */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, coins, owned_items, active_avatar, completed_quests')
    .eq('id', userId)
    .single();

  if (error) {
    // Ligne manquante → on la crée
    if (error.code === 'PGRST116') {
      const { data: inserted } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select('id, coins, owned_items, active_avatar, completed_quests')
        .single();
      return inserted ?? null;
    }
    console.error('getProfile error:', error.message);
    return null;
  }
  return data;
}

/** Solde de pièces */
export async function getCoins(userId: string): Promise<number> {
  const profile = await getProfile(userId);
  return profile?.coins ?? 0;
}

/** Crédite des pièces */
export async function awardCoins(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const { error } = await supabase.rpc('increment_coins', {
    user_id: userId,
    amount,
  });
  if (error) {
    // Fallback si la RPC n'existe pas encore : update manuel
    const profile = await getProfile(userId);
    if (!profile) return;
    await supabase
      .from('profiles')
      .update({ coins: profile.coins + amount })
      .eq('id', userId);
  }
}

/** Débite des pièces, retourne false si solde insuffisant */
export async function spendCoins(userId: string, amount: number): Promise<boolean> {
  const profile = await getProfile(userId);
  if (!profile || profile.coins < amount) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ coins: profile.coins - amount })
    .eq('id', userId);
  return !error;
}

/** Achète un item du shop */
export async function purchaseItem(
  userId: string,
  itemId: string,
  price:  number,
): Promise<{ success: boolean; reason?: string }> {
  const profile = await getProfile(userId);
  if (!profile)                         return { success: false, reason: 'profile_not_found' };
  if (profile.owned_items.includes(itemId)) return { success: false, reason: 'already_owned' };
  if (profile.coins < price)            return { success: false, reason: 'insufficient_coins' };

  const { error } = await supabase
    .from('profiles')
    .update({
      coins:       profile.coins - price,
      owned_items: [...profile.owned_items, itemId],
    })
    .eq('id', userId);

  return error ? { success: false, reason: error.message } : { success: true };
}

/** Définit l'avatar actif */
export async function setActiveAvatar(userId: string, itemId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ active_avatar: itemId })
    .eq('id', userId);
}

/** Vérifie si une quête a déjà été récompensée */
export async function isQuestRewarded(userId: string, questId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  return profile?.completed_quests.includes(questId) ?? false;
}

/** Marque une quête comme récompensée */
export async function markQuestRewarded(userId: string, questId: string): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile || profile.completed_quests.includes(questId)) return;
  await supabase
    .from('profiles')
    .update({ completed_quests: [...profile.completed_quests, questId] })
    .eq('id', userId);
}
