# 01: 走通骨架：可构建、可预览的首页 + 一篇文章

**What to build:** 一个能从 Markdown 内容源构建、部署到 Cloudflare Pages 预览的静态站点骨架。首页展示站名「一人交付笔记」、身份主张与一篇文章入口；文章页渲染中文正文、标题、日期、作者与 canonical。禁用 JavaScript 后正文仍可读。Playwright 冒烟测试在构建产物上运行。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [ ] 干净检出后可按文档命令完成安装与构建，产出静态站点。
- [ ] 首页展示站名、身份主张与文章入口。
- [ ] 文章页渲染中文正文、标题、日期、作者与 canonical。
- [ ] 禁用 JavaScript 后文章正文、标题、日期、作者仍可读。
- [ ] Playwright 冒烟测试针对构建产物运行并通过。
- [ ] Cloudflare Pages 预览部署可通过 HTTPS 访问。
- [ ] 仓库不含密钥；构建可重复。

## Resolution

Implemented and merged into `feat/blog-v1` (final integration commit `f16132c`). Gate suite passes: content validation, secret scan, static build, artifact validation, internal link check, 115 Playwright tests, deployment smoke.
