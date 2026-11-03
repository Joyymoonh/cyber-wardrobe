# 赛博衣柜 · Cyber Wardrobe

数字化衣柜 Web 应用：注册登录、拍照 / 淘宝京东链接导入衣物、照片身材扫描 + 手动尺寸、按风格自动搭配。大模型由用户在「设置」里自带（OpenAI 兼容接口或 Google Gemini），没配置时用内置规则算法搭配。

技术栈：Next.js 16（App Router）· Tailwind CSS 4 · Node 内置 SQLite（`node:sqlite`）· sharp · MediaPipe Pose（浏览器端）。

## 本地开发

需要 Node.js ≥ 22.13（推荐 24）。

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 单元测试
npm run build && npm start   # 生产模式（standalone）
```

数据（SQLite + 图片）默认存放在 `./data`，可用 `DATA_DIR` 修改。

## 部署上线

### 免费体验部署：Render + Supabase

配置步骤见 [部署指南](docs/render-supabase.md)。数据库和图片保存在 Supabase，Render 运行网站。此配置关闭本地自动分割，卡通化使用用户自行配置的图片模型 API。仅上传源代码，不提交 `.env.cloud.local`、本地账号或照片。

### Docker（推荐，任意云服务器）

```bash
cp .env.example .env
# 编辑 .env，填入 APP_SECRET（openssl rand -base64 32 生成）
docker compose up -d --build
```

服务监听 3000 端口，数据持久化到 `./data`。前面加一层 HTTPS 反向代理（Caddy / Nginx），例如 Caddy：

```
wardrobe.example.com {
  reverse_proxy localhost:3000
}
```

部署在中国大陆服务器需要域名 ICP 备案；另外从大陆服务器直连 OpenAI / Gemini 通常不通，用户可以选择 DeepSeek、通义千问、Kimi、智谱等国内模型，或填写可访问的中转地址。部署在海外服务器则没有这个限制。

### 不用 Docker

```bash
npm ci && npm run build
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
cd .next/standalone && APP_SECRET=... DATA_DIR=/var/lib/wardrobe PORT=3000 node server.js
```

用 systemd 或 pm2 守护进程即可。

> 注意：应用把数据写在本地磁盘，需要部署到有持久化磁盘的环境（云服务器、Railway/Fly.io 挂载卷等），**不适合** Vercel 这类无状态 Serverless 平台。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `APP_SECRET` | **生产必填**，≥16 位，用于加密用户的 API Key。更换后已保存的 Key 失效，需用户重新填写 |
| `DATA_DIR` | 数据目录，默认 `./data`（Docker 中为 `/data`） |
| `ALLOW_PRIVATE_NETWORK` | 设为 `1` 允许服务端访问内网地址（如本机 Ollama）。默认禁止，防 SSRF |
| `INSECURE_COOKIES` | 设为 `1` 允许在纯 HTTP 下登录。默认 Cookie 仅通过 HTTPS 发送 |

## 功能说明

- **账号**：邮箱 + 密码注册（scrypt 哈希），HttpOnly 会话 Cookie，30 天有效；登录/注册有频率限制。
- **导入衣物**：
  - 拍照上传：图片统一压缩为 WebP；配置了视觉模型时自动识别名称、分类、颜色、风格、季节。
  - 购物链接：支持直接粘贴淘宝/天猫/京东 App 的分享口令。服务端解析短链跳转、抓取标题/主图/价格，再交给大模型归类。淘宝经常要求登录，抓不到图片时会提示用户上传商品截图，再用 AI 识别补全。
- **身材扫描**：浏览器内用 MediaPipe 识别全身照骨架，估算肩臀比、腿身比，**照片不会上传**。结合手动填写的三围判断体型（沙漏 / 梨型 / 苹果 / H 型 / 倒三角），也可以手动指定。
- **自动搭配**：9 种风格 × 季节 × 场合 × 天气。AI 模式把衣柜清单和身材信息发给用户自己的模型，返回的单品 ID 会经过校验（去掉编造的单品、同类重复的单品）；模型失败时自动退回内置算法（配色规则 + 风格/季节匹配 + 体型加权）。
- **大模型配置**：内置 OpenAI、DeepSeek、通义千问、Kimi、智谱、OpenRouter、Ollama、Gemini 预设，可以单独指定视觉模型。API Key 用 AES-256-GCM 加密存储，不会返回给前端。

## 安全说明

- 所有数据接口都要求登录，并按用户隔离；图片只有本人能访问。
- 服务端访问用户填写的 URL（模型 Base URL、商品链接、商品图片）时，会逐跳校验 DNS 解析结果，拦截内网 / 环回 / 云元数据地址。
- 频率限制存在进程内存里，适合单实例部署；多实例部署需要换成 Redis 等共享存储。

## 卡通衣柜与图片模型

- 默认是奶油色手绘衣柜，挂杆、抽屉、置物架分区均可折叠；可切换列表视图，本机记住选择。
- 添加衣物先选择照片、购物链接或手动填写，再确认图片、名称、分类、颜色。更多属性折叠显示。
- 购物链接返回可核对、部分信息、平台限制或无效链接四种状态。平台要求验证时可保留分享标题、补截图继续；不会自动登录或绕过验证。
- 「设置 → 卡通图片模型」单独配置图片服务，支持 OpenAI 兼容 `/images/edits` 和 Gemini `generateContent` 图片输出。需填写实际支持图片编辑的模型名；文本或视觉识别模型不能替代图生图模型。
- 上传后点击「生成卡通衣物图」，预览满意再采用并保存。真实原图保留，识别以原图为依据，列表与搭配优先展示已采用的卡通图，可随时改回原图。
- 生成会把原图发往你选择的服务，可能收费，不自动重试付费请求。透明背景是否可用取决于模型，应用保存图片时保留透明通道。
- 原有衣物表不改动。启动时自动新增 `item_art` 和 `image_configs` 两张表，分别保存卡通图引用及加密的图片服务配置。

本地 UI 验收截图位于 `artifacts/`。演示账号与正式用户衣物隔离。

## 两条独立图片处理流程

1. **提取真实衣物**：上传原图并选择上装、下装、裙装等类型，使用本机 SegFormer 衣物语义分割模型提取对应区域。只改变透明度，不重绘 RGB、不补画遮挡部分。结果可擦除、补回、点选连通区域、撤销，再确认采用。透明边距会裁掉并保留少量留白。
2. **生成卡通风格**：用户主动选择用原图或已提取的真实衣物，调用设置中的图片编辑模型。先预览，确认后采用；这一步可能产生模型服务费用。

原图、真实提取图、卡通图独立保留，`imageMode` 决定衣柜和搭配的展示方式。原有数据不丢失，启动时新增 `item_media` 表；旧记录继续使用已有卡通图或原图。改变衣物类型或更换原图时，当前草稿清空旧的提取/卡通结果，避免展示不对应的衣物。

### 准备本机分割模型

```bash
npm run setup:segmentation
# 官方下载站不可达时，可明确选择镜像（只下载模型，不发送照片）：
HF_ENDPOINT=https://hf-mirror.com npm run setup:segmentation
```

模型约 28MB，保存在 `data/models/clothes-segformer`，固定模型版本。应用仅加载本地权重，不在用户点击时临时联网下载。缺少模型时仍可手动选择区域，或保存原图。

模型来源：[Xenova/segformer_b2_clothes](https://huggingface.co/Xenova/segformer_b2_clothes)，上游 [mattmdjaga/segformer_b2_clothes](https://huggingface.co/mattmdjaga/segformer_b2_clothes)。上游标注 `other` 许可，商用上线前需确认模型及训练数据的授权条件。

这类人体衣物解析对真人穿着图更合适；平铺衣物、复杂遮挡、多件叠放需要核对和手动修正。外套与上装共享模型标签，不能保证自动分开内外层。分割不会恢复看不到的部分。

Docker 的 `/data` 卷需要保留模型文件；容器内可运行 `node scripts/setup-segmentation.mjs` 准备权重。CPU 推理建议至少预留 1GB 内存，再按并发量实测调整。

## 当前内测范围（最新）

- 已停用购物链接导入，旧接口返回 410；新增衣物只提供拍照上传和手动填写。
- 自动分割失败时直接显示失败原因，可换图重试；不再提供手动涂选入口。成功结果仍需用户确认后采用。
- 搭配结果和穿搭本使用固定男/女卡通人偶。已生成卡通图的单品使用专属图；其他单品以分类和配色插画示意，并明确不代表真实细节、上身或尺码效果。
- 识别搭配与图片生成仍分开配置，由用户提供 Key。没有生图 Key 也可查看基础卡通搭配示意。

## 微信小程序体验版（代码已接入，尚未上传）

原生客户端位于 `miniprogram/`，使用现有后端和数据。包含邀请码注册/邮箱及微信登录、私有图片、衣柜编辑、分类分割、BYOK 卡通生成、固定人偶配色示意、搭配收藏、手动身材及模型设置。

导入方式、配置和体验版上传条件见 [小程序说明](miniprogram/README.md)。当前已配置真实 AppID；仍需要管理员扫码、在线 HTTPS 后端和合法域名配置后才能真机试用。未将该代码版本描述为已发布版本。
