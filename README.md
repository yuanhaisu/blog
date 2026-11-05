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
```

`npm run test:e2e` 会先由测试配置里的静态服务器提供 `.output/public`，再用 Playwright 访问。若 Playwright 浏览器无法下载，配置使用本机已安装的 Microsoft Edge（`channel: 'msedge'`）。

## 统计配置

所有公开页面的正文之后都会加载 Cloudflare Web Analytics 与百度统计，脚本使用 `defer` / 动态 `async`，不阻塞正文渲染。站点 ID 不是密钥，但不要把真实账号信息写进仓库：

```bash
# 未设置时使用 app/utils/analytics.ts 中的占位值（000...000）
NUXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=<cloudflare-beacon-token>
NUXT_PUBLIC_BAIDU_ANALYTICS_ID=<baidu-hm-site-id>
npm run build
```

在 Cloudflare Pages 项目的环境变量中设置同名的 `NUXT_PUBLIC_*` 变量即可。`.env.example` 列出了这两个变量。

## 部署（Cloudflare Pages）

- 构建命令：`npm run generate`
- 构建输出目录：`.output/public`
- 环境变量：`NODE_VERSION=22`
- 框架预设：None（纯静态站点）

`wrangler.toml` 已声明 `pages_build_output_dir = ".output/public"`；也可以在项目根目录执行 `npx wrangler pages deploy .output/public` 手动发布。真实预览域名由 Cloudflare Pages 项目生成，需要账号侧配置，仓库中不保存任何凭据。

## 当前状态

站点骨架已实现：Nuxt 4 + Nuxt Content 3 静态生成、首页、首篇中文文章、无 JavaScript 可读的正文与 Playwright 冒烟测试。Cloudflare Pages 的真实预览部署待账号侧完成。

## 关键约束

- 每周 5–10 小时；v1 约 85–105 小时，2.5–3.5 个月
- 域名 `yuanhaisu.com`；站名「一人交付笔记」；GitHub `github.com/yuanhaisu`
- Nuxt 4.6 + Nuxt Content 3.16，Markdown + Git，Cloudflare Pages
- v1 中文 canonical；英文 v1.1 在上线后 3 个月内完成
- 首发 3 篇中文博客 + 2 篇中文平台文章
- 评论 Giscus；统计 Cloudflare Web Analytics + 百度统计；搜索 Pagefind；Newsletter 公众号
- `kindergarten` 保持私有；公开案例仓库 `nurture-planet-case-study`
