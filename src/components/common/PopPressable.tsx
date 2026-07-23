import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SpringConfig } from '../../theme/animations';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface Props extends TouchableOpacityProps {
  /** Overshoot scale of the pop (1.08 = grows 8% past rest, then settles). */
  popScale?: number;
  /** Corner radius of the white flash wash (match the child's radius). */
  flashRadius?: number;
  children: React.ReactNode;
}

/**
 * PopPressable — drop-in TouchableOpacity with the Klink press language:
 * squeeze down on touch, then POP past resting size with a bouncy overshoot
 * and a quick light-wash over the face on release. Use for tiles/cards that
 * should feel as alive as KlinkButton. All TouchableOpacity props pass through.
 */
export function PopPressable({
  popScale = 1.08,
  flashRadius = 16,
  children,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const flash = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const handlePressIn = useCallback((e: any) => {
    scale.value = withSpring(0.94, SpringConfig.snappy);
    onPressIn?.(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPressIn]);

  const handlePressOut = useCallback((e: any) => {
    scale.value = withSpring(1, SpringConfig.snappy);
    onPressOut?.(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPressOut]);

  const handlePress = useCallback((e: any) => {
    scale.value = withSequence(
      withSpring(popScale, { damping: 5, stiffness: 340, mass: 0.6 }),
      withSpring(1, SpringConfig.bouncy),
    );
    flash.value = withSequence(
      withTiming(0.4, { duration: 70 }),
      withTiming(0, { duration: 300 }),
    );
    onPress?.(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPress, popScale]);

  return (
    <AnimatedTouchable
      {...rest}
      activeOpacity={1}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: '#FFFFFF', borderRadius: flashRadius },
          flashStyle,
        ]}
      />
    </AnimatedTouchable>
  );
}

export default PopPressable;
