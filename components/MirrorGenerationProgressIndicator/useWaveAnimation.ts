import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

// Returns a shared value that scrolls from 0 → -(size * 1.5) on repeat,
// creating a continuous right-to-left wave scroll at ~3s per cycle.
// Stops scrolling when iOS Reduce Motion is enabled.
export function useWaveAnimation(size: number) {
  const scrollOffset = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;

      if (reduceMotion) {
        // Static fill — no animation
        scrollOffset.value = 0;
        return;
      }

      scrollOffset.value = withRepeat(
        withTiming(-(size * 1.5), {
          duration: 3000,
          easing: Easing.linear,
        }),
        -1,   // infinite
        false // don't reverse — loop seamlessly
      );
    });

    return () => {
      cancelled = true;
      cancelAnimation(scrollOffset);
    };
  }, [size]);

  return scrollOffset;
}
