# 一人交付笔记 — 实施总案（GitHub 优先版）

> 域名：`yuanhaisu.com`　站名：`一人交付笔记`　作者：`袁海粟（Yuan Haisu / yuanhaisu）`
> 定位：一人公司的 AI 交付实验　核心读者：独立开发者 / 一人公司
> 成功标准：GEO 四场景（实体认知、内容引用、机器可读、信任传递）
> v1 策略：GitHub 内容源 → Cloudflare Pages → `yuanhaisu.com`；中文 canonical；国外优先、英文 v1.1；国内靠知乎/公众号分发

---

## 1. 已冻结的决策

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| ADR-0001 | 定位与成功标准 | 有效 |
| ADR-0002 | 阿里云 + ICP 托管 | **v1 由 ADR-0007 取代**；保留为未来国内镜像选项 |
| ADR-0003 | 身份、定位与转化 | 有效（2026-11-04 修订） |
| ADR-0004 | 技术栈、内容管理与部署 | 有效（部署改为 Cloudflare Pages） |
| ADR-0005 | v1 范围与服务 | **v1 由 ADR-0007 取代**；保留原始决策供追溯 |
| ADR-0006 | GEO 与授权 | 有效（2026-11-04 修订） |
| ADR-0007 | GitHub 优先与分发策略 | 有效，v1 的总纲 |

**核心事实**

- GitHub 账号 `github.com/yuanhaisu` 为本人所有，但无 Profile README、0 followers，内容以旧 fork 为主。
- `kindergarten` 公开仓库配置审计：env / ini / mcp 配置中未发现真实密钥，未做全仓库秘密扫描；`parent/.env.development` 含非占位 URL，`.mcp.json` 暴露本地路径，仓库无 README/LICENSE、99MB、含内部文档。
- GitHub Pages 国内直连不稳定；Cloudflare Pages 更稳且支持自定义 HTTP 头。
- 域名指向境外托管无需 ICP；未来国内镜像需独立域名 + ICP。

---

## 2. 目标架构

```text
┌────────────────────┐      push       ┌──────────────────────────┐
│ GitHub 公开仓库      │ ──────────────▶ │ Cloudflare Pages 构建     │
│ yuanhaisu/blog      │                 │ Nuxt 4 + Content 3        │
│ Markdown + Git      │                 │ nuxt generate             │
└────────────────────┘                 └────────────┬─────────────┘
                                                   │
                                                   ▼
                                    ┌──────────────────────────┐
                                    │ yuanhaisu.com（静态）      │
                                    │ Cloudflare CDN + DNS      │
                                    └───────┬─────────┬────────┘
                                            │         │
                      ┌─────────────────────┘         └─────────────────────┐
                      ▼                                                     ▼
          ┌──────────────────────┐                              ┌──────────────────────┐
          │ Giscus（评论）        │                              │ Pagefind（站内搜索）   │
          │ GitHub Discussions   │                              │ 构建期索引             │
          └──────────────────────┘                              └──────────────────────┘
                      │
                      ▼
          ┌──────────────────────┐        ┌──────────────────────┐
          │ Cloudflare Web       │        │ 百度统计              │
          │ Analytics            │        │ 国内流量细节           │
          └──────────────────────┘        └──────────────────────┘

分发：
  博客（中文 canonical）──▶ 知乎（全文/改编）
                        └─▶ 微信公众号（精编/摘要）
  GitHub Profile README ──▶ 博客 / 知乎 / 公众号

未来（v2，可选）：
  国内镜像 yuanhaisu.cn ── 阿里云 + ICP ── canonical 指向 yuanhaisu.com
```

### 2.1 组件清单

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 内容源 | GitHub `yuanhaisu/blog`（public） | Markdown + Git；草稿放私有仓库 |
| 框架 | Nuxt 4.6.x + Nuxt Content 3.16.x | Nuxt 3 已 EOL；Content v3 使用 `content.config.ts` + `queryCollection()` |
| 构建 | `nuxt generate` | 纯静态 HTML；正文不依赖 JS |
| 托管/CDN | Cloudflare Pages + Cloudflare DNS | 从 GitHub 构建；`_headers` 配置 CSP/HSTS |
| 规范 URL | `https://yuanhaisu.com` | apex canonical；`www` 301 |
| 评论 | Giscus | GitHub Discussions；国内读者引导到知乎/公众号 |
| 统计 | Cloudflare Web Analytics + 百度统计 | 全球基线 + 国内细节 |
| 搜索 | Pagefind 1.5+ | 支持中文查询分词；上线前实测，备选 FlexSearch |
| Newsletter | 微信公众号 | 中文；英文 Buttondown 放 v1.1 |
| 域名邮箱 | 阿里云企业邮箱免费版 | `hi@yuanhaisu.com`；DNS 在 Cloudflare，添加 MX/SPF/DKIM |
| 分发 | 知乎 + 微信公众号 | 每月 1 篇旗舰；小红书/抖音 v2 |
| 未来镜像 | `yuanhaisu.cn` + 阿里云 + ICP | v2 再决策，canonical 指向 `yuanhaisu.com` |

### 2.2 URL 结构

```text
/                          首页
/posts/[slug]              文章详情（中文 canonical）
/tags/[tag]                标签页
/series/[series]           专题 / 连载页
/about                     About（身份锚点核心页）
/archive                   归档
/feed.xml                  RSS / Atom
/sitemap.xml               sitemap
/llms.txt                  面向 AI agent 的站点索引
/robots.txt                爬虫策略
/privacy                   隐私说明
/en/...                    英文版（v1.1）
```

约定：

- `https://yuanhaisu.com` 为规范 URL；`www` 301。
- slug 发布后不改；必须改时保留 301。
- 每篇文章输出 `datePublished`、`dateModified`、`inLanguage: zh-CN`；英文版 `inLanguage: en`。
- 每篇页脚展示 CC BY 4.0 与原文链接。

### 2.3 内容模型

```ts
// content.config.ts（示意）
export default defineContentConfig({
  collections: {
    posts: defineCollection({
      type: 'page',
      source: 'posts/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        updated: z.string().optional(),
        tags: z.array(z.string()).default([]),
        series: z.string().optional(),
        order: z.number().optional(),
        draft: z.boolean().default(false),
        featured: z.boolean().default(false),
        lang: z.enum(['zh', 'en']).default('zh'),
        translationOf: z.string().optional(), // 英文版指向中文 slug
        license: z.string().default('CC BY 4.0'),
      }),
    }),
  },
})
```

发布流程：新建 `.md` → 本地预览 → commit → push → Cloudflare Pages 构建 → 部署。无后台、无数据库写入。

---

## 3. 成本

| 项目 | 估算 | 备注 |
| --- | --- | --- |
| 域名摊销 | 5–10 元/月 | `.com` 年费约 60–120 元；保留现有注册商，改 DNS 到 Cloudflare |
| Cloudflare Pages | 0 元 | 静态站点免费层；500 builds/月、带宽与请求免费 |
| GitHub | 0 元 | 公开仓库免费 |
| 阿里云企业邮箱 | 0 元 | 免费版；需实名与 7 天内配置 MX/SPF |
| 百度统计 | 0 元 | 免费 |
| Giscus / Pagefind | 0 元 | 开源 / GitHub Discussions |
| Buttondown（v1.1） | 0–10 元/月 | 英文邮件；免费层足够早期 |
| **合计** | **约 5–20 元/月** | 远低于 100–200 元预算 |

若未来流量增大，可考虑 Cloudflare Pages Pro（约 20 美元/月）或国内镜像；v1 不需要。

---

## 4. 路线图与工作量

> 按每周 7.5 小时估算；写作与建站部分重叠。v1 约 **85–105 小时**，约 **2.5–3.5 个月**。英文 v1.1 另计 20–30 小时，上线后 3 个月内完成。

### Phase 0：身份与账号（10–15h）

- GitHub Profile 整理：新建 `yuanhaisu/yuanhaisu` README（中英双语）、归档旧 fork、pin 6 个仓库。
- `kindergarten` 处理：保持私有；新建 `nurture-planet-case-study` 公开案例仓库。
- Cloudflare 账号、Pages 项目、DNS 迁移。
- 阿里云企业邮箱免费版，配置 MX/SPF/DKIM。
- 知乎、微信公众号账号注册与资料统一。
- 百度统计、Cloudflare Web Analytics、Giscus 配置准备。

**产物**：GitHub Profile 可读、案例仓库上线、域名 DNS 就绪、邮箱可用、平台账号就绪。

### Phase 1：站点骨架与设计（30–35h）

- Nuxt 4 + Nuxt Content 3 初始化；`app/` 目录、TypeScript、ESLint。
- 本地环境：Node 22 LTS；Nuxt Content 的 SQLite 依赖在 Windows 上可能需要 VS Build Tools，必要时用 WSL2。
- 设计 Token：配色、字体、间距、代码块样式；技术杂志感排版。
- 页面：首页、文章列表、文章详情、About、专题页、404。
- Markdown 渲染：代码高亮、目录、图片优化、上一篇/下一篇、阅读时长。
- 深色模式、响应式、中文字体子集化。
- Cloudflare Pages 预览部署。

**产物**：可浏览的完整站点骨架 + 设计规范 + 预览 URL。

### Phase 2：GEO 与服务（15–20h）

- JSON-LD、canonical、OpenGraph、sitemap、RSS/Atom、robots.txt、llms.txt。
- 语义化 HTML 审计；禁用 JS 测试。
- Pagefind 搜索接入，用真实中文文章测试分词；不合格换 FlexSearch。
- Giscus 评论接入（次要入口）。
- Cloudflare Web Analytics + 百度统计接入。
- Cloudflare `_headers`：CSP、HSTS、缓存策略。

**产物**：GEO 检查清单全绿；`curl` 可读到完整正文；搜索/评论/统计可用。

### Phase 3：内容生产（25–35h）

- 3 篇中文博客 + 2 篇平台文章（见第 5 节）。
- 每篇配架构图/流程图、内链、作者简介、CC BY 4.0。
- 敏感信息脱敏：客户名称、儿童信息、内部域名、手机号、密钥。

**产物**：3 篇可发布博客 + 2 篇平台稿。

### Phase 4：上线与验收（5–10h）

- 性能预算：国内 LCP < 2.5s、CLS < 0.1；移动端可用。
- 可访问性：键盘导航、对比度、alt 文本。
- DNS 切换、HTTPS、`www` 301、sitemap 提交。
- 百度站长、必应 Webmaster、Google Search Console。
- 监控 48h；记录 GEO 基线。

**产物**：站点上线，3 篇博客可访问，平台稿发布。

### 触发器

- Phase 1 超过 6 周：砍掉 Giscus 与百度统计到 v1.1，先上线 3 篇博客。
- 连续 4 周无进展：重新评估范围，优先保证内容产出。
- 英文 v1.1 超过上线后 3 个月：视为「国外优先」失败，重新分配时间。

---

## 5. 内容计划

### 5.1 v1：3 篇中文博客

| # | 标题（工作名） | 作用 | 目标关键词 |
| --- | --- | --- | --- |
| 1 | 《我为什么开始「一人交付笔记」》 | 身份宣言；建立 Person 实体；说明读者能得到什么 | 袁海粟、一人公司、AI 交付、独立开发 |
| 2 | 《一人交付实验 #1：一个人 + 多 agent，2.5 个月交付 14 万行 SaaS》 | 旗舰案例；展示架构、量化指标、agent 流水线 | 一人开发、AI Agent、多租户 SaaS、Go |
| 3 | 《一人交付实验 #2：AI 工程落地的三层栈》 | 技术深度；模型服务、LLM 工具编排、数据算法 | Triton、YOLOv5、PaddleOCR、LLM、私有化部署 |

### 5.2 v1：2 篇平台文章

| # | 平台 | 标题（工作名） | 形式 |
| --- | --- | --- | --- |
| 4 | 知乎 | 《一个人如何用 AI agent 交付一套多租户 SaaS？》 | 技术长文/问答体，改编自 #2 |
| 5 | 微信公众号 | 《一人公司的 AI 交付实验：第一期复盘》 | 精编/摘要 + 幕后 + 原文链接 |

### 5.3 v1.1：英文翻译（上线后 3 个月内）

- 3 篇首发文章的英文版，路径 `/en/posts/[slug]`。
- About、首页英文版。
- `hreflang` 指向中文原文；英文内容用于国外 AI 检索与引用。
- 英文邮件 Newsletter 可选 Buttondown。

### 5.4 写作与分发规则

- 每篇 3000–6000 中文字，含可验证细节、代码/配置片段、失败与取舍。
- 每篇至少 3 个内链，指向 About、专题页、相关文章。
- 每篇配 1 张原创架构图或流程图（SVG）。
- 文末固定：作者简介、CC BY 4.0、订阅入口、相关文章。
- 不在文中暴露手机号、客户名称、儿童信息；养成星球相关内容必须脱敏。
- 节奏：每月 1 篇旗舰；博客首发 → 3 天内知乎 → 1 周内公众号。
- 小红书/抖音 v2 再评估；不要现在开四条战线。

---

## 6. GitHub Profile 计划

### 6.1 审计结论

- 配置文件（env / ini / mcp）中未发现真实密钥；`server/configs/app.ini.example` 全部占位符。未做全仓库秘密扫描。
- `parent/.env.development` 含两个非占位 URL；`.mcp.json` 暴露本地工具路径。
- `.gitignore` 只忽略 `.env.local`/`.env.*.local`，不忽略 `.env` 与 `.mcp.json`。
- 仓库无 README、无 LICENSE、99MB、278 commits，含大量内部文档。
- 关键词扫描见「家长/幼儿园/儿童/客户」，未发现具体 PII，但作为公开作品集噪声大。

### 6.2 行动

1. 新建 `yuanhaisu/yuanhaisu` Profile README（中英双语）：姓名、定位、博客、知乎、公众号、pin 项目、联系方式。
2. 新建 `nurture-planet-case-study` 公开仓库：架构图、技术选型、量化指标、脱敏截图、关键代码片段；选择许可证（MIT / Apache-2.0 / CC BY-NC 4.0）。
3. `kindergarten` 保持私有；若未来公开，先清理 `.env.development`、`.mcp.json`、内部文档，并补 README/LICENSE。
4. 归档旧 fork（不删除）：Carbon、ebooks、TensorRT 指南、AI-System、AAAMLP-CN、gin-vue-admin、pddSpider、thesecretlivesofdata、single-sign-on、Convertor、czb_wx、redis-3.0-annotated、wechat_spider、Qix。
5. Pin 6 个：`nurture-planet-case-study`、`blog`、`PddVizExtract`、`chat-room`、`skills`（或新建 `agent-pipeline-template`）、`yuppie-mcp-siliconflow`（或新建 `go-ai-service-demo`）。
6. 给保留仓库补 description、topics、README。
7. 头像、姓名、简介与博客/知乎/公众号保持一致。

---

## 7. GEO 执行清单

### 7.1 技术

- JSON-LD：`Person`（`@id: https://yuanhaisu.com/#person`）、`WebSite`、`BlogPosting`、`BreadcrumbList`。
- `Person.sameAs`：GitHub、知乎、微信公众号、RSS。
- `sitemap.xml`、`feed.xml`、`robots.txt`、`llms.txt`。
- canonical、OpenGraph、Twitter Card、语义化 HTML。
- 禁用 JavaScript 后正文完整可读。
- Cloudflare `_headers`：CSP、HSTS、缓存策略。

### 7.2 内容与实体

- 3 篇中文博客形成「一人交付」主题簇，互相内链。
- About 页提供可验证事实：11 年后端与分布式研发、4 年半数据分析部门主管、AI 模型服务与 LLM 应用、一人交付多租户 SaaS。
- 全站统一：`袁海粟（Yuan Haisu）`、`yuanhaisu`；禁止「袁海苏」等变体。
- GitHub Profile README、案例仓库、博客三处互相链接。

### 7.3 分发

- 博客（中文 canonical）→ 知乎全文/改编 → 公众号精编/摘要。
- 知乎是国内 AI 搜索的主要可抓取锚点；公众号是不可抓取的私域，负责信任与订阅。
- 英文 v1.1 发布后，`/en/` 页面用于国外 AI 检索与引用。

### 7.4 监测

- 百度站长、必应 Webmaster、Google Search Console。
- 每月搜索：`袁海粟`、`yuanhaisu`、`一人交付笔记`、`一人公司 AI 交付`、`one-person AI delivery`。
- 记录 AI 回答中的提及、引用、错误实体；每月一条基线。

---

## 8. 合规与风险

### 8.1 合规

- v1 托管在境外，不需要 ICP / 公安备案。
- 未来国内镜像：独立域名 `yuanhaisu.cn` + 独立 ICP；canonical 指向 `yuanhaisu.com`。
- 知乎/公众号内容遵守平台规则；不写敏感话题，不发客户/儿童信息。
- Giscus 评论在 GitHub 上；国内读者引导到知乎/公众号。
- 百度统计与 Newsletter 需在隐私页说明数据范围。
- `kindergarten` 完整仓库私有；案例仓库必须脱敏。

### 8.2 风险登记

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| Cloudflare 国内访问波动 | 国内读者体验不稳 | 国内触达靠知乎/公众号；v2 可选国内镜像 |
| 英文翻译拖延 | 国外 GEO 无法启动 | 上线后 3 个月硬 gate；每月检查 |
| 写作断更 | GEO 无燃料 | 每月 1 篇旗舰；先列提纲再写 |
| GitHub Profile 整理耗时 | 推迟建站 | 限时 2 周；先做 README + 归档 |
| `kindergarten` 隐私 | 合规风险 | 保持私有；案例仓库脱敏 |
| Pagefind 中文分词差 | 搜索不可用 | 真实文章实测；备选 FlexSearch |
| Giscus 国内使用门槛 | 评论少 | 降为次要入口；知乎/公众号承接 |
| 平台账号冷启动 | 国内分发慢 | 先知乎 + 公众号；小红书/抖音 v2 |

---

## 9. 验收清单（Definition of Done）

### 站点

- [ ] 首页、文章页、归档、标签、专题、About、404 全部可用
- [ ] 移动端与桌面端布局正常；深色模式可用
- [ ] 禁用 JavaScript 后正文完整可读
- [ ] 国内 LCP < 2.5s，CLS < 0.1（Cloudflare 环境下实测）
- [ ] HTTPS、HSTS、CSP 配置完成
- [ ] `www` 301 到 apex

### GEO

- [ ] `Person` / `WebSite` / `BlogPosting` / `BreadcrumbList` 校验通过
- [ ] `sitemap.xml`、`feed.xml`、`robots.txt`、`llms.txt` 可访问
- [ ] canonical、OpenGraph、Twitter Card 正确
- [ ] 百度站长、必应、GSC 已提交
- [ ] 每月 GEO 基线记录已建立

### 服务

- [ ] Giscus 评论可用
- [ ] Cloudflare Web Analytics 有数据
- [ ] 百度统计有数据
- [ ] Pagefind 中文搜索可用
- [ ] 公众号入口可用

### GitHub

- [ ] Profile README 上线（中英双语）
- [ ] `nurture-planet-case-study` 公开仓库上线
- [ ] `kindergarten` 已私有或已脱敏
- [ ] 旧 fork 已归档
- [ ] 6 个仓库已 pin
- [ ] 博客仓库 public，草稿私有

### 内容

- [ ] 3 篇中文博客发布
- [ ] 知乎、公众号各 1 篇发布
- [ ] 每篇有内链、作者简介、CC BY 4.0
- [ ] 无客户/儿童/手机号/密钥泄露

### 英文 v1.1

- [ ] 上线后 3 个月内完成 3 篇英文翻译
- [ ] About、首页英文版上线
- [ ] `hreflang` 正确

---

## 10. 立即可执行的下一步

1. **GitHub**：新建 `yuanhaisu/yuanhaisu` Profile README；归档旧 fork；把 `kindergarten` 设为私有。
2. **案例仓库**：新建 `nurture-planet-case-study`，先放 README 与架构图。
3. **Cloudflare**：创建 Pages 项目，连接博客仓库；把 `yuanhaisu.com` 的 DNS 迁到 Cloudflare。
4. **邮箱**：申请阿里云企业邮箱免费版，配置 MX/SPF/DKIM，开通 `hi@yuanhaisu.com`。
5. **站点**：初始化 Nuxt 4 + Nuxt Content 3，搭首页/文章页/About。
6. **平台**：注册/完善知乎、微信公众号，统一头像与简介。
7. **内容**：先写第 1 篇《我为什么开始「一人交付笔记」》的提纲。
8. **监测**：注册百度统计、Cloudflare Web Analytics、百度站长/必应/GSC。

---

## 11. 明确不做（v1）

- 不做 ICP 备案、不买国内服务器（国内镜像 v2 再评估）
- 不做 Artalk / Umami 自建 / listmonk / PostgreSQL
- 不做 GitHub Pages 生产托管
- 不做小红书 / 抖音（v2）
- 不做完整双语（英文 v1.1，上线后 3 个月内）
- 不做付费内容、广告、电商、付费社群
- 不做自建后台 / CMS
- 不做论坛 / 社区 / 用户投稿
- 不做 App、小程序、视频号
- 不做复杂推荐算法、个性化首页
- 不做多地域部署与 Kubernetes
