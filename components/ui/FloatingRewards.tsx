import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export interface FloatingRewardItem {
  id:       string;
  label:    string;
  color:    string;
  offsetX?: number;
}

interface Props {
  item:         FloatingRewardItem;
  onComplete:   (id: string) => void;
  bottomOffset?: number;
}

export function FloatingReward({ item, onComplete, bottomOffset = 200 }: Props) {
  const translateY = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(650, withTiming(0, { duration: 380 })),
    );
    translateY.value = withTiming(-130, { duration: 1200 });
    scale.value = withSequence(
      withTiming(1.2, { duration: 180 }),
      withTiming(1.0, { duration: 120 }),
    );

    const timer = setTimeout(() => onComplete(item.id), 1250);
    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: item.offsetX ?? 0 },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, { bottom: bottomOffset }, animStyle]}>
      <Text style={[styles.label, { color: item.color }]}>{item.label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position:     'absolute',
    alignSelf:    'center',
    zIndex:       200,
    pointerEvents: 'none' as any,
  },
  label: {
    fontSize:        24,
    fontWeight:      '900',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
