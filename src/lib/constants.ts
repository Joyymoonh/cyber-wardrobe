// Shared (client + server) domain vocabulary.

export const CATEGORIES = [
  { id: "top", label: "上装" },
  { id: "bottom", label: "下装" },
  { id: "dress", label: "连衣裙/连体" },
  { id: "outer", label: "外套" },
  { id: "shoes", label: "鞋子" },
  { id: "bag", label: "包袋" },
  { id: "accessory", label: "配饰" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [Category, ...Category[]];
export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const STYLES = [
  { id: "minimal", label: "极简", desc: "低饱和、干净利落的线条", hue: "from-stone-300 to-stone-500" },
  { id: "street", label: "街头", desc: "宽松廓形、运动元素与层次", hue: "from-orange-400 to-rose-500" },
  { id: "business", label: "通勤", desc: "得体、利落，适合工作日", hue: "from-slate-400 to-indigo-500" },
  { id: "sweet", label: "甜美", desc: "柔和色彩与女性化细节", hue: "from-pink-300 to-fuchsia-400" },
  { id: "vintage", label: "复古", desc: "大地色、经典单品与做旧质感", hue: "from-amber-500 to-orange-700" },
  { id: "sporty", label: "运动", desc: "功能性面料，轻松活力", hue: "from-lime-400 to-emerald-500" },
  { id: "cyber", label: "赛博", desc: "黑色基调、机能与金属光泽", hue: "from-cyan-400 to-violet-600" },
  { id: "korean", label: "韩系", desc: "温柔配色、叠穿与学院感", hue: "from-sky-300 to-blue-400" },
  { id: "date", label: "约会", desc: "精致、有记忆点", hue: "from-rose-400 to-red-500" },
] as const;
export type StyleId = (typeof STYLES)[number]["id"];
export const STYLE_IDS = STYLES.map((s) => s.id) as [StyleId, ...StyleId[]];
export const styleLabel = (id: string) => STYLES.find((s) => s.id === id)?.label ?? id;

export const SEASONS = [
  { id: "spring", label: "春" },
  { id: "summer", label: "夏" },
  { id: "autumn", label: "秋" },
  { id: "winter", label: "冬" },
] as const;
export type Season = (typeof SEASONS)[number]["id"];
export const SEASON_IDS = SEASONS.map((s) => s.id) as [Season, ...Season[]];

/** Named palette used for tagging; hex is used for swatches and color-harmony scoring. */
export const COLORS: { name: string; hex: string }[] = [
  { name: "黑色", hex: "#111111" },
  { name: "白色", hex: "#f7f7f5" },
  { name: "灰色", hex: "#8e8e93" },
  { name: "米色", hex: "#e8dcc4" },
  { name: "卡其", hex: "#c3a877" },
  { name: "棕色", hex: "#7b4f2c" },
  { name: "藏青", hex: "#1f2a4d" },
  { name: "蓝色", hex: "#3b6fd8" },
  { name: "浅蓝", hex: "#a9c8ec" },
  { name: "绿色", hex: "#3f8a5a" },
  { name: "军绿", hex: "#5b5f3a" },
  { name: "黄色", hex: "#f2c94c" },
  { name: "橙色", hex: "#f2994a" },
  { name: "红色", hex: "#d64545" },
  { name: "酒红", hex: "#7a1f35" },
  { name: "粉色", hex: "#f4b6c8" },
  { name: "紫色", hex: "#8e6bd6" },
  { name: "银色", hex: "#c9ccd1" },
  { name: "金色", hex: "#c9a23f" },
];
export const colorHex = (name: string) => COLORS.find((c) => c.name === name)?.hex ?? "#bbbbbb";
export const NEUTRAL_COLORS = new Set(["黑色", "白色", "灰色", "米色", "卡其", "藏青", "银色"]);

export const BODY_SHAPES = [
  { id: "hourglass", label: "沙漏型", tip: "腰线是你的优势，选择收腰与合身剪裁" },
  { id: "pear", label: "梨型", tip: "上身用亮色或细节吸睛，下身选 A 字、直筒与深色" },
  { id: "apple", label: "苹果型", tip: "V 领、垂坠面料与高腰线能拉长比例" },
  { id: "rectangle", label: "H 型", tip: "用腰带、层次和撞色制造曲线" },
  { id: "inverted_triangle", label: "倒三角", tip: "上身简洁深色，下身增加体量如阔腿裤" },
] as const;
export type BodyShape = (typeof BODY_SHAPES)[number]["id"];
export const BODY_SHAPE_IDS = BODY_SHAPES.map((b) => b.id) as [BodyShape, ...BodyShape[]];

export type BodyProfile = {
  gender?: "female" | "male" | "other";
  heightCm?: number;
  weightKg?: number;
  shoulderCm?: number;
  bustCm?: number;
  waistCm?: number;
  hipCm?: number;
  inseamCm?: number;
  /** Ratios measured from a photo via pose estimation (unitless). */
  scan?: { shoulderHipRatio: number; legBodyRatio: number; scannedAt: number };
  shape?: BodyShape;
  skinTone?: "cool" | "warm" | "neutral";
};

export type Item = {
  id: string;
  name: string;
  category: Category;
  colors: string[];
  styles: StyleId[];
  seasons: Season[];
  material?: string | null;
  brand?: string | null;
  price?: number | null;
  cartoonImage?: string | null;
  cutoutImage?: string | null;
  imageMode?: "original" | "cutout" | "cartoon";
  image?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  favorite: boolean;
  createdAt: number;
};

export type Outfit = {
  id: string;
  title: string;
  style: StyleId;
  occasion?: string | null;
  itemIds: string[];
  reasoning?: string | null;
  tips?: string | null;
  source: "ai" | "rule";
  createdAt: number;
};

export const LLM_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI 兼容",
    desc: "OpenAI、DeepSeek、通义千问、Kimi、智谱、OpenRouter、Ollama 等",
    presets: [
      { name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", visionModel: "gpt-4o-mini" },
      { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", visionModel: "" },
      { name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus", visionModel: "qwen-vl-plus" },
      { name: "Kimi", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k", visionModel: "moonshot-v1-8k-vision-preview" },
      { name: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash", visionModel: "glm-4v-flash" },
      { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", visionModel: "openai/gpt-4o-mini" },
      { name: "Ollama 本地", baseUrl: "http://localhost:11434/v1", model: "qwen2.5", visionModel: "llava" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    desc: "原生 Gemini API，有免费额度",
    presets: [
      { name: "Gemini Flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.5-flash", visionModel: "gemini-2.5-flash" },
    ],
  },
] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number]["id"];
