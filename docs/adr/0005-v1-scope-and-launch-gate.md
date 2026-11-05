# ADR-0005: v1 范围、服务选型与上线门槛（已被 ADR-0007 取代）

- 状态：**已取代**；保留原始决策供追溯
- 日期：2026-11-03
- 决策者：用户 + Claude

> 2026-11-04 更新：v1 改为 GitHub + Cloudflare Pages，服务改为 Giscus / Cloudflare Web Analytics / 百度统计 / 公众号 / Pagefind；上线门槛改为 3 篇中文博客 + 2 篇中文平台文章。以 ADR-0007 与 `docs/plan.md` 为准。

## 背景

- 用户选择「完整平台首版」与「功能门槛上线」，且没有硬性期限。
- 每周可投入 5–10 小时；首发至少 5 篇文章；英文关键页延后到 v1.1。
- 技术栈已定：Nuxt 4.6.x + Nuxt Content 3.16.x，Markdown + Git，静态生成。
- 云厂商：阿里云。评论：Artalk（SQLite）。Newsletter：listmonk（PostgreSQL）+ 阿里云邮件推送。统计：Umami v3（仅支持 PostgreSQL）。搜索：Pagefind（中文分词需验证，备选 FlexSearch）。
- Umami 与 listmonk 共用一个 PostgreSQL 实例（分库），Artalk 使用 SQLite。

## 决策

### 1. v1 功能清单（冻结）

**A. 内容与页面**
- 首页（身份主张、精选文章、最新文章、订阅入口）
- 文章列表 / 归档
- 标签 / 专题页（含「建站第一季」连载页）
- 文章详情页
- About（身份、经历摘要、开放远程机会与合作、联系方式）
- 404 页

**B. 阅读体验**
- 目录、代码高亮、图片优化、上一篇 / 下一篇、阅读时长
- 深色模式、响应式布局
- 中文字体子集化与 `font-display` 策略

**C. GEO 基础设施**
- 纯 HTML 输出（无 JS 可读正文）
- JSON-LD：`Person`、`WebSite`、`BlogPosting`、`BreadcrumbList`
- `sitemap.xml`、RSS / Atom、`robots.txt`、`llms.txt`
- canonical、OpenGraph / Twitter Card、语义化 HTML
- 稳定 slug、ISO 日期、`lastmod`

**D. 互动与数据**
- Artalk 评论（先审后发）
- listmonk 订阅（double opt-in）
- Pagefind 站内搜索
- Umami 访问统计

**E. 运维与安全**
- HTTPS / HSTS、Nginx、Docker Compose
- 自动构建与部署、Git 备份
- 阿里云监控与告警

**F. 合规**
- ICP 备案、公安联网备案
- 评论审核机制
- 隐私说明（统计、邮件订阅、评论数据）

### 2. 上线门槛

功能清单全部完成 **且** 至少 5 篇首发文章可发布。

### 3. 范围冻结

清单外的需求一律进入 v1.1 backlog；v1 开发期间不插入新功能。任何新增需求必须替换清单中的一项，而不是追加。

### 4. v1.1 范围（预告）

英文关键页、Newsletter 自动化、CDN、搜索质量优化、更多互动形式。

## 后果

- 服务器建议 2C4G 阿里云轻量：Nginx + Artalk + Umami + listmonk + PostgreSQL。
- 评论「先审后发」会增加运营负担，但降低合规风险。
- 无硬期限的风险由月度里程碑控制（见 `docs/plan.md`）。
- 5 篇首发文章必须提前规划，不能等站建好再想。

## 待决问题

- 月度基础设施预算。
- 域名邮箱方案。
- 首发 5 篇选题。
- 视觉资产（头像、Logo、配色）。
