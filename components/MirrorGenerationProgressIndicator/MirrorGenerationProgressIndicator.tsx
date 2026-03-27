import React, { useEffect, useRef } from 'react';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import Svg, { Defs, ClipPath, Circle, Path, G } from 'react-native-svg';
import { generateWavePath } from './generateWavePath';
import { useWaveAnimation } from './useWaveAnimation';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface MirrorGenerationProgressIndicatorProps {
  progress: number;   // 0–1
  size?: number;      // diameter in px, defaults to 48
  fillColor?: string;
  backgroundColor?: string;
}

export function MirrorGenerationProgressIndicator({
  progress,
  size = 48,
  fillColor = '#0866E2',
  backgroundColor = '#E8F0FB',
}: MirrorGenerationProgressIndicatorProps) {
  const scrollOffset = useWaveAnimation(size);

  // Shared value so the worklet can read progress updates without re-subscribing
  const progressSV = useSharedValue(progress);
  useEffect(() => {
    progressSV.value = progress;
  }, [progress]);

  // Runs on the UI thread at 60fps — computes the full wave path including scroll position
  const animatedPathProps = useAnimatedProps(() => ({
    d: generateWavePath(progressSV.value, size, scrollOffset.value),
  }));

  // Stable unique clip-path ID per component instance
  const clipId = useRef(`mgpi-clip-${Math.random().toString(36).slice(2)}`).current;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  return (
    <Svg
      width={size}
      height={size}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={cx} cy={cy} r={r} />
        </ClipPath>
      </Defs>

      {/* Background circle */}
      <Circle cx={cx} cy={cy} r={r} fill={backgroundColor} />

      {/* Animated liquid fill — wave path clipped to circle */}
      <G clipPath={`url(#${clipId})`}>
        <AnimatedPath animatedProps={animatedPathProps} fill={fillColor} />
      </G>
    </Svg>
  );
}
