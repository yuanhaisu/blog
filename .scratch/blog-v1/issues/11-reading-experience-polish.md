# 11: 阅读体验与视觉打磨

**What to build:** 让站点在手机、桌面、明暗模式下都好读：深色模式、响应式布局、中文字体子集化、导航与跳过链接、404 页、键盘/对比度/alt、LCP/CLS 预算。

**Blocked by:** 03, 04

**Status:** resolved

- [ ] 明暗模式切换可持久化，并尊重 `prefers-color-scheme`。
- [ ] 360px、768px、1440px 下无横向滚动，布局可用。
- [ ] 中文字体已子集化，首屏不被完整 CJK 字体阻塞。
- [ ] 导航可键盘使用，有跳过链接。
- [ ] 404 页提供首页与文章列表入口。
- [ ] 文字对比度达到 WCAG AA；图片有 alt。
- [ ] 代表性文章 LCP < 2.5s、CLS < 0.1（本地或预览测量）。
- [ ] Playwright 覆盖响应式、明暗模式、404；Lighthouse 或等价工具覆盖性能与无障碍。

## Resolution

Implemented and merged into `feat/blog-v1` (final integration commit `f16132c`). Gate suite passes: content validation, secret scan, static build, artifact validation, internal link check, 115 Playwright tests, deployment smoke.
