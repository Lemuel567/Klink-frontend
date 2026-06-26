import { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { PARALLAX_RATIO_BG, PARALLAX_RATIO_MID } from '../utils/constants';

export function useParallax(heroHeight: number) {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * PARALLAX_RATIO_BG }],
  }));

  const midStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * PARALLAX_RATIO_MID }],
  }));

  const headerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, heroHeight * 0.5, heroHeight], [0, 0.5, 1], 'clamp'),
    backgroundColor: `rgba(45,27,105,${interpolate(scrollY.value, [0, heroHeight], [0, 1], 'clamp')})`,
  }));

  const heroScale = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(scrollY.value, [-100, 0], [1.1, 1], 'clamp'),
      },
    ],
  }));

  return { scrollY, scrollHandler, bgStyle, midStyle, headerOpacity, heroScale };
}
