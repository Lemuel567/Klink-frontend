import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useHaptics } from '../../hooks/useHaptics';
import { SpringConfig } from '../../theme/animations';
import { Colors, Gradients } from '../../theme/colors';
import { BorderRadius, Spacing } from '../../theme/spacing';
import { FontSize, FontWeight, LetterSpacing } from '../../theme/typography';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function KlinkButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  fullWidth = true,
  icon,
}: Props) {
  const haptics = useHaptics();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const handlePressIn = useCallback(() => {
    haptics.light();
    scale.value = withSpring(0.97, SpringConfig.snappy);
    translateY.value = withSpring(3, SpringConfig.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SpringConfig.snappy);
    translateY.value = withSpring(0, SpringConfig.snappy);
  }, []);

  const handlePress = useCallback(() => {
    haptics.medium();
    onPress?.();
  }, [onPress]);

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[animatedStyle, fullWidth && { width: '100%' }, style]}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
      >
        <LinearGradient
          colors={Gradients.glory}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, isDisabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.purple} size="small" />
          ) : (
            <View style={styles.row}>
              {icon}
              <Text style={[styles.labelPrimary, icon ? { marginLeft: 8 } : {}]}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  if (variant === 'secondary') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[animatedStyle, fullWidth && { width: '100%' }, style]}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={Gradients.buttonSecondary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, styles.secondaryBase, isDisabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.gold} size="small" />
          ) : (
            <View style={styles.row}>
              {icon}
              <Text style={[styles.labelSecondary, icon ? { marginLeft: 8 } : {}]}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  if (variant === 'danger') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[animatedStyle, fullWidth && { width: '100%' }, style]}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <View style={[styles.base, styles.dangerBase, isDisabled && styles.disabled]}>
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.labelWhite}>{label}</Text>
          )}
        </View>
      </AnimatedTouchable>
    );
  }

  // ghost
  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[animatedStyle, fullWidth && { width: '100%' }, style]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={[styles.base, styles.ghostBase, isDisabled && styles.disabled]}>
        <Text style={styles.labelGhost}>{label}</Text>
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryBase: {
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  dangerBase: {
    backgroundColor: Colors.red,
  },
  ghostBase: {
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  labelPrimary: {
    color: Colors.purple,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wide,
  },
  labelSecondary: {
    color: Colors.gold,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wide,
  },
  labelWhite: {
    color: Colors.white,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wide,
  },
  labelGhost: {
    color: Colors.gold,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wide,
  },
});
