# 上线验收清单

状态日期：2026-11-05（ticket 13 / 最终集成门禁）

本清单只区分三种状态，不用「差不多」「应该可以」：

- **通过**：仓库内代码与构建产物当前已通过，可在本地或 GitHub Actions 复现。
- **待完成（内容）**：需要写作的内容工作，当前**尚未写**，不属于代码验收。
- **阻塞（账号侧）**：需要登录 Cloudflare、百度统计、Giscus、知乎、公众号等外部账号，仓库与 CI 无法代做。

> 当前结论：**代码/仓库侧门禁通过；上线内容未写；外部账号步骤未执行。站点尚未上线。**
> 现有 7 篇已发布文章是测试夹具，不是上线内容；它们让路由、搜索、RSS、sitemap 等门禁可被验证，**不要删除**。

## 1. 代码 / 仓库侧：现在通过

### 1.1 一条命令跑完全部门禁

```bash
npm run ci
```

它按顺序执行：

```text
validate:content → check:secrets → build → validate:artifacts
→ check:links → test:e2e → smoke:deployment
```

CI 工作流 `.github/workflows/ci.yml` 在 Pull Request、推送到 `main` / `feat/blog-v1`、以及手动触发时执行同一组命令（Node 版本来自 `.nvmrc`，Playwright 使用 CI 安装的 Chromium，本地仍使用 Microsoft Edge）。CI 不执行真实部署。

### 1.2 分项结果

| 检查 | 命令 | 当前结果 | 覆盖内容 |
| --- | --- | --- | --- |
| 内容护栏 | `npm run validate:content` | 通过：7 篇已发布，1 篇草稿 | frontmatter schema、草稿隔离、正文内链目标、敏感字符串 |
| 密钥扫描 | `npm run check:secrets` | 通过 | 只扫描 Git 跟踪文件；只输出路径与模式名，不输出匹配值 |
| 静态构建 | `npm run build` | 通过 | `nuxt generate` + Pagefind 中文索引 |
| 产物验收 | `npm run validate:artifacts` | 通过：10 组检查，19 条公开路由，7 篇文章 | 必需文件、路由清单、JSON-LD、canonical/OG/Twitter、无 JS 正文、sitemap、RSS、robots、llms.txt、`_headers`、Pagefind、草稿隔离 |
| 站内链接 | `npm run check:links` | 通过：5 组检查，19 个 HTML 页面，约 514 个站内链接 | 所有公开路由 200、站内 href/src 200、未知路由 404、草稿路由 404、`www` 301（本地模拟） |
| Playwright 全套 | `npm run test:e2e` | 通过（101 个测试） | 路由、404、无 JS、JSON-LD、SEO/GEO、RSS/sitemap/robots/llms、Pagefind 中文搜索、Giscus/统计配置、部署头、`www` 301 |
| 部署冒烟 | `npm run smoke:deployment` | 通过（本地构建产物） | 200、HSTS、CSP、`www` 301 保留路径与查询 |

### 1.3 已逐项确认的上线不变量

- 每个公开路由（`/`、文章、标签、专题、`/about`、`/archive`、`/privacy`、`/search`）返回 200；未知路径返回 404 页面。
- `www.yuanhaisu.com` 本地模拟返回 301 到 `https://yuanhaisu.com`，保留路径与查询串。真实 DNS/Bulk Redirect 见第 3 节。
- 禁用 JavaScript 时，文章标题、日期、作者、正文仍在服务端 HTML 中；正文容器带 `data-pagefind-body`。
- 每页只有一个 canonical、一个 Person、一个 WebSite；文章额外有 BlogPosting 与 BreadcrumbList；JSON-LD 可解析且 `@id` 唯一。
- `sitemap.xml` 只收录真实存在的公开路由，含 lastmod，排除 `/search`、草稿与 404；RSS 2.0 `feed.xml` 条目数与已发布文章一致。
- `robots.txt` 允许全站抓取并列出 AI 爬虫与 sitemap；`llms.txt` 索引全部已发布文章，包含身份、授权与联系方式。
- `_headers` 含 HSTS、CSP（Giscus、Cloudflare Analytics、百度统计、Pagefind worker、字体来源）与安全头。
- Pagefind 生成 `zh-cn` 索引，已发布文章全部可检索；中文查询有 Playwright 断言。
- Giscus 的 repo / repoId / category / categoryId 配置与 Cloudflare、百度统计脚本均出现在文章或全站 HTML 中；当前值是占位符，真实值见第 3 节。
- 草稿不出现在路由、sitemap、RSS、llms.txt、Pagefind 索引或内容数据库转储中。

## 2. 上线内容：待完成（内容工作，当前未写）

以下 5 篇是 v1 上线门槛（见 `docs/plan.md` §5.1–5.2）。当前**一篇都未写**，因此不满足正式上线条件。

### 2.1 3 篇中文博客（PENDING）

| # | 工作标题 | 状态 |
| --- | --- | --- |
| 1 | 《我为什么开始「一人交付笔记」》 | 未写 |
| 2 | 《一人交付实验 #1：一个人 + 多 agent，2.5 个月交付 14 万行 SaaS》 | 未写 |
| 3 | 《一人交付实验 #2：AI 工程落地的三层栈》 | 未写 |

### 2.2 2 篇平台文章（PENDING）

| # | 平台 | 工作标题 | 状态 |
| --- | --- | --- | --- |
| 4 | 知乎 | 《一个人如何用 AI agent 交付一套多租户 SaaS？》 | 未写、未发布 |
| 5 | 微信公众号 | 《一人公司的 AI 交付实验：第一期复盘》 | 未写、未发布 |

### 2.3 当前 7 篇已发布文章是测试夹具

```text
content/posts/why-i-started-one-person-delivery-notes.md
content/posts/fixture-code-and-toc.md
content/posts/fixture-related-notes.md
content/posts/fixture-series-part-one.md
content/posts/fixture-series-part-two.md
content/posts/fixture-tag-newer.md
content/posts/fixture-tag-older.md
```

它们被 Playwright、内容护栏与站点发现产物当成 fixture 使用。它们**不是**上线内容，也不代表 v1 内容已完成；上线前不要删除，否则测试与门禁会失去可验证的样本。

### 2.4 内容完成后的动作

1. 把 3 篇博客写入 `content/posts/`，frontmatter 通过 `shared/content-schema.mjs`。
2. 如需专题页，在 `content/series/` 增加 ASCII slug 的专题文档（中文标题放 `title`）；中文文件名在 Nuxt Content 中可能无法正确生成路由。
3. 平台文章发布后，拿到真实知乎/公众号 URL，再更新第 3 节的 `sameAs` 与 About 入口。
4. 重新执行 `npm run ci`；构建会自动把新文章纳入 sitemap、RSS、llms.txt 与 Pagefind。
5. 删除或保留夹具由内容负责人决定；删除后必须重新运行全套测试。

## 3. 外部账号步骤：阻塞（blocked for user）

以下步骤均未执行，仓库不保存任何凭据。完成前不能宣称站点已上线。

### 3.1 Cloudflare Pages 与 DNS

| 项目 | 仓库侧现状 | 阻塞项 |
| --- | --- | --- |
| Pages 项目 | 构建命令与输出目录已写入 `docs/deployment.md`：`npm run generate` → `.output/public`，`NODE_VERSION=22` | 需要用户登录 Cloudflare 创建项目并连接 GitHub 仓库 |
| apex 自定义域名 | canonical、sitemap、RSS、llms.txt 均固定 `https://yuanhaisu.com` | 需要在 Cloudflare 添加站点/域名与 DNS 记录，等待证书 Active |
| `www` → apex 301 | `cloudflare/www-redirect.json` 声明规则；本地模拟与测试通过 | 需要 Proxied DNS + Bulk Redirect（或 Redirect Rule）在账号侧实际创建并启用 |
| HTTPS / HSTS | `_headers` 的 HSTS 与 CSP 已通过本地冒烟 | 需要 Always Use HTTPS、边缘证书签发；真实响应头需上线后复验 |
| 预览部署 | 无仓库侧依赖 | 需要 Pages 首次构建生成 `*.pages.dev` 预览 URL |
| 生产部署 | CI 只验证构建产物，不部署 | 需要用户在 Cloudflare 触发生产部署 |

### 3.2 真实统计 ID

当前 `app/utils/analytics.ts` 使用可安全提交的占位值，构建仍输出统计脚本，但数据不会进入真实项目。

| 服务 | 环境变量 | 阻塞项 |
| --- | --- | --- |
| Cloudflare Web Analytics | `NUXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` | 在 Cloudflare Dashboard 创建 Web Analytics 站点并取得 token |
| 百度统计 | `NUXT_PUBLIC_BAIDU_ANALYTICS_ID` | 在百度统计创建站点并取得 hm.js site id |

真实值应通过构建环境变量注入；不要提交到仓库，也不要在日志中打印。

### 3.3 真实 Giscus ID

当前 `app/utils/giscus.ts` 使用：

```text
repoId:     REPLACE_WITH_GISCUS_REPO_ID
categoryId: REPLACE_WITH_GISCUS_CATEGORY_ID
```

仓库名 `yuanhaisu/blog` 与分类 `Announcements` 是默认值。需要在 https://giscus.app 用真实 GitHub 仓库生成 `data-repo-id` 与 `data-category-id`，再通过以下环境变量提供：

```text
NUXT_PUBLIC_GISCUS_REPO
NUXT_PUBLIC_GISCUS_REPO_ID
NUXT_PUBLIC_GISCUS_CATEGORY
NUXT_PUBLIC_GISCUS_CATEGORY_ID
```

未替换前，评论 iframe 不会真正加载；产物验收只能确认配置属性存在。

### 3.4 知乎 / 微信公众号 URL

| 项目 | 仓库侧现状 | 阻塞项 |
| --- | --- | --- |
| 知乎主页 | `PERSON.sameAs` 故意不含知乎；About 使用明确的占位文案 | 账号未建立/URL 未确认，不能编造 |
| 微信公众号入口 | About 使用占位文案 | 公众号未建立，二维码/链接未提供 |
| 平台文章 URL | 第 2 节两篇平台稿未写 | 发布后回填真实 URL，再更新 `sameAs` 与 About |

### 3.5 上线后外部复验

- 生产冒烟：`SMOKE_BASE_URL=https://yuanhaisu.com npm run smoke:deployment`（检查 HTTPS、200、HSTS/CSP、`www` 301、http→https）。
- Google Search Console、Bing Webmaster、百度站长：提交 `https://yuanhaisu.com/sitemap.xml`，验证站点所有权。
- 如启用域名邮箱：在 Cloudflare DNS 添加 MX/SPF/DKIM 记录。
- 用真实浏览器复验 Giscus 加载、两条统计上报、Pagefind 中文搜索与移动端布局。

## 4. 上线判定

只有以下三项同时满足，才能把 v1 标记为已上线：

- [x] 仓库侧 `npm run ci` 通过（当前已通过）。
- [ ] 3 篇中文博客 + 2 篇平台文章完成并发布（当前未写）。
- [ ] 第 3 节 Cloudflare/DNS/www/HTTPS/统计/Giscus/平台 URL 全部完成并复验（当前 blocked）。

在此之前，可以继续使用预览部署、测试夹具与本地门禁，但不应对外宣布上线。
