# ADR-0007: GitHub 优先与分发策略

- 状态：已接受
- 日期：2026-11-04
- 决策者：用户 + Claude
- 取代：ADR-0002（v1 托管）、ADR-0004 的部署部分、ADR-0005 的服务与范围部分

## 背景

2026-11-04，用户改变了此前「国内阿里云 + ICP 备案」的方案，转为：

- 个人博客以 GitHub 为内容源与协作入口；
- 国外 GEO 优先，国内第二；
- 国内先通过知乎、微信公众号（以及后续小红书/抖音）分发；
- 个人域名的国内镜像后续再考虑。

支持这一转向的事实：

- 用户的技术身份与目标读者（独立开发者、一人公司）高度依赖 GitHub；
- GitHub 账号 `github.com/yuanhaisu` 为用户本人所有；
- 域名指向境外托管无需 ICP；
- 2026 年 GitHub Pages 国内直连不稳定（实测 16 次请求 8 次 TCP 握手失败），Cloudflare Pages 更稳且支持自定义 HTTP 头；
- 国内平台是触达国内读者的更短路径，且知乎对国内 AI 搜索更友好。

## 决策

### 1. 内容源与托管

- **内容源**：GitHub 公开仓库 `yuanhaisu/blog`，Markdown + Git；草稿与未发布内容放私有仓库。
- **托管**：Cloudflare Pages，从 GitHub 仓库构建；不使用 GitHub Pages 作为生产托管。
- **规范 URL**：`https://yuanhaisu.com`（apex），`www` 301；DNS 托管在 Cloudflare。
- **框架**：Nuxt 4.6.x + Nuxt Content 3.16.x，静态生成，纯 HTML 正文。

### 2. 语言与受众

- **v1 语言**：中文 canonical。3 篇中文博客 + 2 篇中文平台文章。
- **英文 v1.1**：上线后 **3 个月内**完成 3 篇首发文章的英文翻译 + About / 首页英文版；这是硬性 gate，不是愿望。
- **受众优先级**：国外技术人 / AI 第一，国内第二；中文内容通过知乎/公众号触达国内，英文内容通过 GitHub / 博客 / 国外 AI 生态触达国外。

### 3. 分发

- **GitHub**：Profile README（中英双语）、pin 6 个相关仓库、博客仓库、案例仓库。
- **博客**：`yuanhaisu.com`，中文 canonical，CC BY 4.0，全开放 AI 抓取。
- **知乎**：每月 1 篇旗舰文章的中文全文/改编；国内 AI 搜索的主要可抓取锚点。
- **微信公众号**：每月 1 篇精编/摘要 + 原文链接；中文 Newsletter 与私域。
- **小红书 / 抖音**：v2 再评估；v1 不开四条战线。
- **掘金**：可选技术分发，v2 再定。

### 4. 服务

| 能力 | v1 方案 | 说明 |
| --- | --- | --- |
| 评论 | Giscus | GitHub Discussions；零服务器；国内读者引导到知乎/公众号 |
| 统计 | Cloudflare Web Analytics + 百度统计 | 全球基线 + 国内细节；均免费 |
| Newsletter | 微信公众号 | 中文；英文 Buttondown 放 v1.1 |
| 搜索 | Pagefind | v1.5+ 支持中文查询分词；上线前实测 |
| 域名邮箱 | 阿里云企业邮箱免费版 | `hi@yuanhaisu.com`；DNS 在 Cloudflare，添加 MX/SPF/DKIM |
| 部署 | Cloudflare Pages | 从 GitHub 构建；`_headers` 配置 CSP/HSTS |

不引入 Artalk、Umami 自建、listmonk、Postgres、阿里云轻量服务器。

### 5. GitHub Profile

- 新建 `yuanhaisu/yuanhaisu` Profile README（中英双语），统一姓名、头像、简介、链接。
- 归档旧 fork（Carbon、ebooks、TensorRT 指南、AI-System、AAAMLP-CN、gin-vue-admin、pddSpider、thesecretlivesofdata、single-sign-on 等），不删除。
- `kindergarten` 配置审计结论：env / ini / mcp 配置中未发现真实密钥；未做全仓库秘密扫描。`parent/.env.development` 含非占位 URL，`.mcp.json` 暴露本地路径，仓库无 README/LICENSE、99MB、含内部文档。决定：完整仓库保持私有；另建 `nurture-planet-case-study` 公开案例仓库（架构、指标、脱敏截图、关键代码片段）。
- 博客仓库 public；草稿私有。

### 6. 上线门槛与工作量

- 功能：站点骨架、GEO 基础设施、Giscus、统计、Pagefind、公众号入口。
- 内容：3 篇中文博客 + 2 篇中文平台文章。
- 工作量：约 **85–115 小时**，按 7.5h/周约 **2.5–3.5 个月**。
- 触发器：若 Phase 1 超过 6 周，砍掉 Giscus 与百度统计到 v1.1，先上线 3 篇博客。

### 7. 国内镜像

- v1 不做。若未来要做，使用独立域名（建议 `yuanhaisu.cn`）+ 独立 ICP 备案，canonical 指向 `yuanhaisu.com`；不建议用 `cn.yuanhaisu.com`，因为主域名未备案时子域名无法单独备案。

## 后果

- **ADR-0002 在 v1 失效**：不做 ICP、不买阿里云轻量、不做公安备案；保留为未来国内镜像的选项。
- **ADR-0004 部署部分失效**：Cloudflare Pages 取代阿里云 + Nginx；无服务器运维。
- **ADR-0005 服务部分失效**：Giscus / Cloudflare Web Analytics / 百度统计 / 公众号 / Pagefind 取代 Artalk / Umami / listmonk。
- **成本大幅下降**：域名摊销 + 企业邮箱免费版 + Cloudflare Pages 免费层 + 百度统计免费；约 5–10 元/月。
- **国内访问仍依赖 Cloudflare**：Cloudflare 在中国大陆无节点，速度与稳定性优于 GitHub Pages 但不等于国内服务器；国内触达主要靠知乎/公众号。
- **英文翻译是硬 gate**：3 个月内未完成，视为「国外优先」失败，需要重新评估资源分配。
- **GitHub Profile 成为主要实体锚点**：旧 fork 与内部文档必须整理，否则 AI 会把你归类为「PLC/PHP 杂项开发者」。
- **合规约束变化**：v1 不需要 ICP，网站名称不受备案命名规则限制；`一人交付笔记` 仍是品牌名。国内平台各自有内容审核规则。
- **隐私**：`kindergarten` 完整仓库私有；案例仓库必须脱敏，不出现客户名称、儿童信息、真实密钥、内部域名。

## 待决问题

- 英文翻译的审校流程与负责人（用户 + AI 初译）。
- 公众号账号注册与首月内容排期。
- 案例仓库的开源许可证（MIT / Apache-2.0 / CC BY-NC 4.0）。
- Cloudflare DNS 迁移与企业邮箱 MX/SPF 的先后顺序。
- 百度统计账号与数据合规说明。
