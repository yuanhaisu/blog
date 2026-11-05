# 06: 页面级 SEO/GEO 元数据

**What to build:** 每个公开页面的搜索与 AI 元数据：文章页的 BlogPosting 与 BreadcrumbList JSON-LD、canonical、OpenGraph/Twitter Card、日期、语言、授权。禁用 JavaScript 后正文仍可读。

**Blocked by:** 03, 05

**Status:** resolved

- [ ] 文章页输出 BlogPosting：headline、description、datePublished、dateModified、author/publisher 指向 Person `@id`、mainEntityOfPage、image、inLanguage、license。
- [ ] 文章页输出合法的 BreadcrumbList。
- [ ] 每个公开页面的 canonical 指向 `https://yuanhaisu.com` 下的正式地址。
- [ ] 每个公开页面有 OG/Twitter 的 title、description、image、type、URL。
- [ ] 日期为 ISO 8601；中文页面 `inLanguage` 为 `zh-CN`。
- [ ] JSON-LD 可解析并通过 schema 校验；无 JS 正文测试通过。
- [ ] 同一页面没有冲突的 canonical 或重复 JSON-LD。

## Resolution

Implemented and merged into `feat/blog-v1` (final integration commit `f16132c`). Gate suite passes: content validation, secret scan, static build, artifact validation, internal link check, 115 Playwright tests, deployment smoke.
