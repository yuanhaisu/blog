# 08: 站内搜索

**What to build:** 无需服务器的站内搜索：构建期索引 + 搜索界面。中文查询能命中文章并显示上下文摘要；草稿与 404 不被索引。若 Pagefind 中文分词不合格，切换到 FlexSearch（CJK 分词）。

**Blocked by:** 03

**Status:** resolved

- [ ] 构建时生成搜索索引。
- [ ] 站点头部有搜索入口，搜索无需服务器。
- [ ] 中文查询命中预期 fixture 文章，摘要包含查询上下文。
- [ ] 空查询/未知查询有可用的空状态。
- [ ] 草稿、404、隐私页不被索引。
- [ ] Playwright 覆盖中文查询；若 Pagefind 不通过，FlexSearch 方案通过同一测试。

## Resolution

Implemented and merged into `feat/blog-v1` (final integration commit `f16132c`). Gate suite passes: content validation, secret scan, static build, artifact validation, internal link check, 115 Playwright tests, deployment smoke.
