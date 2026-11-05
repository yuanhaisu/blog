# 一人交付笔记

`yuanhaisu.com` 的设计与实施文档。

- 作者：袁海粟（Yuan Haisu / yuanhaisu）
- 定位：一人公司的 AI 交付实验
- 读者：独立开发者 / 一人公司
- 成功标准：GEO（实体认知、内容引用、机器可读、信任传递）

## 策略

GitHub 内容源 → Cloudflare Pages → `yuanhaisu.com`；中文 canonical；国外 GEO 优先、英文 v1.1；国内通过知乎 + 微信公众号分发。v1 不做 ICP、不买国内服务器；国内镜像 v2 再评估。

## 文档

- [实施总案](docs/plan.md)
- [上线验收清单](docs/launch-checklist.md)
- [术语表](GLOSSARY.md)
- Agent 配置：[issue tracker](docs/agents/issue-tracker.md) · [triage labels](docs/agents/triage-labels.md) · [domain docs](docs/agents/domain.md)
- ADR
  - [0001 定位与成功标准](docs/adr/0001-positioning-and-success-criteria.md)
  - [0002 托管与合规（v1 已由 0007 取代）](docs/adr/0002-hosting-and-compliance.md)
  - [0003 身份与定位](docs/adr/0003-identity-and-positioning.md)
  - [0004 技术栈与内容](docs/adr/0004-tech-stack-and-content.md)
  - [0005 v1 范围与上线门槛（v1 已由 0007 取代）](docs/adr/0005-v1-scope-and-launch-gate.md)
  - [0006 GEO 与授权](docs/adr/0006-geo-and-licensing.md)
  - [0007 GitHub 优先与分发策略](docs/adr/0007-github-first-and-distribution.md)

## 本地开发

需要 Node 22.22.3+ 或 24.15+（Nuxt 4.6 的引擎要求；`.nvmrc` 固定为 `22.22.3`）与 npm。

```bash
npm install       # 安装依赖
npm run dev       # 本地开发服务器
npm run build     # 静态生成，产物写入 .output/public
npm run preview   # 预览静态产物
npm run test:e2e  # 对 .output/public 运行 Playwright 冒烟测试
npm run ci        # 内容护栏、密钥扫描、构建、产物、内链、Playwright、部署冒烟
```

`npm run test:e2e` 会先由测试配置里的静态服务器提供 `.output/public`，再用 Playwright 访问。本地 Windows 环境使用已安装的 Microsoft Edge（`channel: 'msedge'`）；CI 设置 `CI=true` 后使用已安装的 Chromium。

## 统计配置

Cloudflare Web Analytics 不使用 Cookie，所有公开页面都会立即加载它，脚本不阻塞正文渲染。百度统计会写入 Cookie，因此默认**不加载**：页面底部显示一个小型同意条，读者点击「允许百度统计」后才动态插入 `hm.js`，选择保存在 `localStorage` 的 `analytics-consent` 中；选择「仅使用无 Cookie 统计」后不会再询问，也不会发出百度请求。隐私说明页同步描述这一行为，`tests/e2e/analytics-privacy.spec.ts` 覆盖允许、拒绝、刷新后保持三种状态。

站点 ID 不是密钥，但不要把真实账号信息写进仓库：

```bash
# 未设置时使用 app/utils/analytics.ts 中的占位值（000...000）
NUXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=<cloudflare-beacon-token>
NUXT_PUBLIC_BAIDU_ANALYTICS_ID=<baidu-hm-site-id>
npm run build
```

在 Cloudflare Pages 项目的环境变量中设置同名的 `NUXT_PUBLIC_*` 变量即可。`.env.example` 列出了这些变量。

## 评论配置（Giscus）

文章页的评论基于 Giscus 与 GitHub Discussions，评论内容不进入本站仓库，也没有评论数据库或用户系统。评论只在评论区进入视口或读者点击「加载评论」后才加载；主题跟随站点当前的 `<html data-theme>`（即主题切换按钮与 `localStorage` 的选择，未设置时回退到 `prefers-color-scheme`），并通过 `MutationObserver` 在主题变化后重新加载 iframe。国内读者会看到知乎/公众号讨论入口。禁用 JavaScript 时页面显示 `<noscript>` 说明与 GitHub Discussions 链接。

Giscus 配置不是密钥，但仓库里只有占位值。先在 `yuanhaisu/blog` 仓库启用 Discussions，创建 **Announcements** 类型的分类，再在 <https://giscus.app/zh-CN> 生成配置：

```bash
NUXT_PUBLIC_GISCUS_REPO=yuanhaisu/blog
NUXT_PUBLIC_GISCUS_REPO_ID=<giscus 生成器给出的 data-repo-id>
NUXT_PUBLIC_GISCUS_CATEGORY=Announcements
NUXT_PUBLIC_GISCUS_CATEGORY_ID=<giscus 生成器给出的 data-category-id>
npm run build
```

未设置这些变量时构建仍会成功，并保留 `app/utils/giscus.ts` 中的占位配置；上线前必须在 Cloudflare Pages 的环境变量中填入真实值，否则 Giscus 无法创建讨论。`public/_headers` 的 CSP 已允许 `https://giscus.app` 的脚本与 iframe。

## 知乎 / 微信公众号入口

身份链接只有一处配置：`shared/site-config.mjs` 的 `PROFILE_DEFINITIONS` 与 `resolveProfiles()`。默认值故意留空，About 页显示「账号准备中」占位，`sameAs` 只包含 GitHub 与 RSS，不会编造知乎或公众号 URL。账号建立后通过环境变量提供真实地址：

```bash
NUXT_PUBLIC_ZHIHU_URL=https://www.zhihu.com/people/<id>
NUXT_PUBLIC_WECHAT_MP_URL=https://mp.weixin.qq.com/s/<article-or-profile>
```

只有 `http(s)` 地址会被接受并进入 `sameAs`；未配置时相关入口保持占位。配置后需重新构建并运行 `npm run validate:artifacts`，确认 JSON-LD 与 About 页同步更新。

## 内容、草稿与上线护栏

- 真实草稿放在 `content/posts/drafts/`，该目录被 `.gitignore` 忽略，不会被提交。草稿仍会被内容护栏读取并验证 frontmatter，但不会进入路由、sitemap、RSS、llms.txt 或 Pagefind。
- 用于测试草稿隔离的夹具存放在 `tests/fixtures/content/drafts/`，由 `scripts/stage-content-fixtures.mjs` 在 `npm run build` / `npm run validate:content` 前复制到 `content/posts/drafts/`；`--clean` 可清理复制结果。这样仓库不再跟踪真实草稿，测试仍然是非空验证。
- 首发文章在 frontmatter 写 `launch: true`。内容护栏会要求至少 3 个不同的站内链接和至少 1 张站内原创配图，并允许链接到由已发布文章生成动态 `/tags/...`、`/series/...` 路由。测试夹具与未到发布阶段的文章不写该字段，因此不受约束。

## 图片

Markdown 文章中的图片由 `shared/rehype-lazy-images.mjs` 统一加上 `loading="lazy"` 与 `decoding="async"`，避免长文首屏加载全部配图；作者若在原始 HTML 中显式设置这两个属性，则以作者设置为准。图片应放在 `public/` 下并以站内绝对路径引用（如 `/avatar.png`），上线文章的原创配图也由内容护栏检查。

仓库暂不内置图片格式转换流水线。发布前请自行把位图导出为 **WebP 或 AVIF**（两者都支持时优先 AVIF，兼容性要求高时用 WebP），并保留合理尺寸；需要同时提供回退格式时，在 Markdown 中直接写 `<picture>`：

```html
<picture>
  <source srcset="/images/diagram.avif" type="image/avif" />
  <source srcset="/images/diagram.webp" type="image/webp" />
  <img src="/images/diagram.png" alt="架构示意" loading="lazy" decoding="async" />
</picture>
```

## 部署（Cloudflare Pages）

- 构建命令：`npm run generate`
- 构建输出目录：`.output/public`
- 环境变量：`NODE_VERSION=22`
- 框架预设：None（纯静态站点）

`wrangler.toml` 已声明 `pages_build_output_dir = ".output/public"`；也可以在项目根目录执行 `npx wrangler pages deploy .output/public` 手动发布。真实预览域名由 Cloudflare Pages 项目生成，需要账号侧配置，仓库中不保存任何凭据。

部署加固细节（`www` 301、Always Use HTTPS、HSTS/CSP、预览 HTTPS 与冒烟检查）见[部署与加固](docs/deployment.md)。上线内容、账号侧阻塞项与验收状态见[上线验收清单](docs/launch-checklist.md)。仓库侧可先运行：

```bash
npm run smoke:deployment   # 检查构建产物、200、HSTS/CSP 与 www 301（本地模拟）
npm run check:secrets      # 检查仓库不含凭据与 .env
```

账号侧的 Pages 项目、DNS、Always Use HTTPS 与 `www` Bulk Redirect 仍需在 Cloudflare Dashboard 完成，且无法由仓库代做。

## 当前状态

站点骨架已实现：Nuxt 4 + Nuxt Content 3 静态生成、首页、文章/标签/专题/归档页、无 JavaScript 可读的正文与 Playwright 测试。仓库侧上线门禁（内容护栏、构建、JSON-LD/sitemap/RSS/robots/llms.txt、内链、Pagefind、HSTS/CSP、`www` 跳转声明、冒烟与密钥扫描）已通过；3 篇首发文章与 2 篇平台稿尚未写，Cloudflare Pages 项目、DNS、真实统计/Giscus ID 与 `www` 跳转仍待账号侧完成，详见[上线验收清单](docs/launch-checklist.md)。

## 关键约束

- 每周 5–10 小时；v1 约 85–105 小时，2.5–3.5 个月
- 域名 `yuanhaisu.com`；站名「一人交付笔记」；GitHub `github.com/yuanhaisu`
- Nuxt 4.6 + Nuxt Content 3.16，Markdown + Git，Cloudflare Pages
- v1 中文 canonical；英文 v1.1 在上线后 3 个月内完成
- 首发 3 篇中文博客 + 2 篇中文平台文章
- 评论 Giscus；统计 Cloudflare Web Analytics + 百度统计；搜索 Pagefind；Newsletter 公众号
- `kindergarten` 保持私有；公开案例仓库 `nurture-planet-case-study`
