import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  ImageBackground,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOTAL_SCENES = 4;

// Scene images — required at compile time
const SCENE_IMAGES = {
  hero: require('@/assets/onboarding/hero_bg.jpg'),
  camera: require('@/assets/onboarding/ai_camera.jpg'),
  dashboard: require('@/assets/onboarding/dashboard.jpg'),
  cta: require('@/assets/onboarding/cta_mascot.jpg'),
};

interface CinematicIntroProps {
  onComplete: () => void;
}

interface SceneProps {
  scrollY: SharedValue<number>;
  index: number;
  screenHeight: number;
  screenWidth: number;
}

// ─────────────────────────────────────────────
// Scene 1 — Hero: "MealPulse AI"
// ─────────────────────────────────────────────

const HeroScene = React.memo<SceneProps>(({ scrollY, index, screenHeight }) => {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withTiming(0.8, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const pageOffset = index * screenHeight;

  const containerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const logoStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [80, 0, -60],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [0.6, 1, 0.8],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateY },
        { scale: scale * pulseScale.value },
      ],
    };
  });

  const subtitleStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [120, 0, -40],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [pageOffset - screenHeight * 0.5, pageOffset, pageOffset + screenHeight * 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }], opacity };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={[styles.scene, { height: screenHeight }, containerStyle]}>
      <ImageBackground source={SCENE_IMAGES.hero} style={styles.sceneBg} resizeMode="cover">
        <View style={styles.overlay} />
        <Animated.View style={[styles.glowCircle, glowStyle]} />
        <View style={styles.sceneContent}>
          <Animated.View style={logoStyle}>
            <View style={styles.heroLogoContainer}>
              <Text style={styles.heroEmoji}>👾</Text>
              <View style={styles.heroLogoBadge}>
                <Text style={styles.heroLogoBadgeText}>AI POWERED</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>MealPulse</Text>
            <Text style={styles.heroTitleAccent}>AI</Text>
          </Animated.View>
          <Animated.View style={subtitleStyle}>
            <Text style={styles.heroSubtitle}>
              Your intelligent nutrition companion
            </Text>
          </Animated.View>
        </View>
        <View style={styles.scrollHint}>
          <Ionicons name="chevron-down" size={24} color="rgba(190, 242, 100, 0.6)" />
          <Text style={styles.scrollHintText}>Scroll to explore</Text>
        </View>
      </ImageBackground>
    </Animated.View>
  );
});

HeroScene.displayName = 'HeroScene';

// ─────────────────────────────────────────────
// Scene 2 — AI Camera: "Scan. Recognize. Track."
// ─────────────────────────────────────────────

const FEATURES = [
  { icon: '📸', text: 'Point your camera at any meal' },
  { icon: '🧠', text: 'AI instantly recognizes ingredients' },
  { icon: '📊', text: 'Auto-logs calories & macros' },
] as const;

const CameraScene = React.memo<SceneProps>(({ scrollY, index, screenHeight }) => {
  const pageOffset = index * screenHeight;

  const imageStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [100, 0, -100],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [0.7, 1, 0.7],
      Extrapolation.CLAMP
    );
    const rotateZ = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [-5, 0, 5],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateY },
        { scale },
        { rotateZ: `${rotateZ}deg` },
      ],
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [200, 0, -200],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [pageOffset - screenHeight * 0.6, pageOffset, pageOffset + screenHeight * 0.6],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateX }], opacity };
  });

  // Pre-compute animated styles for each feature (hooks called unconditionally)
  const feature0Style = useAnimatedStyle(() => {
    const delay = 0 * 0.15;
    const adjustedStart = pageOffset - screenHeight * (0.6 - delay);
    return {
      opacity: interpolate(scrollY.value, [adjustedStart, pageOffset, pageOffset + screenHeight * 0.6], [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(scrollY.value, [adjustedStart, pageOffset, pageOffset + screenHeight * 0.6], [100, 0, -100], Extrapolation.CLAMP) }],
    };
  });

  const feature1Style = useAnimatedStyle(() => {
    const delay = 1 * 0.15;
    const adjustedStart = pageOffset - screenHeight * (0.6 - delay);
    return {
      opacity: interpolate(scrollY.value, [adjustedStart, pageOffset, pageOffset + screenHeight * 0.6], [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(scrollY.value, [adjustedStart, pageOffset, pageOffset + screenHeight * 0.6], [130, 0, -100], Extrapolation.CLAMP) }],
    };
  });

  const feature2Style = useAnimatedStyle(() => {
    const delay = 2 * 0.15;
    const adjustedStart = pageOffset - screenHeight * (0.6 - delay);
    return {
      opacity: interpolate(scrollY.value, [adjustedStart, pageOffset, pageOffset + screenHeight * 0.6], [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(scrollY.value, [adjustedStart, pageOffset, pageOffset + screenHeight * 0.6], [160, 0, -100], Extrapolation.CLAMP) }],
    };
  });

  const featureStyles = [feature0Style, feature1Style, feature2Style];

  return (
    <Animated.View style={[styles.scene, { height: screenHeight }]}>
      <ImageBackground source={SCENE_IMAGES.camera} style={styles.sceneBg} resizeMode="cover">
        <View style={styles.overlay} />
        <View style={styles.sceneContent}>
          <Animated.View style={[styles.sceneImageContainer, imageStyle]}>
            <View style={styles.cameraGlow} />
          </Animated.View>
          <View style={styles.sceneTextBlock}>
            <Animated.View style={titleStyle}>
              <Text style={styles.sceneBadge}>AI VISION</Text>
              <Text style={styles.sceneTitle}>Scan. Recognize.{'\n'}Track.</Text>
            </Animated.View>
            <View style={styles.featureList}>
              {FEATURES.map((f, i) => (
                <Animated.View key={i} style={[styles.featureRow, featureStyles[i]]}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureText}>{f.text}</Text>
                </Animated.View>
              ))}
            </View>
          </View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
});

CameraScene.displayName = 'CameraScene';

// ─────────────────────────────────────────────
// Scene 3 — Dashboard: "Your Personal AI Nutritionist"
// ─────────────────────────────────────────────

const MACRO_STATS = [
  { label: 'Protein', value: '145g', color: '#4CAF50' },
  { label: 'Carbs', value: '210g', color: '#FFA726' },
  { label: 'Fat', value: '65g', color: '#FF6B4A' },
] as const;

const DashboardScene = React.memo<SceneProps>(({ scrollY, index, screenHeight, screenWidth }) => {
  const pageOffset = index * screenHeight;

  const cardStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [-25, 0, 25],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [0.6, 1, 0.6],
      Extrapolation.CLAMP
    );
    const translateX = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [-80, 0, 80],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
        { scale },
        { translateX },
      ],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset, pageOffset + screenHeight],
      [60, 0, -60],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [pageOffset - screenHeight * 0.5, pageOffset, pageOffset + screenHeight * 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }], opacity };
  });

  const dashCardWidth = useMemo(() => screenWidth * 0.82, [screenWidth]);

  return (
    <Animated.View style={[styles.scene, { height: screenHeight }]}>
      <ImageBackground source={SCENE_IMAGES.dashboard} style={styles.sceneBg} resizeMode="cover">
        <View style={styles.overlay} />
        <View style={styles.sceneContent}>
          <Animated.View style={textStyle}>
            <Text style={styles.sceneBadge}>SMART TRACKING</Text>
            <Text style={styles.sceneTitle}>Your Personal{'\n'}AI Nutritionist</Text>
          </Animated.View>

          <Animated.View style={[styles.dashboardCard, { width: dashCardWidth }, cardStyle]}>
            <View style={styles.dashCardHeader}>
              <Text style={styles.dashCardKcal}>1,745</Text>
              <Text style={styles.dashCardKcalLabel}>kcal / day</Text>
            </View>
            <View style={styles.dashCardMacros}>
              {MACRO_STATS.map((s, i) => (
                <View key={i} style={styles.dashMacroItem}>
                  <View style={[styles.dashMacroRing, { borderColor: s.color }]}>
                    <Text style={[styles.dashMacroValue, { color: s.color }]}>{s.value}</Text>
                  </View>
                  <Text style={styles.dashMacroLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={textStyle}>
            <Text style={styles.sceneSubtitle}>
              Personalized macro targets calculated with the Mifflin-St Jeor formula
            </Text>
          </Animated.View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
});

DashboardScene.displayName = 'DashboardScene';

// ─────────────────────────────────────────────
// Scene 4 — CTA: "Let's Build Your Plan"
// ─────────────────────────────────────────────

interface CTASceneProps extends SceneProps {
  onComplete: () => void;
}

const CTAScene = React.memo<CTASceneProps>(({ scrollY, index, screenHeight, screenWidth, onComplete }) => {
  const pageOffset = index * screenHeight;
  const buttonPulse = useSharedValue(1);

  useEffect(() => {
    buttonPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const mascotStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset],
      [0.3, 1],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [pageOffset - screenHeight, pageOffset],
      [200, 0],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [pageOffset - screenHeight * 0.8, pageOffset],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [pageOffset - screenHeight * 0.5, pageOffset],
      [80, 0],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [pageOffset - screenHeight * 0.4, pageOffset],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }], opacity };
  });

  const buttonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [pageOffset - screenHeight * 0.3, pageOffset],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale: buttonPulse.value }],
    };
  });

  const buttonMinWidth = useMemo(() => screenWidth * 0.7, [screenWidth]);

  return (
    <Animated.View style={[styles.scene, { height: screenHeight }]}>
      <ImageBackground source={SCENE_IMAGES.cta} style={styles.sceneBg} resizeMode="cover">
        <View style={styles.overlay} />
        <View style={styles.sceneContent}>
          <Animated.View style={mascotStyle}>
            <View style={styles.ctaMascotContainer}>
              <Text style={styles.ctaEmoji}>👾</Text>
            </View>
          </Animated.View>

          <Animated.View style={textStyle}>
            <Text style={styles.ctaTitle}>Let's Build{'\n'}Your Plan</Text>
            <Text style={styles.ctaSubtitle}>
              Answer 7 quick questions and we'll calculate your perfect daily nutrition targets
            </Text>
          </Animated.View>

          <Animated.View style={buttonStyle}>
            <TouchableOpacity
              style={[styles.ctaButton, { minWidth: buttonMinWidth }]}
              onPress={onComplete}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#0B1410" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
});

CTAScene.displayName = 'CTAScene';

// ─────────────────────────────────────────────
// Dot Indicator (extracted to top-level to avoid re-creation)
// ─────────────────────────────────────────────

interface DotIndicatorProps {
  dotIndex: number;
  scrollY: SharedValue<number>;
  screenHeight: number;
}

const DotIndicator = React.memo<DotIndicatorProps>(({ dotIndex, scrollY, screenHeight }) => {
  const dotStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollY.value,
      [
        (dotIndex - 1) * screenHeight,
        dotIndex * screenHeight,
        (dotIndex + 1) * screenHeight,
      ],
      [8, 24, 8],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [
        (dotIndex - 1) * screenHeight,
        dotIndex * screenHeight,
        (dotIndex + 1) * screenHeight,
      ],
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );
    return { width, opacity };
  });

  return <Animated.View style={[styles.dot, dotStyle]} />;
});

DotIndicator.displayName = 'DotIndicator';

// ─────────────────────────────────────────────
// Main CinematicIntro Component
// ─────────────────────────────────────────────

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        overScrollMode="never"
      >
        <HeroScene scrollY={scrollY} index={0} screenHeight={screenHeight} screenWidth={screenWidth} />
        <CameraScene scrollY={scrollY} index={1} screenHeight={screenHeight} screenWidth={screenWidth} />
        <DashboardScene scrollY={scrollY} index={2} screenHeight={screenHeight} screenWidth={screenWidth} />
        <CTAScene scrollY={scrollY} index={3} screenHeight={screenHeight} screenWidth={screenWidth} onComplete={onComplete} />
      </Animated.ScrollView>

      {/* Skip button */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + 10 }]}
        onPress={handleSkip}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.skipText}>Skip</Text>
        <Ionicons name="chevron-forward" size={16} color="rgba(190, 242, 100, 0.8)" />
      </TouchableOpacity>

      {/* Dot indicators */}
      <View style={[styles.dotsContainer, { bottom: insets.bottom + 30 }]}>
        {Array.from({ length: TOTAL_SCENES }).map((_, i) => (
          <DotIndicator key={i} dotIndex={i} scrollY={scrollY} screenHeight={screenHeight} />
        ))}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1410',
  },

  // Scene base
  scene: {
    width: '100%',
  },
  sceneBg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 20, 16, 0.55)',
  },
  sceneContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 2,
  },

  // Glow effect
  glowCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(190, 242, 100, 0.08)',
    alignSelf: 'center',
    top: '35%',
    zIndex: 1,
  },

  // Scene text common
  sceneBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: '#BEF264',
    letterSpacing: 3,
    marginBottom: 8,
    textAlign: 'center',
  },
  sceneTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 12,
  },
  sceneSubtitle: {
    fontSize: 15,
    color: 'rgba(248, 250, 252, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 20,
    paddingHorizontal: 10,
  },

  // Scene 1 — Hero
  heroLogoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(190, 242, 100, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(190, 242, 100, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  heroEmoji: {
    fontSize: 48,
  },
  heroLogoBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#0B1410',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(190, 242, 100, 0.3)',
  },
  heroLogoBadgeText: {
    color: '#BEF264',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: -1,
  },
  heroTitleAccent: {
    fontSize: 48,
    fontWeight: '900',
    color: '#BEF264',
    textAlign: 'center',
    marginTop: -8,
    letterSpacing: 4,
  },
  heroSubtitle: {
    fontSize: 17,
    color: 'rgba(248, 250, 252, 0.6)',
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  scrollHint: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 4,
    zIndex: 3,
  },
  scrollHintText: {
    fontSize: 12,
    color: 'rgba(190, 242, 100, 0.5)',
    fontWeight: '600',
    letterSpacing: 1,
  },

  // Scene 2 — Camera
  sceneImageContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(190, 242, 100, 0.08)',
  },
  sceneTextBlock: {
    alignItems: 'center',
    gap: 20,
  },
  featureList: {
    gap: 14,
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    fontSize: 15,
    color: 'rgba(248, 250, 252, 0.85)',
    fontWeight: '600',
    flex: 1,
  },

  // Scene 3 — Dashboard
  dashboardCard: {
    backgroundColor: 'rgba(19, 32, 26, 0.85)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(190, 242, 100, 0.15)',
    marginVertical: 24,
    shadowColor: '#BEF264',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  dashCardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dashCardKcal: {
    fontSize: 42,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -1,
  },
  dashCardKcalLabel: {
    fontSize: 14,
    color: 'rgba(248, 250, 252, 0.5)',
    fontWeight: '600',
    marginTop: 2,
  },
  dashCardMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dashMacroItem: {
    alignItems: 'center',
    gap: 8,
  },
  dashMacroRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  dashMacroValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  dashMacroLabel: {
    fontSize: 12,
    color: 'rgba(248, 250, 252, 0.5)',
    fontWeight: '700',
  },

  // Scene 4 — CTA
  ctaMascotContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(190, 242, 100, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(190, 242, 100, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  ctaEmoji: {
    fontSize: 56,
  },
  ctaTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    lineHeight: 46,
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 15,
    color: 'rgba(248, 250, 252, 0.65)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
    paddingHorizontal: 10,
  },
  ctaButton: {
    backgroundColor: '#BEF264',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#BEF264',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaButtonText: {
    color: '#0B1410',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Skip button
  skipButton: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(11, 20, 16, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(190, 242, 100, 0.2)',
    zIndex: 10,
  },
  skipText: {
    color: 'rgba(190, 242, 100, 0.8)',
    fontSize: 14,
    fontWeight: '700',
  },

  // Dots
  dotsContainer: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BEF264',
  },
});

export default CinematicIntro;
