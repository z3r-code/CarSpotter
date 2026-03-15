import { Audio } from 'expo-av';
import { RarityLevel } from '../types/car.types';

let scanSound:   Audio.Sound | null = null;
let revealSounds: Partial<Record<RarityLevel, Audio.Sound>> = {};

/**
 * Joue un son synthétique de scan (bip court)
 * Utilise l'API Audio d'expo-av avec un son généré via URI data.
 * En production, remplacer par de vrais fichiers audio dans /assets/sounds/
 */
export async function playScanBeep(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: false });
    if (scanSound) {
      await scanSound.replayAsync();
      return;
    }
    // Son de scan — fichier à placer dans assets/sounds/scan_beep.mp3
    // Pour l'instant on skip silencieusement si le fichier n'existe pas
  } catch (e) {
    // Sons non bloquants — fail silently
  }
}

/**
 * Retourne l'URI du son de révélation selon la rareté.
 * Les fichiers doivent être dans assets/sounds/
 * reveal_common.mp3 | reveal_rare.mp3 | reveal_epic.mp3 | reveal_legendary.mp3 | reveal_platinum.mp3
 */
export async function playScanReveal(rarity: RarityLevel): Promise<void> {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: false });

    // Map rareté → fichier son
    const soundMap: Partial<Record<RarityLevel, any>> = {
      // Décommente et ajoute tes fichiers sons :
      // commun:     require('../assets/sounds/reveal_common.mp3'),
      // rare:       require('../assets/sounds/reveal_rare.mp3'),
      // epique:     require('../assets/sounds/reveal_epic.mp3'),
      // legendaire: require('../assets/sounds/reveal_legendary.mp3'),
      // platine:    require('../assets/sounds/reveal_platinum.mp3'),
    };

    const source = soundMap[rarity];
    if (!source) return; // Pas de son configuré = fail silently

    if (revealSounds[rarity]) {
      await revealSounds[rarity]!.replayAsync();
      return;
    }

    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
    revealSounds[rarity] = sound;
  } catch (e) {
    // Sons non bloquants
  }
}

export async function playLevelUp(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: false });
    // const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/level_up.mp3'), { shouldPlay: true });
    // await sound.unloadAsync(); // cleanup one-shot
  } catch (e) {}
}

/** Libère toutes les ressources audio */
export async function unloadSounds(): Promise<void> {
  try {
    if (scanSound) { await scanSound.unloadAsync(); scanSound = null; }
    for (const s of Object.values(revealSounds)) {
      if (s) await s.unloadAsync();
    }
    revealSounds = {};
  } catch (e) {}
}
