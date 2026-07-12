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
  placeholder,
  style,
  multiline,
  numberOfLines,
  ...rest
}: Props) {
  const { theme, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = Boolean(value && value.length > 0);
  // iOS ignores numberOfLines for height — give multiline inputs a real
  // minHeight so the whole visible box is the actual tappable TextInput.
  const multilineMinHeight = Math.max(120, (numberOfLines ?? 6) * 24);

  // Floating label animation
  const labelTop = useSharedValue(hasValue || isFocused ? 0 : 1);
  const labelScale = useSharedValue(hasValue || isFocused ? 0.75 : 1);

  // Keep the label lifted whenever there is a value — covers text set
  // programmatically (e.g. forms hydrated from the API), not just focus/blur.
  React.useEffect(() => {
    const up = hasValue || isFocused;
    labelTop.value = withTiming(up ? 0 : 1, { duration: Duration.fast, easing: EasingPresets.smooth });
    labelScale.value = withTiming(up ? 0.75 : 1, { duration: Duration.fast, easing: EasingPresets.smooth });
  }, [hasValue, isFocused]);

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
      {/* Tapping ANYWHERE in the box focuses the input — critical for
          multiline fields on iOS where the TextInput is smaller than the box */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        accessible={false}
      >
      <View
        style={[
          styles.inputWrapper,
          multiline && styles.inputWrapperMultiline,
          { borderColor },
        ]}
      >
        {/* Floating label — pointerEvents none so it NEVER swallows taps */}
        <Animated.Text
          pointerEvents="none"
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
          ref={inputRef}
          style={[
            styles.input,
            multiline && { minHeight: multilineMinHeight, textAlignVertical: 'top' as const },
            { color: theme.text },
            style, // caller style merges, never clobbers
          ]}
          placeholderTextColor={theme.textMuted}
          // Only show the placeholder after the floating label has moved up —
          // otherwise label and placeholder render on top of each other.
          placeholder={isFocused || hasValue ? placeholder : undefined}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={Colors.gold}
          multiline={multiline}
          numberOfLines={numberOfLines}
          scrollEnabled={multiline ? true : undefined}
          editable
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
      </TouchableOpacity>

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
  // Multiline boxes grow downward — content must start at the top
  inputWrapperMultiline: {
    alignItems: 'flex-start',
  },
  label: {
    position: 'absolute',
    left: Spacing.md,
    // Floated (translateY 0): sits at y=6, clearly above the input text which
    // starts at paddingTop 22. Resting (translateY 14): y=20, vertically
    // centred. The old top:16 made the floated label overlap typed text.
    top: 6,
    fontSize: FontSize.body,
    transformOrigin: 'left top',
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
