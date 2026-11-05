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

## 当前状态

方案已冻结，尚未开始编码。下一步：GitHub Profile 整理、`kindergarten` 私有化 + 案例仓库、Cloudflare Pages、阿里云企业邮箱、Nuxt 4 初始化、知乎/公众号、第 1 篇提纲。

## 关键约束

- 每周 5–10 小时；v1 约 85–105 小时，2.5–3.5 个月
- 域名 `yuanhaisu.com`；站名「一人交付笔记」；GitHub `github.com/yuanhaisu`
- Nuxt 4.6 + Nuxt Content 3.16，Markdown + Git，Cloudflare Pages
- v1 中文 canonical；英文 v1.1 在上线后 3 个月内完成
- 首发 3 篇中文博客 + 2 篇中文平台文章
- 评论 Giscus；统计 Cloudflare Web Analytics + 百度统计；搜索 Pagefind；Newsletter 公众号
- `kindergarten` 保持私有；公开案例仓库 `nurture-planet-case-study`
