# 07: 发现类产物

**What to build:** 让搜索引擎与 AI agent 高效发现站点的构建产物：sitemap、RSS/Atom、robots.txt、llms.txt。产物随每次构建更新，排除草稿与 404。

**Blocked by:** 03, 04, 05

**Status:** resolved

- [ ] sitemap 包含全部公开路由（首页、文章、标签、专题、About、归档），排除草稿与 404。
- [ ] sitemap XML 合法，包含 `lastmod`。
- [ ] RSS/Atom 合法，包含标题、链接、日期、作者、摘要或全文。
- [ ] robots.txt 允许 GPTBot、OAI-SearchBot、ChatGPT-User、ClaudeBot、Claude-SearchBot、PerplexityBot、Googlebot、Google-Extended、Bytespider、Baiduspider、bingbot，并声明 sitemap 地址。
- [ ] llms.txt 包含站点简介、作者身份、核心页面、文章索引、授权与联系方式。
- [ ] 新增文章后，产物在下次构建中自动更新。

## Resolution

Implemented and merged into `feat/blog-v1` (final integration commit `f16132c`). Gate suite passes: content validation, secret scan, static build, artifact validation, internal link check, 115 Playwright tests, deployment smoke.
