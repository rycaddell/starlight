// Worklet-safe — runs on the UI thread inside useAnimatedProps.
// Builds an SVG path for a liquid fill with a sinusoidal wave surface.
// scrollOffset (0 → negative) drives horizontal scroll for the looping animation.
export function generateWavePath(
  progress: number,    // 0–1
  size: number,        // circle diameter px
  scrollOffset: number // 0 → -(size * 1.5) during animation
): string {
  'worklet';

  const wavelength = size * 1.5;        // one full sine cycle
  const halfCycle = wavelength / 2;     // = size * 0.75
  const amplitude = size * 0.06;        // wave height
  const fillY = size - progress * size; // wave baseline y

  // Draw enough half-cycles to cover the clip area across the full scroll range.
  // waveWidth = size * 3 ensures coverage even at maximum negative offset.
  const numHalfCycles = Math.ceil((size * 3) / halfCycle) + 1;

  let d = `M ${scrollOffset},${fillY}`;
  let lastX = scrollOffset;

  for (let i = 0; i < numHalfCycles; i++) {
    const x0 = scrollOffset + i * halfCycle;
    const x1 = x0 + halfCycle / 2;  // bezier control point x
    const x2 = x0 + halfCycle;      // end point x
    const yCtrl = i % 2 === 0 ? fillY - amplitude : fillY + amplitude;
    d += ` Q ${x1},${yCtrl} ${x2},${fillY}`;
    lastX = x2;
  }

  // Close shape at the bottom of the canvas
  d += ` L ${lastX},${size} L ${scrollOffset},${size} Z`;

  return d;
}
