import * as Haptics from 'expo-haptics';
import { AccessibilityInfo } from 'react-native';
import { RarityLevel } from '../types/car.types';

/**
 * Vérifie le paramètre système "réduction des effets"
 * et court-circuite tous les haptics si activé.
 */
async function isHapticEnabled(): Promise<boolean> {
  try {
    const reduced = await AccessibilityInfo.isReduceMotionEnabled();
    return !reduced;
  } catch {
    return true;
  }
}

/**
 * Feedback haptique calibré selon la rareté :
 * - commun     : léger
 * - rare       : moyen
 * - epique     : fort x2
 * - legendaire : notification Success + fort
 * - platine    : notification Success + fort x2
 */
export async function hapticForRarity(rarity: RarityLevel): Promise<void> {
  if (!(await isHapticEnabled())) return;

  switch (rarity) {
    case 'commun':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;

    case 'rare':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;

    case 'epique':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 220);
      break;

    case 'legendaire':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
      break;

    case 'platine':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 420);
      break;
  }
}

/** Feedback léger — appuis boutons, navigation */
export function hapticLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Feedback moyen — actions importantes */
export function hapticMedium(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Feedback succès — claim streak, claim quête */
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Feedback erreur */
export function hapticError(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
