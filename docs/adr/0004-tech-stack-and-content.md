# ADR-0004: 技术栈、内容管理与部署

- 状态：已接受；部署与服务部分由 ADR-0007 更新
- 日期：2026-11-03（2026-11-04 修订）
- 决策者：用户 + Claude

## 背景

- 用户具备 Go / Vue / Nuxt 背景，希望博客是「作品」而非纯工具，愿意自己开发。
- 每周可投入 5–10 小时。
- 内容管理选择 Markdown + Git，不做自建后台。
- GEO 要求正文以纯 HTML 输出，不依赖 JavaScript 才能被 agent 读取。
- 2026-11-04 转向：GitHub 为内容源，Cloudflare Pages 托管，`yuanhaisu.com` 为规范 URL；v1 中文 canonical，英文 v1.1。

## 决策

1. **框架**：Nuxt 4（当前稳定版 4.6.x）+ Nuxt Content v3（当前 3.16.x）。
   - Nuxt 3 已于 2026-07-31 EOL，不采用。
   - Nuxt Content v3 使用 `content.config.ts` 集合与 `queryCollection()` API，构建期落 SQLite。
2. **渲染**：静态生成（`nuxt generate`），部署为纯静态文件；不使用服务端运行时。
3. **内容**：Markdown / MDC + Git。文章即仓库文件，无自建后台。博客仓库 public，草稿与未发布内容放私有仓库。
4. **语言**：中文 canonical。v1 发布 3 篇中文文章；上线后 3 个月内完成 3 篇英文翻译 + About / 首页英文版（v1.1），使用 `/en/` 路径与 `hreflang`。
5. **托管与 DNS**：Cloudflare Pages 从 GitHub 仓库构建；`https://yuanhaisu.com`（apex）为规范 URL，`www` 301；DNS 托管在 Cloudflare；用 `_headers` 配置 CSP/HSTS。v1 不使用阿里云服务器，不做 ICP。
6. **服务**：Giscus 评论（GitHub Discussions）、Cloudflare Web Analytics + 百度统计、微信公众号 Newsletter、Pagefind 搜索。不引入 Artalk、Umami 自建、listmonk、PostgreSQL。
7. **依赖最小化**：不引入重型 CMS；不以国外 SaaS 作为核心链路。v1.1 的英文邮件可选 Buttondown。

## 后果

- 发布文章 = commit + push，AI agent 可直接读写与批量处理。
- 无服务器运维；成本大幅下降；国内访问依赖 Cloudflare，不等于国内服务器。
- 必须控制 Nuxt 客户端 hydration：正文、标题、元数据在无 JS 时仍完整可读。
- 中文全量字体体积大，需子集化与 `font-display` 策略，否则首屏性能受伤。
- Pagefind v1.5+ 已支持中文查询分词，上线前仍需用真实文章实测；不合格则换 FlexSearch（CJK 分词）。
- Giscus 需要 GitHub 登录；国内读者的讨论引导到知乎/公众号。
- 英文翻译是硬 gate：上线后 3 个月内未完成，视为「国外优先」失败。

## 待决问题

- 英文翻译的审校流程。
- 微信公众号注册与首月排期。
- Cloudflare DNS 迁移与企业邮箱 MX/SPF/DKIM 的先后顺序。
- Pagefind 中文搜索实测结果。
