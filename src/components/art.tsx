// Hand-drawn SVG illustrations (cartoon + neon). No hooks, so usable from server and client components.
// Garment/robot art avoids <defs> ids on purpose: SVG gradients referenced from a display:none
// instance (e.g. a closed dialog) stop rendering in Chrome, and items repeat many times per page.

import type { CSSProperties } from "react";
import { colorHex, type Category } from "@/lib/constants";

const INK = "#514137";
const OUTLINE = "rgb(7 7 12 / 0.6)";

/** Simple shading overlays shared by garments: a light sheen and a soft shadow. */
const Sheen = ({ d }: { d: string }) => <path d={d} fill="#fff" opacity={0.22} />;
const Shade = ({ d }: { d: string }) => <path d={d} fill="#000" opacity={0.16} />;

/** Garment shape drawn inside a 120×150 box. `accent` is an optional secondary color. */
export function GarmentShape({ category, fill, accent }: { category: Category | string; fill: string; accent?: string }) {
  const stroke = { stroke: OUTLINE, strokeWidth: 2.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (category) {
    case "bottom":
      return (
        <g>
          <path d="M38 30 H82 L90 122 Q90 125 87 125 H67 Q65 125 65 123 L60 64 L55 123 Q55 125 53 125 H33 Q30 125 30 122 Z" fill={fill} {...stroke} />
          <Shade d="M60 64 L65 123 H67 L62 62 Z" />
          <Sheen d="M40 42 L44 42 L38 116 L34 116 Z" />
          {accent && <path d="M84 44 L89 118" stroke={accent} strokeWidth={4} strokeLinecap="round" />}
          <rect x={38} y={30} width={44} height={9} rx={2} fill={fill} {...stroke} />
          <path d="M60 39 V54" {...stroke} fill="none" />
          <circle cx={60} cy={34.5} r={1.8} fill={OUTLINE} />
        </g>
      );
    case "dress":
      return (
        <g>
          <path d="M50 22 L52 50 M70 22 L68 50" {...stroke} fill="none" />
          <path d="M47 30 Q60 38 73 30 L71 54 Q60 59 49 54 Z" fill={fill} {...stroke} />
          <path d="M49 54 Q60 59 71 54 L96 120 Q60 134 24 120 Z" fill={fill} {...stroke} />
          <Shade d="M71 54 L96 120 Q88 124 80 126 L66 57 Z" />
          <Sheen d="M50 60 L54 60 L36 118 L30 117 Z" />
          {accent ? (
            <path d="M49 54 Q60 59 71 54" stroke={accent} strokeWidth={5} fill="none" strokeLinecap="round" />
          ) : (
            <path d="M49 54 Q60 59 71 54" stroke={INK} strokeOpacity={0.35} strokeWidth={4} fill="none" />
          )}
          <path d="M36 104 Q46 110 56 106 M64 108 Q74 112 84 106" stroke="#fff" strokeOpacity={0.3} strokeWidth={2} fill="none" strokeLinecap="round" />
        </g>
      );
    case "outer":
      return (
        <g>
          <path d="M36 36 L50 28 L60 46 L70 28 L84 36 L104 98 Q104 102 100 103 L92 105 L84 72 L84 122 Q84 125 81 125 H39 Q36 125 36 122 L36 72 L28 105 L20 103 Q16 102 16 98 Z" fill={fill} {...stroke} />
          <Shade d="M60 46 L84 36 L84 122 Q84 125 81 125 H60 Z" />
          <Sheen d="M40 42 L46 40 L46 118 L40 118 Z" />
          <path d="M50 28 L60 46 L54 60 L44 34 M70 28 L60 46 L66 60 L76 34" fill={accent ?? fill} {...stroke} />
          <path d="M60 46 V125" {...stroke} fill="none" />
          <path d="M44 92 H54 M66 92 H76" {...stroke} fill="none" />
          <circle cx={60} cy={70} r={2} fill={OUTLINE} />
          <circle cx={60} cy={86} r={2} fill={OUTLINE} />
        </g>
      );
    case "shoes":
      return (
        <g>
          <path d="M18 98 Q18 70 38 64 Q46 62 52 68 Q66 84 90 86 Q106 88 106 102 V106 H18 Z" fill={fill} {...stroke} />
          <Sheen d="M24 90 Q26 74 38 70 L40 74 Q30 78 28 92 Z" />
          {accent && <path d="M58 92 Q74 98 96 96" stroke={accent} strokeWidth={5} fill="none" strokeLinecap="round" />}
          <path d="M42 70 L50 78 M47 66 L56 74 M38 74 L46 82" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
          <path d="M16 104 H108 V110 Q108 116 102 116 H22 Q16 116 16 110 Z" fill="#f7f7f5" {...stroke} />
          <path d="M22 110 H102" stroke={INK} strokeOpacity={0.2} strokeWidth={2} />
        </g>
      );
    case "bag":
      return (
        <g>
          <path d="M42 64 Q42 36 60 36 Q78 36 78 64" fill="none" stroke={fill} strokeWidth={6} strokeLinecap="round" />
          <path d="M42 64 Q42 36 60 36 Q78 36 78 64" fill="none" stroke={OUTLINE} strokeWidth={1.5} strokeLinecap="round" />
          <path d="M28 64 H92 L98 118 Q98 126 90 126 H30 Q22 126 22 118 Z" fill={fill} {...stroke} />
          <Shade d="M74 64 H92 L98 118 Q98 126 90 126 H80 Z" />
          <Sheen d="M32 70 H38 L32 116 H27 Z" />
          <path d="M28 64 H92 L90 84 Q60 94 30 84 Z" fill={accent ?? fill} {...stroke} />
          <rect x={55} y={82} width={10} height={9} rx={2} fill="#c9a23f" {...stroke} strokeWidth={1.8} />
        </g>
      );
    case "accessory":
      return (
        <g>
          <path d="M14 66 Q8 66 8 74 M106 66 Q112 66 112 74" fill="none" {...stroke} />
          <path d="M14 64 H106" {...stroke} fill="none" />
          <rect x={16} y={62} width={38} height={28} rx={12} fill={fill} {...stroke} />
          <rect x={66} y={62} width={38} height={28} rx={12} fill={fill} {...stroke} />
          <path d="M54 72 Q60 66 66 72" fill="none" {...stroke} />
          <path d="M24 70 L32 66 M74 70 L82 66" stroke="#fff" strokeOpacity={0.7} strokeWidth={3} strokeLinecap="round" />
          <path d="M22 80 L44 70 M72 80 L94 70" stroke={accent ?? "#91bda7"} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    case "top":
    default:
      return (
        <g>
          <path d="M30 40 L48 30 Q60 40 72 30 L90 40 L104 64 L89 73 L84 64 V120 Q84 124 80 124 H40 Q36 124 36 120 V64 L31 73 L16 64 Z" fill={fill} {...stroke} />
          <Shade d="M66 40 Q80 36 84 64 V120 Q84 124 80 124 H70 Z" />
          <Sheen d="M40 60 L46 58 V116 H40 Z" />
          {accent && <path d="M36 82 H84 V92 H36 Z" fill={accent} opacity={0.95} />}
          <path d="M48 30 Q60 46 72 30" fill="none" {...stroke} />
          <path d="M48 30 Q60 40 72 30" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} />
        </g>
      );
  }
}

/** Card illustration for items without a photo, tinted with the item's colors. */
export function GarmentArt({ category, colors, className }: { category: Category | string; colors: string[]; className?: string }) {
  const fill = colors[0] ? colorHex(colors[0]) : "#c7b6d8";
  const accent = colors[1] ? colorHex(colors[1]) : undefined;
  return (
    <svg viewBox="0 0 120 150" className={className} role="img" aria-label="单品插画" style={{ filter: `drop-shadow(0 6px 14px ${fill}55)` } as CSSProperties}>
      <circle cx={60} cy={78} r={46} fill={fill} opacity={0.12} />
      <circle cx={60} cy={78} r={46} fill="none" stroke="#fff" strokeOpacity={0.06} strokeDasharray="2 6" />
      <path d="M100 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#91bda7" opacity={0.8} />
      <path d="M18 120 l1.4 3.5 3.5 1.4 -3.5 1.4 -1.4 3.5 -1.4 -3.5 -3.5 -1.4 3.5 -1.4 z" fill="#e4a7b0" opacity={0.7} />
      <GarmentShape category={category} fill={fill} accent={accent} />
    </svg>
  );
}

/** Logo glyph: a hanger with a circuit trace, on the neon gradient tile. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-neon-cyan via-neon-violet to-neon-pink shadow-[0_0_24px_-4px_rgb(155_107_255/0.9)] ${className}`}>
      <svg viewBox="0 0 40 40" className="size-[78%]" aria-hidden>
        <path d="M17.2 11.4 a2.8 2.8 0 1 1 2.8 2.8 v2.2" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        <path d="M20 16.4 L7.6 25 Q6.4 26.6 8.4 26.6 H31.6 Q33.6 26.6 32.4 25 Z" fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
        <path d="M11 32 H17 M23 32 H29" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        <circle cx={20} cy={32} r={1.9} fill={INK} />
        <path d="M31 6 l1.1 2.6 2.6 1.1 -2.6 1.1 -1.1 2.6 -1.1 -2.6 -2.6 -1.1 2.6 -1.1 z" fill="#fff" />
      </svg>
    </span>
  );
}

/** Generated raster art: warm oak wardrobe, with an actual transparent background. */
export function WardrobeIllustration({ className }: { className?: string }) {
  // The same small, transparent asset is used in banners and onboarding.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/art/wardrobe-vignette.webp" width={480} height={480} className={className} alt="浅木色小衣柜，挂着奶油针织上衣与桃粉半裙" style={{ objectFit: "contain" }} />;
}

export function HeroWardrobe({ className }: { className?: string }) {
  return <WardrobeIllustration className={className} />;
}

/** Body-scan placeholder: a figure with landmark dots and a sweeping scan line. */
export function ScanFigure({ className }: { className?: string }) {
  const c = "#91bda7";
  return (
    <svg viewBox="0 0 160 200" className={className} aria-hidden>
      <path d="M14 26 V14 H26 M134 14 H146 V26 M146 174 V186 H134 M26 186 H14 V174" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round" />
      <g fill={c} fillOpacity={0.08} stroke={c} strokeOpacity={0.7} strokeWidth={2} strokeLinejoin="round">
        <circle cx={80} cy={36} r={13} />
        <path d="M60 58 Q80 52 100 58 L108 106 Q106 111 101 109 L96 82 L94 118 L98 174 Q98 178 94 178 H86 L80 128 L74 178 H66 Q62 178 62 174 L66 118 L64 82 L59 109 Q54 111 52 106 Z" />
      </g>
      <g stroke="#e4a7b0" strokeWidth={1.6} strokeOpacity={0.8}>
        <path d="M64 60 L96 60 M64 60 L68 116 M96 60 L92 116 M68 116 L92 116 M68 116 L70 174 M92 116 L90 174" fill="none" strokeDasharray="3 3" />
      </g>
      {[[64, 60], [96, 60], [68, 116], [92, 116], [70, 174], [90, 174], [80, 36], [56, 106], [104, 106]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3.2} fill="#fff" stroke="#e4a7b0" strokeWidth={1.5} />
      ))}
      <g className="animate-[scan_2.8s_ease-in-out_infinite]">
        <rect x={20} y={20} width={120} height={3} rx={1.5} fill={c} />
        <rect x={20} y={23} width={120} height={18} fill={c} opacity={0.12} />
      </g>
    </svg>
  );
}
