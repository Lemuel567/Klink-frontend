import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

/**
 * CountUp — animates a number from its current value to `value` with an
 * ease-out-cubic curve. Runs on the JS thread via requestAnimationFrame
 * (single short-lived number tween) so it can use rich formatters like
 * Intl currency, and always cancels its frame on unmount.
 */
export interface CountUpProps {
  value: number;
  durationMs?: number;
  /** Formats the intermediate number for display. Defaults to rounded integer. */
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function CountUp({
  value,
  durationMs = 900,
  format = (n) => String(Math.round(n)),
  style,
  numberOfLines,
}: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const displayRef = useRef(value);
  displayRef.current = display;

  useEffect(() => {
    fromRef.current = displayRef.current; // continue from what's on screen
    startRef.current = null;

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // displayRef is a ref; intentionally only re-run when the target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {format(display)}
    </Text>
  );
}

export default CountUp;
