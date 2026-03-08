import { useCallback, useState } from 'react';
import { FloatingRewardItem } from '../components/ui/FloatingRewards';
import { C } from '../constants/colors';

type RewardType = 'xp' | 'coins' | 'quest';

interface UseFloatingRewardsReturn {
  rewards:       FloatingRewardItem[];
  triggerReward: (type: RewardType, amount?: number, label?: string) => void;
  removeReward:  (id: string) => void;
}

export function useFloatingRewards(): UseFloatingRewardsReturn {
  const [rewards, setRewards] = useState<FloatingRewardItem[]>([]);

  const triggerReward = useCallback(
    (type: RewardType, amount = 0, label?: string) => {
      const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      let color:   string;
      let text:    string;
      let offsetX: number;

      switch (type) {
        case 'xp':
          color   = C.cyan;
          text    = `+${amount} XP`;
          offsetX = -45;
          break;
        case 'coins':
          color   = C.legendary;
          text    = `+${amount} \uD83E\uDE99`;
          offsetX = 45;
          break;
        case 'quest':
        default:
          color   = C.success;
          text    = label ?? '\u2713 Qu\u00eate !';
          offsetX = 0;
          break;
      }

      setRewards(prev => [...prev, { id, label: text, color, offsetX }]);
    },
    [],
  );

  const removeReward = useCallback(
    (id: string) => setRewards(prev => prev.filter(r => r.id !== id)),
    [],
  );

  return { rewards, triggerReward, removeReward };
}
