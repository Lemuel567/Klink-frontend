import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { BorderRadius, Spacing } from '../../theme/spacing';
import { FontSize, FontWeight, LetterSpacing } from '../../theme/typography';
import { Duration, EasingPresets } from '../../theme/animations';
import { useTheme } from '../../hooks/useTheme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function KlinkInput({
  label,
  error,
  containerStyle,
  rightIcon,
  onRightIconPress,
  value,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = Boolean(value && value.length > 0);

  // Floating label animation
  const labelTop = useSharedValue(hasValue || isFocused ? 0 : 1);
  const labelScale = useSharedValue(hasValue || isFocused ? 0.75 : 1);

  // Gold underline grows from center
  const underlineScale = useSharedValue(isFocused ? 1 : 0);

  // Shake on error
  const shakeX = useSharedValue(0);

  const floatLabel = useAnimatedStyle(() => ({
    transform: [
      { translateY: labelTop.value * 14 },
      { scale: labelScale.value },
    ],
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: underlineScale.value }],
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);
      labelTop.value = withTiming(0, { duration: Duration.fast, easing: EasingPresets.smooth });
      labelScale.value = withTiming(0.75, { duration: Duration.fast, easing: EasingPresets.smooth });
      underlineScale.value = withTiming(1, { duration: Duration.normal, easing: EasingPresets.enter });
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);
      if (!value || value.length === 0) {
        labelTop.value = withTiming(1, { duration: Duration.fast, easing: EasingPresets.smooth });
        labelScale.value = withTiming(1, { duration: Duration.fast, easing: EasingPresets.smooth });
      }
      underlineScale.value = withTiming(0, { duration: Duration.fast });
      onBlur?.(e);
    },
    [onBlur, value],
  );

  // Shake on error change
  React.useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [error]);

  const borderColor = error
    ? Colors.red
    : isFocused
    ? Colors.gold
    : isDark
    ? 'rgba(255,255,255,0.15)'
    : 'rgba(45,27,105,0.2)';

  return (
    <Animated.View style={[styles.container, containerStyle, shakeStyle]}>
      <View style={[styles.inputWrapper, { borderColor }]}>
        {/* Floating label */}
        <Animated.Text
          style={[
            styles.label,
            { color: error ? Colors.red : isFocused ? Colors.gold : theme.textMuted },
            floatLabel,
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>

        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.textMuted}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={Colors.gold}
          {...rest}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            accessibilityLabel="Toggle input"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {/* Gold underline */}
      <Animated.View style={[styles.underline, underlineStyle]} />

      {error && <Text style={styles.error}>{error}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingTop: 22,
    paddingBottom: 10,
    minHeight: 56,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    position: 'absolute',
    left: Spacing.md,
    top: 16,
    fontSize: FontSize.body,
    transformOrigin: 'left center',
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    paddingVertical: 0,
    minHeight: 28,
  },
  rightIcon: { marginLeft: Spacing.sm },
  underline: {
    height: 2,
    backgroundColor: Colors.gold,
    borderRadius: 1,
    marginTop: 2,
  },
  error: {
    color: Colors.red,
    fontSize: FontSize.caption,
    marginTop: 4,
    letterSpacing: LetterSpacing.normal,
  },
});
