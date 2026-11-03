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

type RobotProp = "hanger" | "wand" | "heart" | "wave";

/** Mascot "衣衣": a floating stylist robot. */
export function Robot({ className, holding = "wave" }: { className?: string; holding?: RobotProp }) {
  const body = "#fffdf5";
  const shade = "#e6d1b4";
  const line = { stroke: "#685447", strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 140 150" className={className} role="img" aria-label="AI 造型师机器人" style={{ filter: "drop-shadow(0 10px 24px rgb(155 107 255 / 0.45))" }}>
      <ellipse cx={70} cy={140} rx={30} ry={5} fill="#c7b6d8" opacity={0.35} />
      <ellipse cx={70} cy={140} rx={16} ry={3} fill="#91bda7" opacity={0.6} />
      {/* antenna */}
      <path d="M70 26 V12" {...line} />
      <circle cx={70} cy={10} r={5} fill="#e4a7b0" />
      <circle cx={68.5} cy={8.5} r={1.6} fill="#fff" />
      {/* arms */}
      {holding === "wave" ? (
        <path d="M40 94 Q22 86 20 66" fill="none" stroke={body} strokeWidth={10} strokeLinecap="round" />
      ) : (
        <path d="M40 96 Q26 104 26 112" fill="none" stroke={body} strokeWidth={10} strokeLinecap="round" />
      )}
      <path d="M100 96 Q116 92 118 78" fill="none" stroke={body} strokeWidth={10} strokeLinecap="round" />
      {holding === "wave" && <circle cx={20} cy={63} r={7} fill={body} {...line} strokeWidth={2} />}
      {/* body */}
      <rect x={42} y={80} width={56} height={46} rx={20} fill={body} {...line} />
      <path d="M86 84 Q96 90 96 110 Q96 122 84 124 Q92 112 86 84 Z" fill={shade} />
      <rect x={56} y={92} width={28} height={18} rx={7} fill="#f3ddbd" />
      <path d="M64 101 l3 3 7 -7" fill="none" stroke="#91bda7" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {/* head */}
      <rect x={30} y={24} width={80} height={58} rx={26} fill={body} {...line} />
      <path d="M96 30 Q108 40 108 56 Q108 74 92 80 Q102 62 96 30 Z" fill={shade} />
      <rect x={38} y={36} width={64} height={32} rx={16} fill="#fff3df" />
      <path d="M48 56 Q54 47 60 56 M80 56 Q86 47 92 56" fill="none" stroke="#91bda7" strokeWidth={3.4} strokeLinecap="round" />
      <path d="M66 62 Q70 65 74 62" fill="none" stroke="#e4a7b0" strokeWidth={2.4} strokeLinecap="round" />
      <ellipse cx={44} cy={70} rx={5} ry={3} fill="#e4a7b0" opacity={0.45} />
      <ellipse cx={96} cy={70} rx={5} ry={3} fill="#e4a7b0" opacity={0.45} />
      <path d="M44 40 Q50 37 56 38" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />
      {/* held props */}
      {holding === "hanger" && (
        <g transform="translate(104 48)">
          <path d="M14 8 a4 4 0 1 1 4 4 v4" fill="none" stroke="#91745b" strokeWidth={2.6} strokeLinecap="round" />
          <path d="M18 16 L2 28 H34 Z" fill="none" stroke="#91745b" strokeWidth={2.6} strokeLinejoin="round" />
        </g>
      )}
      {holding === "wand" && (
        <g>
          <path d="M118 78 L128 50" stroke="#91745b" strokeWidth={3.5} strokeLinecap="round" />
          <path d="M129 34 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#91bda7" />
          <circle cx={116} cy={36} r={2} fill="#e4a7b0" />
          <circle cx={138} cy={58} r={1.6} fill="#e4a7b0" />
        </g>
      )}
      {holding === "heart" && (
        <path d="M124 70 c-4 -6 -12 -4 -12 2 c0 6 12 12 12 12 s12 -6 12 -12 c0 -6 -8 -8 -12 -2 z" fill="#e4a7b0" stroke="#685447" strokeWidth={2} />
      )}
      {holding !== "wave" && <circle cx={118} cy={78} r={7} fill={body} {...line} strokeWidth={2} />}
      {holding !== "wave" && <circle cx={26} cy={114} r={7} fill={body} {...line} strokeWidth={2} />}
    </svg>
  );
}

/** Landing hero: an open neon wardrobe with hanging clothes, holo panels and the mascot. */
export function HeroWardrobe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 480" className={className} role="img" aria-label="赛博衣柜插画">
      <defs>
        <linearGradient id="cw-hero-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#91bda7" />
          <stop offset="0.5" stopColor="#c7b6d8" />
          <stop offset="1" stopColor="#e4a7b0" />
        </linearGradient>
        <linearGradient id="cw-hero-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1d55" />
          <stop offset="1" stopColor="#fff3df" />
        </linearGradient>
        <linearGradient id="cw-hero-door" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1f1f30" />
          <stop offset="1" stopColor="#f3ddbd" />
        </linearGradient>
        <radialGradient id="cw-hero-glow">
          <stop offset="0" stopColor="#c7b6d8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#c7b6d8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={240} cy={420} rx={210} ry={34} fill="url(#cw-hero-glow)" />
      <ellipse cx={240} cy={412} rx={150} ry={10} fill="#91bda7" opacity={0.12} />

      {/* cabinet */}
      <rect x={110} y={64} width={260} height={340} rx={22} fill="#f3ddbd" stroke="url(#cw-hero-edge)" strokeWidth={3} />
      <rect x={128} y={94} width={224} height={292} rx={12} fill="url(#cw-hero-inner)" />
      <rect x={190} y={74} width={100} height={12} rx={6} fill="#fff3df" />
      <rect x={196} y={78} width={88} height={4} rx={2} fill="url(#cw-hero-edge)" className="animate-pulse" />
      <path d="M140 300 H340" stroke="#91bda7" strokeOpacity={0.35} strokeWidth={2} />
      <rect x={136} y={302} width={208} height={8} rx={3} fill="#1f1f30" />
      <path d="M138 120 H342" stroke="#c9ccd1" strokeWidth={5} strokeLinecap="round" />

      {/* hanging clothes */}
      {[
        { x: 140, cat: "top", fill: "#91bda7", accent: "#ffffff", d: "0s" },
        { x: 196, cat: "dress", fill: "#e4a7b0", d: "0.4s" },
        { x: 252, cat: "outer", fill: "#c7b6d8", accent: "#f3ddbd", d: "0.8s" },
      ].map((g) => (
        <g key={g.x} className="animate-[sway_5s_ease-in-out_infinite] [transform-box:fill-box] [transform-origin:50%_0%]" style={{ animationDelay: g.d }}>
          <path d={`M${g.x + 44} 120 v6`} stroke="#c9ccd1" strokeWidth={3} strokeLinecap="round" />
          <path d={`M${g.x + 44} 126 L${g.x + 20} 140 H${g.x + 68} Z`} fill="none" stroke="#c9ccd1" strokeWidth={3} strokeLinejoin="round" />
          <g transform={`translate(${g.x - 2} 120) scale(0.77)`}>
            <GarmentShape category={g.cat} fill={g.fill} accent={g.accent} />
          </g>
        </g>
      ))}

      {/* shelf items */}
      <g transform="translate(146 268) scale(0.5)">
        <GarmentShape category="shoes" fill="#f7f7f5" accent="#e4a7b0" />
      </g>
      <g transform="translate(206 262) scale(0.5)">
        <GarmentShape category="shoes" fill="#f3ddbd" accent="#91bda7" />
      </g>
      <g transform="translate(272 244) scale(0.55)">
        <GarmentShape category="bag" fill="#f2c94c" accent="#c3a877" />
      </g>
      <rect x={146} y={326} width={188} height={46} rx={8} fill="#fff3df" stroke="#ffffff" strokeOpacity={0.08} />
      <path d="M160 342 H210 M160 356 H190" stroke="#c7b6d8" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" />
      <circle cx={312} cy={349} r={9} fill="none" stroke="#91bda7" strokeWidth={2.5} />
      <circle cx={312} cy={349} r={3} fill="#91bda7" />

      {/* doors (perspective) */}
      <path d="M110 70 L58 96 V372 L110 398 Z" fill="url(#cw-hero-door)" stroke="url(#cw-hero-edge)" strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M100 210 V256" stroke="#91bda7" strokeWidth={4} strokeLinecap="round" />
      <path d="M70 118 L98 106 M70 352 L98 364" stroke="#fff" strokeOpacity={0.08} strokeWidth={3} />
      <path d="M370 70 L422 96 V372 L370 398 Z" fill="url(#cw-hero-door)" stroke="url(#cw-hero-edge)" strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M380 210 V256" stroke="#e4a7b0" strokeWidth={4} strokeLinecap="round" />
      <rect x={384} y={120} width={26} height={60} rx={6} fill="#91bda7" opacity={0.08} />

      {/* floating holo panels */}
      <g className="animate-float">
        <rect x={14} y={40} width={92} height={58} rx={12} fill="#fff3df" fillOpacity={0.85} stroke="#91bda7" strokeOpacity={0.6} />
        <circle cx={34} cy={60} r={8} fill="#e4a7b0" />
        <path d="M48 56 H92 M48 66 H78" stroke="#91745b" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" />
        <path d="M26 84 H94" stroke="#91bda7" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" strokeDasharray="4 6" />
      </g>
      <g className="animate-float" style={{ animationDelay: "1.2s" }}>
        <rect x={384} y={18} width={84} height={64} rx={12} fill="#fff3df" fillOpacity={0.85} stroke="#e4a7b0" strokeOpacity={0.6} />
        <path d="M398 66 L414 48 L428 58 L452 32" fill="none" stroke="#91bda7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={452} cy={32} r={4} fill="#91bda7" />
      </g>

      {/* sparkles */}
      {[[60, 150, 1], [440, 140, 0.8], [30, 300, 0.7], [450, 300, 1.1], [240, 30, 0.9]].map(([x, y, s], i) => (
        <path
          key={i}
          d="M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5 Z"
          transform={`translate(${x} ${y}) scale(${s})`}
          fill={i % 2 ? "#e4a7b0" : "#91bda7"}
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}

      {/* mascot */}
      <g transform="translate(330 300) scale(0.82)" className="animate-float" style={{ animationDelay: "0.6s" }}>
        <Robot holding="hanger" />
      </g>
    </svg>
  );
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
