import React, { useEffect, useMemo } from "react";
import { useWindowDimensions } from "react-native";
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  Canvas,
  Group,
  Path,
  Skia,
  fitbox,
  processTransform2d,
  rect,
} from "@shopify/react-native-skia";
import type { SkContourMeasure, SkPath, SkRect, Vector } from "@shopify/react-native-skia";

// ─── Star variants ────────────────────────────────────────────────────────────

const STAR_VARIANTS = [
  {
    paths: [
      "M10.4325 1.63281L9.8775 0.195312C9.8325 0.078125 9.72 0 9.6 0C9.48 0 9.3675 0.078125 9.3225 0.195312L8.7675 1.63281L7.3875 2.21094C7.275 2.25781 7.2 2.375 7.2 2.5C7.2 2.625 7.275 2.74219 7.3875 2.78906L8.7675 3.36719L9.3225 4.80469C9.3675 4.92188 9.48 5 9.6 5C9.72 5 9.8325 4.92188 9.8775 4.80469L10.4325 3.36719L11.8125 2.78906C11.925 2.74219 12 2.625 12 2.5C12 2.375 11.925 2.25781 11.8125 2.21094L10.4325 1.63281Z",
      "M4.9575 4.83594L4.15125 2.87891C4.0575 2.64844 3.84 2.5 3.6 2.5C3.36 2.5 3.1425 2.64844 3.04875 2.87891L2.2425 4.83594L0.36375 5.67578C0.1425 5.77344 0 6 0 6.25C0 6.5 0.1425 6.72656 0.36375 6.82422L2.2425 7.66406L3.04875 9.62109C3.1425 9.85156 3.36 10 3.6 10C3.84 10 4.0575 9.85156 4.15125 9.62109L4.9575 7.66406L6.83625 6.82422C7.0575 6.72656 7.2 6.5 7.2 6.25C7.2 6 7.0575 5.77344 6.83625 5.67578L4.9575 4.83594Z",
    ],
    cx: 6,
    cy: 5,
    opacity: 1,
  },
  {
    paths: [
      "M16.5181 2.6125L15.6394 0.3125C15.5681 0.125 15.39 0 15.2 0C15.01 0 14.8319 0.125 14.7606 0.3125L13.8819 2.6125L11.6969 3.5375C11.5188 3.6125 11.4 3.8 11.4 4C11.4 4.2 11.5188 4.3875 11.6969 4.4625L13.8819 5.3875L14.7606 7.6875C14.8319 7.875 15.01 8 15.2 8C15.39 8 15.5681 7.875 15.6394 7.6875L16.5181 5.3875L18.7031 4.4625C18.8813 4.3875 19 4.2 19 4C19 3.8 18.8813 3.6125 18.7031 3.5375L16.5181 2.6125Z",
      "M7.84937 7.7375L6.57281 4.60625C6.42438 4.2375 6.08 4 5.7 4C5.32 4 4.97563 4.2375 4.82719 4.60625L3.55063 7.7375L0.575938 9.08125C0.225625 9.2375 0 9.6 0 10C0 10.4 0.225625 10.7625 0.575938 10.9187L3.55063 12.2625L4.82719 15.3937C4.97563 15.7625 5.32 16 5.7 16C6.08 16 6.42438 15.7625 6.57281 15.3937L7.84937 12.2625L10.8241 10.9187C11.1744 10.7625 11.4 10.4 11.4 10C11.4 9.6 11.1744 9.2375 10.8241 9.08125L7.84937 7.7375Z",
    ],
    cx: 9.5,
    cy: 8,
    opacity: 1,
  },
  {
    paths: [
      "M4.57938 2.31315L3.79312 0.276693C3.72937 0.110677 3.57 0 3.4 0C3.23 0 3.07063 0.110677 3.00688 0.276693L2.22062 2.31315L0.265625 3.13216C0.10625 3.19857 0 3.36458 0 3.54167C0 3.71875 0.10625 3.88477 0.265625 3.95117L2.22062 4.77018L3.00688 6.80664C3.07063 6.97266 3.23 7.08333 3.4 7.08333C3.57 7.08333 3.72937 6.97266 3.79312 6.80664L4.57938 4.77018L6.53438 3.95117C6.69375 3.88477 6.8 3.71875 6.8 3.54167C6.8 3.36458 6.69375 3.19857 6.53438 3.13216L4.57938 2.31315Z",
    ],
    cx: 3.5,
    cy: 4,
    opacity: 1,
  },
];

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLOR_START = "#0866E2";
const COLOR_END = "#CADFF4";

// ─── Geometry helpers ─────────────────────────────────────────────────────────

const fitRect = (src: SkRect, dst: SkRect) =>
  processTransform2d(fitbox("contain", src, dst));

class PathGeometry {
  private totalLength = 0;
  private contour: SkContourMeasure;

  constructor(path: SkPath, resScale = 1) {
    const it = Skia.ContourMeasureIter(path, false, resScale);
    this.contour = it.next()!;
    this.totalLength = this.contour.length();
  }

  getTotalLength() { return this.totalLength; }

  getPointAtLength(length: number): Vector {
    const [pos] = this.contour.getPosTan(length);
    return pos;
  }
}

// ─── prepare() ────────────────────────────────────────────────────────────────

type StarPosition = {
  x: number;
  y: number;
  variant: (typeof STAR_VARIANTS)[number];
};

// Samples the path to build an x-position → arc-length lookup.
// Returns a function: given a canvas x-pixel, returns the arc-length fraction
// (0–1) of the last point on the path at or before that x position.
// "Last point" handles paths that briefly backtrack in x.
const buildXToArcFrac = (geo: PathGeometry, numSamples = 300): ((xCanvas: number) => number) => {
  const total = geo.getTotalLength();
  const samples = Array.from({ length: numSamples + 1 }, (_, i) => {
    const t = (i / numSamples) * total;
    return { x: geo.getPointAtLength(t).x, tFrac: i / numSamples };
  });
  return (xCanvas: number) => {
    let result = 0;
    for (const s of samples) {
      if (s.x <= xCanvas + 1) result = s.tFrac;
    }
    return Math.min(1, result);
  };
};

const prepare = (svg: string, width: number, strokeWidth: number) => {
  const path = Skia.Path.MakeFromSVGString(svg);
  if (!path) return { path: null, canvasHeight: 0, starPositions: [] as StarPosition[], xToArcFrac: (_x: number) => 0 };

  const src = path.computeTightBounds();
  const scale = (width - strokeWidth) / src.width;
  const canvasHeight = src.height * scale + strokeWidth;
  const dst = rect(
    strokeWidth / 2,
    strokeWidth / 2,
    width - strokeWidth,
    canvasHeight - strokeWidth,
  );
  path.transform(fitRect(src, dst));

  const geo = new PathGeometry(path);
  const xToArcFrac = buildXToArcFrac(geo);

  return { path, canvasHeight, xToArcFrac };
};

// ─── StarShape ────────────────────────────────────────────────────────────────

function StarShape({ pos }: { pos: StarPosition }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    const duration = 3000 + Math.random() * 2000;
    const delay = Math.random() * 3000;
    const easing = Easing.inOut(Easing.sin);

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(pos.variant.opacity, { duration: duration / 2, easing }),
          withTiming(0, { duration: duration / 2, easing }),
        ),
        -1,
      ),
    );

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: duration / 2, easing }),
          withTiming(0.8, { duration: duration / 2, easing }),
        ),
        -1,
      ),
    );
  }, []);

  const transform = useDerivedValue(() => [
    { translate: [pos.x - pos.variant.cx, pos.y - pos.variant.cy] as [number, number] },
    { scale: scale.value },
  ]);

  return (
    <Group opacity={opacity} transform={transform}>
      {pos.variant.paths.map((p, j) => (
        <Path key={j} path={p} color="white" />
      ))}
    </Group>
  );
}

// ─── PathGradient ─────────────────────────────────────────────────────────────

interface PathGradientProps {
  pathString: string;
  // 0–1: fraction of the path filled. Pass journalCount / mirrorThreshold.
  progress: number;
  strokeWidth?: number;
  // Extra pixels added to each side so the river bleeds off-screen. Also
  // applies a matching negative marginLeft so the canvas is centered on screen.
  bleed?: number;
}

export function PathGradient({ pathString, progress, strokeWidth = 26, bleed = 0 }: PathGradientProps) {
  const { width: windowWidth } = useWindowDimensions();
  const width = windowWidth + bleed * 2;

  const { path, canvasHeight, xToArcFrac } = useMemo(
    () => prepare(pathString, width, strokeWidth),
    [pathString, width, strokeWidth],
  );

  // Map progress (0–1) to a canvas x-position, then convert to arc-length
  // fraction so the fill corresponds to horizontal screen position, not path length.
  // progress=0 → left screen edge (x=bleed), progress=1 → right screen edge (x=bleed+windowWidth)
  const rawProgress = Math.min(1, progress);
  const targetX = bleed + rawProgress * windowWidth;
  const endT = rawProgress <= 0 ? 0 : xToArcFrac(targetX);

  // Stars are placed along the filled portion using the same x-based target
  const starPositions = useMemo(() => {
    if (!path) return [] as StarPosition[];
    const geo = new PathGeometry(path);
    const total = geo.getTotalLength();
    const starCount = Math.round(rawProgress * 5);
    return Array.from({ length: starCount }, () => {
      const t = total * Math.random() * endT;
      const pos = geo.getPointAtLength(t);
      const variant = STAR_VARIANTS[Math.floor(Math.random() * STAR_VARIANTS.length)];
      return {
        x: pos.x + (Math.random() * 28 - 14),
        y: pos.y + (Math.random() * 28 - 14),
        variant,
      };
    });
  }, [path, endT]);

  if (!path) return null;

  return (
    <Canvas style={{ width, height: canvasHeight, marginLeft: -bleed }}>
      {/* Background track in light blue */}
      <Path
        path={path}
        style="stroke"
        strokeWidth={strokeWidth}
        color={COLOR_END}
        strokeCap="round"
      />
      {/* Filled (progress) portion in primary blue — omitted when no journals yet */}
      {rawProgress > 0 && (
        <Path
          path={path}
          style="stroke"
          strokeWidth={strokeWidth}
          color={COLOR_START}
          strokeCap="round"
          start={0}
          end={endT}
        />
      )}
      {/* Pulsing sparkle stars along the filled portion */}
      {starPositions.map((pos, i) => (
        <StarShape key={i} pos={pos} />
      ))}
    </Canvas>
  );
}
