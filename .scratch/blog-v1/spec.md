Status: ready-for-agent
Type: spec
Feature: blog-v1

## Problem Statement

袁海粟（Yuan Haisu / yuanhaisu）有 11 年后端与分布式系统研发经验、4 年半数据分析部门主管经历，做过金融级私有化 AI 模型服务与 LLM 工具编排，并以一人 + 多 agent 流水线在约 2.5 个月内交付了约 14 万行的多租户 SaaS「养成星球」。他希望把这些经历沉淀为「一人交付实验」的个人品牌，并让 AI agent 在回答「袁海粟是谁」「一人公司如何用 AI 交付软件」等问题时，能准确识别、引用、信任他。

当前状态：域名 `yuanhaisu.com` 已注册；GitHub 账号 `github.com/yuanhaisu` 为本人所有，但信号很弱（无 Profile README、0 followers、以旧 fork 为主）；项目只有定位、ADR、术语表与实施总案，没有站点、没有内容管线、没有可被 AI 抓取的规范页面。

用户面临的问题：

- 没有一个稳定的规范 URL 让 AI 与搜索引擎确认「袁海粟 = 一人交付实验」。
- GitHub Profile 被旧项目稀释，不能独立承担实体锚点。
- 知乎/公众号是墙内平台，内容不可被国外 AI 抓取；国内 AI 又需要中文平台信号。
- 国内服务器 + ICP 备案与「国外优先」的策略冲突，且维护成本高。
- 没有一个低维护、可版本化、可被 AI 读取的写作与发布管线。

## Solution

构建「一人交付笔记」v1：一个 Nuxt 4 + Nuxt Content 3 的静态站点，Markdown + Git 为内容源，Cloudflare Pages 托管，`https://yuanhaisu.com` 为规范 URL。v1 中文 canonical，英文 v1.1 在上线后 3 个月内补齐。

站点提供：首页、文章列表/归档、文章详情、标签、专题、About、隐私页、404；JSON-LD、canonical、OpenGraph、sitemap、RSS、robots、llms.txt；Pagefind 站内搜索；Giscus 评论；Cloudflare Web Analytics + 百度统计；公众号入口；CC BY 4.0 授权。

不引入 CMS、数据库、服务器、ICP、自托管评论/统计/Newsletter。知乎/公众号是分发渠道，博客是规范内容源。

## User Stories

### 写作与发布

1. 作为作者，我希望用 Markdown 写文章并提交到 Git，以便版本化、审阅和回滚。
2. 作为作者，我希望 frontmatter 在构建时被校验，以便格式错误在部署前失败。
3. 作为作者，我希望草稿不出现在生产构建中，以便未完成内容不被公开。
4. 作为作者，我希望每次改动有预览 URL，以便发布前检查。
5. 作为作者，我希望用标签和专题组织文章，以便读者按主题浏览。
6. 作为作者，我希望记录发布时间与更新时间，以便 AI 和读者判断内容新鲜度。
7. 作为作者，我希望代码块有语法高亮，以便技术文章可读。
8. 作为作者，我希望图片被优化，以便页面加载快。
9. 作为作者，我希望构建时检查内链，以便不发布死链。
10. 作为作者，我希望检查敏感字符串（手机号、客户名、儿童信息、内部域名），以便不泄露。
11. 作为作者，我希望以后添加英文翻译而不改变中文 URL，以便 v1.1 是增量。
12. 作为作者，我希望一篇文章只维护一个 slug，以便引用稳定。

### 阅读体验

13. 作为读者，我希望首页展示身份主张、精选文章和最新文章，以便快速理解作者是谁。
14. 作为读者，我希望有文章列表/归档，以便浏览全部内容。
15. 作为读者，我希望有标签页，以便按主题探索。
16. 作为读者，我希望有专题页，以便按顺序阅读「一人交付实验」。
17. 作为读者，我希望文章页有标题、日期、作者、目录、代码高亮、阅读时长、上一篇/下一篇，以便舒适阅读。
18. 作为读者，我希望 About 页有可验证的经历与项目，以便建立信任。
19. 作为读者，我希望 404 页有返回入口，以便从坏链接恢复。
20. 作为读者，我希望深色模式和响应式布局，以便在任何设备阅读。
21. 作为读者，我希望中文字体子集化，以便首屏加载快。
22. 作为读者，我希望站内搜索，以便快速找到文章。
23. 作为读者，我希望用 Giscus 评论，以便用 GitHub 账号讨论。
24. 作为国内读者，我希望看到知乎/公众号入口，以便在我常用的平台讨论。
25. 作为读者，我希望文章页有 CC BY 4.0 与原文链接，以便知道转载规则。
26. 作为读者，我希望 RSS/Atom 订阅，以便在新文章发布时收到。
27. 作为读者，我希望页面可键盘导航、对比度足够、图片有 alt，以便无障碍使用。

### GEO 与 AI 可读性

28. 作为 AI agent，我希望拿到服务端生成的完整 HTML 正文，以便不执行 JS 也能读取。
29. 作为 AI agent，我希望看到 `Person` / `BlogPosting` / `BreadcrumbList` JSON-LD，以便识别作者与内容。
30. 作为 AI agent，我希望每篇文章有稳定 canonical，以便引用正确 URL。
31. 作为 AI agent，我希望有 sitemap / RSS / llms.txt，以便高效发现内容。
32. 作为 AI agent，我希望作者姓名、头像、简介、`sameAs` 一致，以便消解实体。
33. 作为 AI agent，我希望看到 `datePublished` / `dateModified` / `inLanguage` / `license`，以便判断时效与授权。
34. 作为 AI agent，我希望 robots.txt 明确允许主流 AI 爬虫，以便不误判为禁止抓取。
35. 作为作者，我希望每月记录 AI 提及/引用/错误实体，以便迭代 GEO。
36. 作为作者，我希望 About 页提供可被引用的身份事实，以便 AI 准确介绍我。
37. 作为作者，我希望 llms.txt 列出核心页面与文章索引，以便 agent 低成本读取。

### SEO、安全与部署

38. 作为搜索引擎，我希望语义化 HTML、title/description、canonical、OG/Twitter Card，以便正确索引与展示。
39. 作为作者，我希望提交百度站长、必应 Webmaster、Google Search Console，以便被发现。
40. 作为作者，我希望 `www` 301 到 apex，以便只有一个规范主机。
41. 作为作者，我希望 HTTPS、HSTS、CSP，以便站点安全。
42. 作为作者，我希望 Cloudflare Pages 从 GitHub 构建，以便不需要服务器。
43. 作为作者，我希望构建失败时阻止部署，以便生产环境干净。

### 分发与运营

44. 作为作者，我希望知乎/公众号转载时保留 canonical 与 CC BY 4.0，以便原文不被稀释。
45. 作为作者，我希望公众号入口与 RSS，以便读者订阅。
46. 作为作者，我希望隐私页说明统计与评论数据，以便合规。
47. 作为作者，我希望统计无 Cookie 或明确告知，以便尊重读者。
48. 作为作者，我希望公开仓库不含密钥，以便安全。
49. 作为作者，我希望以后加英文 `/en/` 与 `hreflang`，以便国外 AI 引用英文版。
50. 作为作者，我希望站点可在本地一条命令构建与预览，以便快速迭代。

## Implementation Decisions

### 框架与托管

- 使用 Nuxt 4.6.x + Nuxt Content 3.16.x，构建期静态生成；不使用服务端运行时。
- 部署到 Cloudflare Pages，从 GitHub 公开仓库构建；`https://yuanhaisu.com` 为规范 URL，`www` 301。
- DNS 托管在 Cloudflare；通过 `_headers` 配置 CSP、HSTS 与缓存策略。
- 本地开发使用 Node 22 LTS；Windows 上若 Nuxt Content 的 SQLite 依赖需要编译工具，使用 WSL2。
- 不使用 GitHub Pages 作为生产托管；不使用阿里云服务器、ICP、自托管服务。

### 内容模型

- 内容源为 Markdown + Git；文章与页面都在公开仓库中，草稿放私有仓库或标记 `draft: true`。
- 文章 frontmatter 使用构建期 schema 校验，形状如下：

```ts
type PostFrontmatter = {
  title: string
  description: string
  date: string          // ISO 8601
  updated?: string      // ISO 8601
  tags: string[]
  series?: string
  order?: number
  draft: boolean
  featured: boolean
  lang: 'zh' | 'en'
  translationOf?: string // 英文版指向中文 slug
  license: string        // 默认 CC BY 4.0
}
```

- slug 发布后不再修改；必须修改时保留 301。
- 草稿不进入生产构建；构建失败时阻止部署。
- 文章正文必须包含标题、日期、作者、正文、标签/专题信息；无 JS 时仍完整可读。

### 页面与路由

- `/`：首页，展示身份主张、精选文章、最新文章、订阅入口。
- `/posts/[slug]`：文章详情。
- `/tags/[tag]`：标签页。
- `/series/[series]`：专题页，按 `order` 排序。
- `/about`：身份锚点页，包含可验证经历、项目、技能、公开联系方式。
- `/archive`：归档。
- `/privacy`：隐私说明。
- `/feed.xml`、`/sitemap.xml`、`/robots.txt`、`/llms.txt`。
- `/en/...`：英文 v1.1，v1 只保留内容模型与路由约定，不做界面。
- 404 页必须有返回首页与文章列表的入口。

### SEO 与 GEO

- 全站输出 `Person`（带 `@id`）、`WebSite`；文章页输出 `BlogPosting` 与 `BreadcrumbList`。
- `Person` 字段：姓名 `袁海粟`、`alternateName`（`Yuan Haisu`、`yuanhaisu`）、`url`、`image`、`jobTitle`、`description`、`knowsAbout`、`sameAs`。
- `sameAs` 指向 GitHub、知乎、微信公众号、RSS；掘金可选。
- `BlogPosting` 字段：headline、description、datePublished、dateModified、author/publisher 指向 Person `@id`、mainEntityOfPage、image、inLanguage、license。
- 每页输出 canonical、OpenGraph、Twitter Card；日期使用 ISO 8601。
- 语义化 HTML：`article`、`time`、`h1`–`h3`、`nav`、`main`、`figure`。
- 生成 `sitemap.xml`（含 `lastmod`）、RSS/Atom、`robots.txt`（允许主流 AI 爬虫）、`llms.txt`（站点简介、作者、核心页面、文章索引、授权与联系方式）。
- 全站禁用 JavaScript 后，正文、标题、日期、作者、导航仍完整可读。

### 搜索、评论与统计

- 搜索使用 Pagefind 1.5+ 构建期索引；中文查询分词依赖 `Intl.Segmenter`；用真实中文文章实测，不合格则换 FlexSearch（CJK 分词）。
- 评论使用 Giscus，基于 GitHub Discussions；懒加载、跟随主题；作为次要入口，国内读者引导到知乎/公众号。
- 统计使用 Cloudflare Web Analytics + 百度统计；隐私页说明数据范围；不依赖 Cookie。
- 公众号作为中文 Newsletter 与私域入口；v1 不做邮件订阅表单。

### 身份与分发

- 全站统一：`袁海粟（Yuan Haisu）`、`yuanhaisu`；禁止「袁海苏」等变体。
- About 页提供可验证事实：11 年后端与分布式研发、4 年半数据分析部门主管、AI 模型服务与 LLM 应用、一人交付多租户 SaaS。
- 文章页脚展示 CC BY 4.0、作者简介、原文链接、相关文章。
- 知乎/公众号发布时保留 canonical 指向 `yuanhaisu.com`；博客是规范内容源，平台是分发渠道。
- GitHub Profile README 与案例仓库链接到博客；博客 About 页链接回 GitHub/知乎/公众号。

### 内容护栏

- 构建时校验 frontmatter 必填字段与类型。
- 构建时检查内链，发现站内 404 时失败。
- 构建时扫描敏感字符串：手机号、客户名称、儿童信息、内部域名、密钥模式；命中时失败。
- 每篇文章至少 3 个内链；每篇配 1 张原创架构图或流程图。
- 不在公开内容中出现手机号、客户名称、儿童信息；养成星球案例必须脱敏。

### 无障碍与性能

- 语义化 HTML、跳转链接、键盘焦点、对比度、图片 alt。
- 中文字体子集化与 `font-display`；图片懒加载与现代格式。
- 性能预算：国内 LCP < 2.5s、CLS < 0.1。
- 交互仅用于搜索、主题切换、评论加载；正文不依赖客户端渲染。

### 明确不做的实现

- 不做 CMS/可视化后台。
- 不做数据库、服务端 API、用户系统。
- 不做 Artalk、Umami 自建、listmonk、PostgreSQL。
- 不做 GitHub Pages 生产托管。
- 不做完整双语 v1；英文 v1.1 才是硬 gate。
- 不做小红书/抖音、国内镜像、ICP。

## Testing Decisions

### 测试 seam

只开一个 seam：**构建产物 over HTTP**。构建静态站点后，本地 serve 输出目录，用 Playwright 与产物校验器测试；Cloudflare Pages 预览用同一 seam 做部署冒烟。内容 schema 校验属于构建期：非法 frontmatter 让构建失败，用 fixture 证明。Giscus、Cloudflare、百度统计等外部服务不测真实行为，只测配置存在。

### 什么算好测试

- 只测外部行为：URL、HTML 语义、结构化数据、产物内容、跳转与响应头、搜索结果。
- 不测 Nuxt 内部实现、组件内部状态、整页 HTML 快照。
- 断言具体不变量，不做脆弱的像素级或全量快照。
- 用真实中文内容作为 fixture，覆盖代码块、图片、标签、专题、草稿。

### 测试矩阵

- 路由：所有公开路由 200；未知路径 404；`www` 301 到 apex。
- 文章页：标题、日期、作者、目录、代码高亮、上一篇/下一篇、标签/专题存在。
- 无 JS：禁用 JavaScript 后正文、标题、日期、作者、导航仍可读。
- SEO/GEO：JSON-LD 可解析且必填字段齐全；canonical、OG、Twitter Card 正确；sitemap XML 合法；RSS XML 合法；robots.txt 含 AI 爬虫规则；llms.txt 可访问。
- 内链：爬取所有站内链接，无 404。
- 搜索：Pagefind 索引已生成；中文查询能返回预期文章。
- 评论/统计：Giscus 配置与统计脚本存在；不调用外部服务做断言。
- 部署：Cloudflare Pages 预览 200；HSTS/CSP 头存在；HTTPS 可用。
- 内容护栏：敏感字符串 fixture 被拦截；非法 frontmatter fixture 使构建失败。

### 测试载体与先例

- 绿地项目，无既有测试先例；本 spec 建立 Playwright + 产物校验器的模式。
- 不为 JSON-LD/日期格式化等纯函数写单元测试；通过最终 HTML 产物断言，保持单 seam。
- CI 在 PR 上执行构建 + E2E + 内链检查 + 产物校验；Cloudflare Pages 预览作为部署冒烟环境。

## Out of Scope

- 实际撰写 3 篇中文博客与 2 篇平台文章（内容工作；站点必须支持，但写作不在本 spec 的代码范围）。
- GitHub Profile 整理、`kindergarten` 私有化、`nurture-planet-case-study` 案例仓库。
- 知乎/公众号账号注册、排版与发布自动化。
- 小红书/抖音。
- 国内镜像与 ICP。
- 英文 v1.1 的实际翻译与 `/en/` 界面（内容模型与路由约定保留）。
- 邮件 Newsletter 服务（v1 用公众号）。
- CMS/后台、付费内容、广告、电商。
- 自定义统计仪表盘。
- 完整品牌系统与像素级视觉稿（站点主题在范围内，品牌手册不在）。
- 搜索引擎排名保证。
- Giscus 的评论审核后端（外部服务）。

## Further Notes

- 相关 ADR：ADR-0004（技术栈、内容与部署）、ADR-0006（GEO 与授权）、ADR-0007（GitHub 优先与分发）。ADR-0002 与 ADR-0005 在 v1 已被取代。
- 术语使用以根 `GLOSSARY.md` 为准：内容源、发布托管、规范 URL、分发渠道、镜像、同步转载、中文 canonical、英文 v1.1、GitHub 优先。
- 上线门槛：3 篇中文博客 + 2 篇中文平台文章；本 spec 交付站点与内容管线，内容写作是并行工作。
- 发布位置：`.scratch/blog-v1/spec.md`；状态 `ready-for-agent`。
