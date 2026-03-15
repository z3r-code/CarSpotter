import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { RarityLevel } from '../types/car.types';
import { C } from '../constants/colors';

export interface ShareCardData {
  make:      string;
  model:     string;
  year:      number | null;
  rarity:    RarityLevel;
  photoUrl:  string | null;
  username?: string;
}

const RARITY_LABELS: Record<RarityLevel, string> = {
  commun:     'COMMUN',
  rare:       'RARE',
  epique:     'ÉPIQUE',
  legendaire: 'LÉGENDAIRE',
  platine:    'PLATINE',
};

const RARITY_COLORS: Record<RarityLevel, string> = {
  commun:     C.common,
  rare:       C.rare,
  epique:     C.epic,
  legendaire: C.legendary,
  platine:    C.cyan,
};

/**
 * Génère et partage une share card brandée CarSpotter.
 * Utilise expo-sharing pour ouvrir la feuille de partage native iOS/Android.
 *
 * Pour une vraie génération d'image (canvas/SVG → PNG),
 * intégrer react-native-view-shot sur le composant <ShareCardPreview />.
 * Ici on partage un texte formaté en attendant les assets visuels.
 */
export async function shareSpotCard(data: ShareCardData): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) return;

  const rarityLabel = RARITY_LABELS[data.rarity];
  const rarityColor = RARITY_COLORS[data.rarity];
  const carName     = `${data.make} ${data.model}${data.year ? ` (${data.year})` : ''}`;
  const username    = data.username ? `@${data.username}` : '@CarSpotter';

  // Si on a une photo, on la partage directement avec metadata
  if (data.photoUrl) {
    try {
      // Télécharge la photo en local pour pouvoir la partager
      const localUri = `${FileSystem.cacheDirectory}share_${Date.now()}.jpg`;
      await FileSystem.downloadAsync(data.photoUrl, localUri);
      await Sharing.shareAsync(localUri, {
        mimeType: 'image/jpeg',
        dialogTitle: `J'ai spotté une ${carName} [${rarityLabel}] sur CarSpotter !`,
        UTI: 'public.jpeg',
      });
      return;
    } catch (e) {
      // Fallback sur partage texte
    }
  }

  // Fallback : partage texte enrichi
  const emoji = data.rarity === 'platine' ? '💎' :
                data.rarity === 'legendaire' ? '🔥' :
                data.rarity === 'epique' ? '⚡' :
                data.rarity === 'rare' ? '✨' : '🚗';

  // expo-sharing ne supporte pas le partage de texte pur sur iOS
  // On crée un fichier .txt temporaire
  const text = `${emoji} ${carName}\n[${rarityLabel}]\n\nSpotté sur CarSpotter par ${username}\n#CarSpotter #${data.make.replace(/\s/g, '')} #CarSpotting`;
  const uri  = `${FileSystem.cacheDirectory}carspotter_share.txt`;
  await FileSystem.writeAsStringAsync(uri, text);
  await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'Partager ce Spot' });
}
