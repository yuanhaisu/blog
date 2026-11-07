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
| 内容护栏 | `npm run validate:content` | 通过：3 篇正式 + 7 篇测试夹具，1 篇草稿 | frontmatter schema、草稿隔离、正文内链目标、敏感字符串 |
| 密钥扫描 | `npm run check:secrets` | 通过 | 只扫描 Git 跟踪文件；只输出路径与模式名，不输出匹配值 |
| 静态构建（测试夹具） | `npm run build:test` | 通过：10 篇（3 正式 + 7 夹具） | 先 stage 测试夹具，再 `nuxt generate` + Pagefind 中文索引 |
| 产物验收 | `npm run validate:artifacts` | 通过：10 组检查；生产构建 22 条路由、3 篇文章 | 必需文件、路由清单、JSON-LD、canonical/OG/Twitter、无 JS 正文、sitemap、RSS、robots、llms.txt、`_headers`、Pagefind、草稿隔离 |
| 站内链接 | `npm run check:links` | 通过：5 组检查；生产构建 22 个 HTML 页面、635 个站内链接 | 所有公开路由 200、站内 href/src 200、未知路由 404、草稿路由 404、`www` 301（本地模拟） |
| Playwright 全套 | `npm run test:e2e` | 通过（115 个测试） | 路由、404、无 JS、JSON-LD、SEO/GEO、RSS/sitemap/robots/llms、Pagefind 中文搜索、Giscus 主题与统计同意门控、图片懒加载、部署头、`www` 301 |
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
- 草稿不出现在路由、sitemap、RSS、llms.txt、Pagefind 索引或内容数据库转储中；仓库不跟踪真实草稿，`content/posts/drafts/` 被忽略，测试夹具由 `scripts/stage-content-fixtures.mjs` 在构建前复制。
- 页脚与 404 页均展示 CC BY 4.0 授权链接；文章页脚同样展示。
- 所有 Markdown 文章图片带 `loading="lazy"` 与 `decoding="async"`；首发文章通过 `launch: true` 接受至少 3 个站内链接与 1 张站内原创配图检查，动态 `/tags/...`、`/series/...` 路由可被内链解析。
- Cloudflare Web Analytics 无 Cookie、立即加载；百度统计默认不加载，仅在读者明确同意后插入脚本，拒绝后保持无 Cookie 统计。隐私说明页与 Playwright 覆盖允许/拒绝/刷新保持。
- Giscus 主题跟随 `<html data-theme>`（主题按钮与 `localStorage`），监听主题变化并更新 iframe；仅在没有站点主题时回退到 `prefers-color-scheme`。
- 首页有一等精选文章区（`featured: true`，无文章时整段隐藏）与订阅入口（RSS + 公众号占位）。
- `scripts/validate-artifacts.mjs` 已拆分为 `scripts/lib/artifacts/` 下的按产物模块；CSP 不再包含 Google Fonts 来源，字体全部自托管。

## 2. 上线内容：3 篇博客 + 2 篇平台稿初稿已写，待审阅/发布

以下 5 篇是 v1 上线门槛（见 `docs/plan.md` §5.1–5.2）。5 篇均已有初稿（待审阅/发布），因此仍不满足正式上线条件。详细提纲、互链、配图与平台改编方案见 [`docs/content-outlines.md`](content-outlines.md)；平台稿草稿见 `docs/platform-posts/`。

### 2.1 3 篇中文博客（PENDING）

| # | 工作标题 | 状态 |
| --- | --- | --- |
| 1 | 《我为什么开始「一人交付笔记」》 | 已写初稿，待审阅 |
| 2 | 《一人交付实验 #1：一个人 + 多 agent，2.5 个月交付 14 万行 SaaS》 | 已写初稿，待审阅 |
| 3 | 《一人交付实验 #2：AI 工程落地的三层栈》 | 已写初稿，待审阅 |

### 2.2 2 篇平台文章（PENDING）

| # | 平台 | 工作标题 | 状态 |
| --- | --- | --- | --- |
| 4 | 知乎 | 《一个人如何用 AI agent 交付一套多租户 SaaS？》 | 已写草稿，待发布 |
| 5 | 微信公众号 | 《一人公司的 AI 交付实验：第一期复盘》 | 已写草稿，待发布 |

### 2.3 测试夹具已移出生产内容

7 篇测试文章与测试专题已移到 `tests/fixtures/content/`：

```text
tests/fixtures/content/posts/fixture-manifesto.md
tests/fixtures/content/posts/fixture-code-and-toc.md
tests/fixtures/content/posts/fixture-related-notes.md
tests/fixtures/content/posts/fixture-series-part-one.md
tests/fixtures/content/posts/fixture-series-part-two.md
tests/fixtures/content/posts/fixture-tag-newer.md
tests/fixtures/content/posts/fixture-tag-older.md
tests/fixtures/content/series/test-series.md
tests/fixtures/content/series/fixture-series.md
```

它们只由 `npm run build:test` / `npm run validate:content` / CI 通过 `scripts/stage-content-fixtures.mjs` 复制到被忽略的 `content/` 路径；生产构建 `npm run build` 不包含它们。生产内容现有 **3 篇正式文章初稿**（`why-i-started-one-person-delivery-notes`、`one-person-delivery-experiment-01-multi-agent-saas`、`one-person-delivery-experiment-02-ai-engineering-stack`）与真实专题 `one-person-delivery-experiment.md`。

草稿隔离测试使用 `tests/fixtures/content/drafts/draft-example-not-published.md`，同样只在测试时 staged；仓库不跟踪任何真实草稿文件。

### 2.4 内容完成后的动作

1. 3 篇博客已写入 `content/posts/`，frontmatter 已通过 `shared/content-schema.mjs`，并已加 `launch: true`、至少 3 个站内链接与 1 张站内原创配图；下一步是审阅正文与配图。
2. 如需专题页，在 `content/series/` 增加 ASCII slug 的专题文档（中文标题放 `title`）；中文文件名在 Nuxt Content 中可能无法正确生成路由。
3. 平台稿初稿在 `docs/platform-posts/zhihu.md` 与 `docs/platform-posts/wechat.md`；发布后，拿到真实知乎/公众号 URL，再更新第 3 节的 `sameAs` 与 About 入口。
4. 重新执行 `npm run ci`；测试构建会把夹具与正式文章一起纳入 sitemap、RSS、llms.txt 与 Pagefind；生产构建 `npm run build` 只包含正式文章。
5. 测试夹具已在 `tests/fixtures/content/`，生产构建不包含，不需要删除。第 1 篇已使用 `why-i-started-one-person-delivery-notes`，第 2/3 篇使用 `one-person-delivery-experiment-01-multi-agent-saas` 与 `one-person-delivery-experiment-02-ai-engineering-stack`；正文已满足 `launch: true` 护栏。

## 3. 外部账号步骤：Pages 已部署，域名待 NS

Pages 项目已创建并上传生产构建；apex 自定义域已加入项目但仍是 `pending`。以下剩余步骤需要用户账号操作，仓库不保存任何凭据。

### 3.1 Cloudflare Pages 与 DNS

| 项目 | 当前状态 | 剩余项 |
| --- | --- | --- |
| Pages 项目 | 已创建 `yuanhaisu-blog`；生产构建已上传到 <https://yuanhaisu-blog.pages.dev> | 可选：连接 GitHub 自动部署 |
| apex 自定义域名 | `yuanhaisu.com` 已加入 Pages 自定义域，状态 `pending`（CNAME record not set） | 在 Cloudflare 添加站点 + 在 HiChina 改 NS；zone Active 后激活域名 |
| `www` → apex 301 | `cloudflare/www-redirect.json` 声明规则；本地模拟与测试通过；`www` 未加入 Pages 自定义域 | 需要 Proxied DNS + Bulk Redirect（或 Redirect Rule）在账号侧创建并启用 |
| HTTPS / HSTS | 预览站已返回 HSTS/CSP；`_headers` 已生效 | 需要 Always Use HTTPS、边缘证书签发；生产域名上线后复验 |
| 预览部署 | 已完成：<https://yuanhaisu-blog.pages.dev> | 无 |
| 生产部署 | 预览已上线；apex 未激活 | 域名激活后复验生产部署 |

### 3.1.1 当前待你执行：Cloudflare zone + NS

1. 打开 <https://dash.cloudflare.com/> → Add a site → 输入 `yuanhaisu.com` → 选择 Free 计划。
2. Cloudflare 扫描 DNS 后会给出两条 nameserver（形如 `xxx.ns.cloudflare.com`）。
3. 到阿里云/HiChina 域名控制台 → `yuanhaisu.com` → 管理 → 修改 DNS 服务器 → 用这两条替换 `dns1.hichina.com` / `dns2.hichina.com`。
4. 等 Cloudflare 显示 zone **Active**（通常几分钟到 24 小时）。
5. 回复「zone active」；我继续激活 apex、创建 `www` 代理 DNS + 301、开启 Always Use HTTPS、配置环境变量并跑生产冒烟。

当前 `yuanhaisu.com` 没有 A/MX/TXT 记录，改 NS 不会影响现有邮箱或网站；如果后续启用阿里云企业邮箱，在 Cloudflare DNS 添加 MX/SPF/DKIM 即可。

已知问题：Cloudflare Pages 对目录式 `index.html` 默认把 `/posts/foo` 308 到 `/posts/foo/`，而 canonical 不带尾斜杠；v1 暂接受，后续统一尾斜杠或调整 Pages 设置。

### 3.2 真实统计 ID

当前 `app/utils/analytics.ts` 使用可安全提交的占位值，构建仍输出 Cloudflare 统计脚本；百度统计只有在读者同意后才会加载，数据不会进入真实项目。

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
| 知乎主页 | `shared/site-config.mjs` 的 `resolveProfiles()` 默认返回空 `href`，About 显示占位文案；`sameAs` 不包含知乎 | 账号未建立/URL 未确认，不能编造；建立后通过 `NUXT_PUBLIC_ZHIHU_URL` 提供 |
| 微信公众号入口 | 同上，默认占位；`sameAs` 不包含公众号 | 公众号未建立；建立后通过 `NUXT_PUBLIC_WECHAT_MP_URL` 提供 |
| 平台文章 URL | 两篇平台稿草稿已写，待发布 | 发布后把真实 URL 写入环境变量，重新构建并确认 About 与 JSON-LD `sameAs` 同步 |

### 3.5 上线后外部复验

- 预览冒烟：`curl -I https://yuanhaisu-blog.pages.dev/`（已通过 200、HSTS/CSP；文章 URL 目前 308 到尾斜杠后 200）。
- 生产冒烟：`SMOKE_BASE_URL=https://yuanhaisu.com npm run smoke:deployment`（检查 HTTPS、200、HSTS/CSP、`www` 301、http→https）。
- Google Search Console、Bing Webmaster、百度站长：提交 `https://yuanhaisu.com/sitemap.xml`，验证站点所有权。
- 如启用域名邮箱：在 Cloudflare DNS 添加 MX/SPF/DKIM 记录。
- 用真实浏览器复验 Giscus 加载与主题跟随、Cloudflare 无 Cookie 统计、百度统计在点击同意后才发起请求、Pagefind 中文搜索与移动端布局。
- 百度统计的同意条在无 Cookie 状态下不应自动创建 `hm.baidu.com` 请求；拒绝后刷新页面不再出现同意条。

## 4. 上线判定

只有以下三项同时满足，才能把 v1 标记为已上线：

- [x] 仓库侧 `npm run ci` 通过（当前已通过）。
- [ ] 3 篇中文博客 + 2 篇平台文章完成并发布（3 篇博客与 2 篇平台稿已有初稿，尚未发布）。
- [ ] 第 3 节 Cloudflare/DNS/www/HTTPS/统计/Giscus/平台 URL 全部完成并复验（Pages 预览已上线；apex 待 NS，其余待完成）。

在此之前，可以继续使用预览部署、测试夹具与本地门禁，但不应对外宣布上线。
