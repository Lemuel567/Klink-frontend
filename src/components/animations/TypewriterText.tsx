import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { Colors } from '../../theme/colors';

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
  /** ms per character. ~30 feels like confident handwriting. */
  charDelayMs?: number;
  /** ms before the first character appears. */
  startDelayMs?: number;
  /** Show a blinking gold caret while typing. */
  cursor?: boolean;
  /**
   * Cap on the whole reveal. Long text reveals several characters per tick so
   * a 2,000-char devotional still finishes in ~this long, not a minute.
   */
  maxDurationMs?: number;
  /**
   * Re-type every time the screen regains focus (tab switch, back navigation)
   * — the page "writes itself" on every visit, not just app launch.
   * Default true.
   */
  replayOnFocus?: boolean;
  numberOfLines?: number;
  /** Fires when a typing pass begins (incl. focus replays). */
  onStart?: () => void;
  onDone?: () => void;
}

/**
 * TypewriterText — text that writes itself, character by character.
 *
 * Layout-stable by design: the FULL string renders invisibly to reserve its
 * final space, and the visible substring paints on top — so surrounding
 * layout never reflows while typing (no jumping sections, no CLS).
 *
 * FAIL-SAFE RULE (same as ScrollReveal): while the screen is unfocused the
 * full text stays visible — the worst failure mode is "no replay", never
 * "missing text". Respects reduce-motion (renders instantly). Meant for
 * display/hero copy — never body text or lists.
 */
export function TypewriterText({
  text,
  style,
  charDelayMs = 30,
  startDelayMs = 0,
  cursor = false,
  maxDurationMs = 4000,
  replayOnFocus = true,
  numberOfLines,
  onStart,
  onDone,
}: Props) {
  const reducedMotion = useReducedMotion();
  const isFocused = useIsFocused();
  const [shown, setShown] = useState(reducedMotion ? text.length : 0);
  const [caretOn, setCaretOn] = useState(true);
  const hasTypedRef = useRef(false);
  const startRef = useRef(onStart);
  const doneRef = useRef(onDone);
  startRef.current = onStart;
  doneRef.current = onDone;

  useEffect(() => {
    if (reducedMotion) {
      setShown(text.length);
      doneRef.current?.();
      return;
    }
    if (!isFocused) {
      // Parked: keep the full text on screen; the next focus replays.
      setShown(text.length);
      return;
    }
    if (hasTypedRef.current && !replayOnFocus) {
      setShown(text.length);
      return;
    }
    hasTypedRef.current = true;

    setShown(0);
    startRef.current?.();
    // Chars revealed per tick — 1 for headings, larger for long passages so
    // the whole reveal never exceeds ~maxDurationMs.
    const step = Math.max(1, Math.ceil(text.length / Math.max(1, maxDurationMs / charDelayMs)));
    let i = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i = Math.min(text.length, i + step);
        setShown(i);
        if (i >= text.length) {
          if (interval) clearInterval(interval);
          doneRef.current?.();
        }
      }, charDelayMs);
    }, startDelayMs);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [text, charDelayMs, startDelayMs, maxDurationMs, reducedMotion, isFocused, replayOnFocus]);

  // Blinking caret while typing
  useEffect(() => {
    if (!cursor || reducedMotion || shown >= text.length) return;
    const blink = setInterval(() => setCaretOn((c) => !c), 420);
    return () => clearInterval(blink);
  }, [cursor, reducedMotion, shown >= text.length, text]);

  const typing = shown < text.length;

  return (
    <View style={styles.stack}>
      {/* Invisible full text reserves the final layout */}
      <Text style={[style, styles.ghost]} numberOfLines={numberOfLines} accessible={false}>
        {text}
      </Text>
      <Text
        style={[style, StyleSheet.absoluteFillObject as TextStyle]}
        numberOfLines={numberOfLines}
        accessibilityLabel={text}
      >
        {text.slice(0, shown)}
        {cursor && typing && (
          <Text style={[styles.caret, { opacity: caretOn ? 1 : 0 }]}>▎</Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'relative' },
  ghost: { opacity: 0 },
  caret: { color: Colors.gold },
});

export default TypewriterText;
