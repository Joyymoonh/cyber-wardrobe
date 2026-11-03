import type { BodyProfile, BodyShape } from "./constants";

type Point = { x: number; y: number; visibility?: number };

/** MediaPipe Pose landmark indices. */
const L = { lShoulder: 11, rShoulder: 12, lHip: 23, rHip: 24, lAnkle: 27, rAnkle: 28, nose: 0 } as const;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export type ScanResult = { shoulderHipRatio: number; legBodyRatio: number };

/**
 * Derives proportions from a frontal full-body pose. Coordinates may be normalized;
 * pass the image aspect so x/y distances are comparable.
 */
export function proportionsFromLandmarks(lm: Point[], aspect = 1): ScanResult | null {
  const need = [L.lShoulder, L.rShoulder, L.lHip, L.rHip, L.lAnkle, L.rAnkle, L.nose];
  if (need.some((i) => !lm[i] || (lm[i].visibility ?? 1) < 0.5)) return null;
  const p = (i: number): Point => ({ x: lm[i].x * aspect, y: lm[i].y });
  const shoulderW = dist(p(L.lShoulder), p(L.rShoulder));
  // Skeletal hip landmarks sit inside the silhouette; scale ~1.35 approximates visual hip width.
  const hipW = dist(p(L.lHip), p(L.rHip)) * 1.35;
  const hipMid = mid(p(L.lHip), p(L.rHip));
  const ankleMid = mid(p(L.lAnkle), p(L.rAnkle));
  const totalH = ankleMid.y - p(L.nose).y;
  if (hipW <= 0 || totalH <= 0) return null;
  return {
    shoulderHipRatio: round(shoulderW / hipW, 3),
    legBodyRatio: round((ankleMid.y - hipMid.y) / totalH, 3),
  };
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/** Classify body shape; tape measurements take precedence over photo ratios. */
export function classifyShape(p: BodyProfile): BodyShape | undefined {
  const { bustCm: bust, waistCm: waist, hipCm: hip, shoulderCm: shoulder } = p;
  if (bust && waist && hip) {
    const top = shoulder ? Math.max(bust, shoulder * 2.2) : bust;
    if (top - hip >= 3.6 * 2.54 && top / hip > 1.05) return "inverted_triangle";
    if (hip - top >= 3.6 * 2.54 && hip / top > 1.05) return "pear";
    if (waist / Math.min(top, hip) <= 0.75) return "hourglass";
    if (waist >= Math.max(top, hip) * 0.92) return "apple";
    return "rectangle";
  }
  const r = p.scan?.shoulderHipRatio;
  if (r) {
    if (r >= 1.12) return "inverted_triangle";
    if (r <= 0.9) return "pear";
    return "rectangle";
  }
  return undefined;
}

export const effectiveShape = (p: BodyProfile | null) => (p ? (p.shape ?? classifyShape(p)) : undefined);

export function describeBody(p: BodyProfile | null): string {
  if (!p) return "未提供身材数据";
  const parts: string[] = [];
  if (p.gender) parts.push({ female: "女性", male: "男性", other: "其他" }[p.gender]);
  if (p.heightCm) parts.push(`身高 ${p.heightCm}cm`);
  if (p.weightKg) parts.push(`体重 ${p.weightKg}kg`);
  if (p.bustCm || p.waistCm || p.hipCm) parts.push(`三围 ${p.bustCm ?? "?"}/${p.waistCm ?? "?"}/${p.hipCm ?? "?"}`);
  if (p.scan) parts.push(`肩臀比 ${p.scan.shoulderHipRatio}，腿身比 ${p.scan.legBodyRatio}`);
  const shape = effectiveShape(p);
  if (shape) parts.push(`体型 ${shape}`);
  if (p.skinTone) parts.push(`肤色 ${{ cool: "冷调", warm: "暖调", neutral: "中性" }[p.skinTone]}`);
  return parts.join("，") || "未提供身材数据";
}
