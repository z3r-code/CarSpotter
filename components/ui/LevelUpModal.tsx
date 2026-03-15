import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../constants/colors';
import { hapticSuccess } from '../../services/hapticService';
import { playLevelUp } from '../../services/soundService';

interface Props {
  visible:  boolean;
  newLevel: number;
  onClose:  () => void;
}

const { width: W, height: H } = Dimensions.get('window');

// Confetti simple — 30 particules
const CONFETTI_COLORS = [C.cyan, C.legendary, C.epic, C.rare, '#FF6B6B', '#51CF66'];
const CONFETTI_COUNT  = 30;

function Confetti() {
  const particles = useRef(
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      x:     Math.random() * W,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size:  4 + Math.random() * 6,
      delay: Math.random() * 600,
      anim:  new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const animations = particles.map(p =>
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.anim, {
          toValue: 1,
          duration: 1200 + Math.random() * 600,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, H + 20] });
        const rotate     = p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 + Math.random() * 360}deg`] });
        const opacity    = p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.confettiPiece,
              {
                left:    p.x,
                width:   p.size,
                height:  p.size,
                backgroundColor: p.color,
                transform: [{ translateY }, { rotate }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function LevelUpModal({ visible, newLevel, onClose }: Props) {
  const scale      = useRef(new Animated.Value(0.4)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const numberAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    hapticSuccess();
    playLevelUp();

    Animated.parallel([
      Animated.spring(scale,   { toValue: 1,    friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1,    duration: 200,           useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    Animated.spring(numberAnim, {
      toValue: 1, friction: 3, tension: 80, useNativeDriver: true,
    }).start();
  }, [visible]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });
  const numberScale = numberAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.3, 1] });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Confetti />

        <Animated.View style={[styles.container, { transform: [{ scale }], opacity }]}>

          {/* Glow pulsant */}
          <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

          <Text style={styles.titleSmall}>NIVEAU SUPÉRIEUR</Text>

          <View style={styles.levelBadge}>
            <Animated.Text style={[styles.levelNumber, { transform: [{ scale: numberScale }] }]}>
              {newLevel}
            </Animated.Text>
          </View>

          <Text style={styles.subtitle}>🎉 Nouveau niveau débloqué !</Text>
          <Text style={styles.description}>
            Continue de spotter pour débloquer{`\n`}de nouveaux rangs et récompenses.
          </Text>

          <TouchableOpacity style={styles.ctaButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Continuer →</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: W * 0.82,
    backgroundColor: C.surface,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: C.cyan,
    padding: 36,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.cyan,
    opacity: 0.06,
  },
  titleSmall: {
    color: C.cyan,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 24,
  },
  levelBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: C.cyan,
    backgroundColor: C.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: C.cyan,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  levelNumber: {
    color: C.cyan,
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 60,
  },
  subtitle: {
    color: C.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: C.cyan,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: C.cyan,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  ctaText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
    borderRadius: 2,
  },
});
