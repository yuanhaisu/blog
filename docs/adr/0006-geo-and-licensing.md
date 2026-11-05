# ADR-0006: GEO 策略与内容授权

- 状态：已接受（2026-11-04 修订）
- 日期：2026-11-03
- 决策者：用户 + Claude

## 背景

- 成功标准为 GEO 四场景：实体认知、内容引用、机器可读、信任传递。
- 目标 AI 生态：国外（ChatGPT、Claude、Perplexity、Gemini）优先，国内（豆包、元宝、Kimi、通义、文心、DeepSeek、秘塔、百度 AI 搜索）第二。
- 用户选择「全开放 + CC BY 4.0」。
- 外部身份锚点：GitHub、知乎、微信公众号（首批三个）；掘金作为可选技术分发，v2 再定。
- 语言：v1 中文 canonical；上线后 3 个月内完成 3 篇英文翻译 + About/首页英文版，使用 `/en/` 与 `hreflang`。

## 决策

### 1. 抓取策略

`robots.txt` 允许主流 AI 爬虫，包括但不限于：

- OpenAI：`GPTBot`、`OAI-SearchBot`、`ChatGPT-User`
- Anthropic：`ClaudeBot`、`Claude-SearchBot`、`Claude-User`
- Perplexity：`PerplexityBot`
- Google：`Googlebot`、`Google-Extended`
- 字节：`Bytespider`
- 百度：`Baiduspider`
- 必应：`bingbot`

不设全站反爬。对恶意高频爬虫使用 Cloudflare 速率限制 / WAF，而不是封禁。

### 2. 机器可读入口

- `llms.txt`：站点简介、核心页面、文章索引、作者信息。
- `sitemap.xml`：全量 URL + `lastmod`。
- RSS / Atom：全文或摘要 + 作者 + 发布时间。
- JSON-LD：`Person`（含 `sameAs`）、`WebSite`、`BlogPosting`、`BreadcrumbList`。
- 语义化 HTML：`article`、`time`、`h1`–`h3`、`nav`、`main`。
- 稳定 slug、ISO 8601 日期、作者页与 About 页。

### 3. 实体一致性

- 全站统一写法：`袁海粟（Yuan Haisu）`，网络 ID `yuanhaisu`。
- `Person.sameAs` 指向 GitHub、知乎、微信公众号、RSS；掘金若启用再补。
- 头像、简介、链接在博客与外部平台保持一致。
- About 页提供可验证事实：经历、项目、技能、公开联系方式。

### 4. 内容授权

- 采用 **CC BY 4.0**：允许复制、分发、改编、商业使用，要求署名与链接。
- 页脚、RSS、`llms.txt` 中明确授权声明。
- 允许 AI 训练、检索、引用；不追求技术性封锁。

### 5. 分发与交叉验证

- 旗舰文章同步到知乎（中文全文/改编）与微信公众号（精编/摘要）；文末注明原文链接，canonical 指向 `yuanhaisu.com`。
- GitHub Profile README 与项目 README 链接到博客。
- 每个外部平台的个人简介使用同一句话与同一头像。
- 英文 v1.1 发布后，`/en/` 页面使用 `hreflang` 指向中文原文；英文内容用于国外 AI 检索与引用。

### 6. 监测

- 提交百度站长、必应 Webmaster、Google Search Console。
- 定期用中英文搜索「袁海粟」「yuanhaisu」「一人公司 AI 交付」「one-person AI delivery」等查询，记录 AI 回答中的提及、引用与错误。
- 每月记录一次 GEO 基线（提及、引用、错误实体）；国内 AI 主要通过知乎内容触达，国外 AI 主要通过博客与 GitHub 触达。

## 后果

- 全开放意味着内容可能被无署名转载；以 canonical 与署名声明降低风险，不追求技术封锁。
- 国内平台同步发布需遵守平台原创规则，避免首发冲突。
- `sameAs` 与外部资料需要长期维护，否则实体信号会衰减。
- 需要持续产出内容，GEO 才能从「可抓取」变成「被引用」。
