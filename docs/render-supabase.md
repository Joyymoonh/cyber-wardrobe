# Render + Supabase 免费网页版

本方案提供固定 HTTPS 网页地址，电脑可关机；不是已上传的微信小程序体验版。实际免费资格、配额与可用地区以各自控制台为准。不自动升级、不设置自动付费。闲置时可能休眠，国内访问速度需真机实测。

## 已实现的云端适配

- 配置 `DATABASE_URL` 后使用 PostgreSQL；未配置仍使用原 SQLite。云端禁止静默退回本地数据库。
- 全部账号、会话、衣物/三种图片引用、身材、模型设置与穿搭数据已适配异步数据库。
- `STORAGE_PROVIDER=supabase` 使用私有 Storage，图片仍通过登录后的 `/api/images/...` 读取，客户端不持有管理员密钥。
- 云端每人最多100件衣物、100MB图片/400文件，处理后单图最多2MB。上传失败释放已预留额度。
- 注册邀请码 + 最多2名用户；现有账号不自动上传至云端。若以后迁移本机账号，须保留原 APP_SECRET 才能解密之前保存的模型Key。
- Render 免费模板 `SEGMENTATION_ENABLED=0`，接口和页面均明确禁用自动分割；本地模型代码与已有分割图保留。卡通生成仍由用户主动调用其配置的付费或免费模型。
- `/api/health` 执行真实的轻量数据库查询，不写入用户数据、不发送微信推送、不暴露数据库信息。

## 1. Supabase 项目

使用 Free 组织/项目，不开通付费附加功能。已有项目：`eumogrgdhhfgnnwmrybm`，项目主机由用户提供，连接池地域为东京；Render可优先新加坡，不要为搬地区删除现有项目。

点击项目顶部 Connect，选择 Session pooler、URI，端口5432，复制完整数据库连接串。IPv4连接池比默认IPv6直连更适合Render；使用页面提供的准确池化主机。

密码中的特殊字符须URL编码，例如 `@` -> `%40`、`#` -> `%23`、`:` -> `%3A`、`%` -> `%25`。用户名和主机之间起分隔作用的`@`不要替换。仅编码密码一次。

Settings → API Keys → Secret keys：复制已有`sb_secret_`开头的服务端密钥。代码也兼容旧版`SUPABASE_SERVICE_ROLE_KEY`，但新项目优先用`SUPABASE_SECRET_KEY`。不要将`sb_publishable_`误填成服务端密钥，不把Secret Key提交到GitHub。

## 2. 私密配置

复制 `.env.cloud.example` 为 `.env.cloud.local`（仓库已忽略后者）。本机会话已创建该文件并生成随机APP_SECRET及邀请码；用户只需填数据库连接串密码和Secret Key，不需要复制聊天中任何示例密码。

数据库连接必须校验证书，不能添加 `sslmode=no-verify` 或关闭TLS验证。如出现证书链错误，使用Supabase提供的根证书配置`DATABASE_CA_CERT`（允许以`\n`表示换行），不要降低校验。

运行 `npm run setup:cloud`：建立独立的`wardrobe`数据库schema、开启表RLS、撤销匿名与普通用户角色的表/schema访问，创建/确认私有图片桶。不开放该schema的Supabase Data API。已有图片桶如果是public，脚本拒绝继续。

运行 `npm run check:cloud`：检查数据库读写回滚及私有桶；不会创建真实用户或导入个人照片。设置APP_URL后还会检查公网健康接口与匿名衣柜访问保护。

## 3. 源码仓库

Render需要代码来源。推荐你自己的GitHub私有仓库。现有本地仓库没有远程地址，不以邮箱推测GitHub用户名。连接GitHub应用时由用户审核授权范围，尽量仅授权该仓库。

可使用 `npm run package:cloud` 生成只含代码的部署包和清单，排除data、照片、密钥、日志、构建产物及本机配置。zip用于下载/传输；GitHub仓库应是解压后的源文件，不能只上传一个zip然后让Render直接构建。

## 4. Render Free 服务

从仓库导入`render.yaml`的Blueprint，或手动New → Web Service，运行时Node、地区Singapore、实例Free。

- Build Command：`npm ci && npm run build`
- Start Command：`npm run start:cloud`
- Health Check Path：`/api/health`
- Node：24.13.1；服务监听0.0.0.0及Render提供的PORT。
- 不添加付费磁盘、不创建Render Postgres、不增加第二个免费计算服务。Supabase承担全部持久数据。

将`.env.cloud.local`中的 DATABASE_URL、SUPABASE_URL、SUPABASE_SECRET_KEY、SUPABASE_STORAGE_BUCKET、STORAGE_PROVIDER、APP_SECRET、REGISTRATION_INVITE_CODE、MAX_USERS、SEGMENTATION_ENABLED 分别填入Render服务器环境变量。不要上传整个env文件或粘贴到聊天。APP_SECRET在首次初始化后固定保存；更改会影响已存模型Key。

Blueprint默认自动生成APP_SECRET；若从本地迁移已有加密数据，必须用原secret覆盖自动生成值。新建空云端衣柜则使用新secret即可。

Cloud start会检查数据库、存储与密钥配置；不会在缺少数据库时偷偷使用Render临时磁盘。先通过setup:cloud和check:cloud，再启动服务。

## 5. 验收与分享

1. 固定`https://xxx.onrender.com`链接健康检查200，匿名访问衣柜接口401。
2. 用邀请码创建两个账号；第三个被拒绝。注册默认不会替代邮箱验证或密码找回，邀请小范围试用先通过邀请人管理。
3. 上传照片、编辑分类和颜色、收藏、生成并收藏规则搭配，退出后重新登录。
4. 未登录和另一账号都不能读取照片。云存储与数据库不使用公开权限。
5. 重启Render服务后衣物和照片仍存在。检查Supabase和Render套餐均为Free，未绑定支付或启用付费附加资源。
6. 把链接给女朋友，用她实际网络测试首次唤醒和后续访问；不要把本机/隧道测得的速度当作Render速度。

不承诺0元7×24可用。保留免费计划的休眠，不配置高频保活制造永久在线假象。若后续需要定时健康监测，只返回状态，不携带用户照片、不自动调用收费模型或推送。

## 数据清理与备份

不要手动将Storage桶改公开。删除衣物后清理不再引用的图片；尚未采用的草稿图片会计入额度，需邀请人清理后才能释放。建议定期导出数据库并保存照片备份；Free计划不等于有可用的自动恢复保障。公开上线前补齐自助数据删除/导出、找回密码、监控和恢复演练。

## 当前验证状态

本地类型检查、ESLint、生产构建和60项测试已通过。PostgreSQL使用pg-mem兼容测试，Storage使用模拟服务测试。实际Supabase连接、迁移、文件权限和Render上线必须在私密配置完成后再次实测；尚不能称为已部署。
