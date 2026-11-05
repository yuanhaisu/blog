# 09: 评论

**What to build:** 文章页的 Giscus 评论：基于 GitHub Discussions，懒加载，跟随明暗主题；作为次要入口，国内读者被引导到知乎/公众号讨论。不引入评论后端或数据库。

**Blocked by:** 03

**Status:** resolved

- [ ] 文章页包含配置好的 Giscus 容器。
- [ ] 评论在进入视口或交互后才加载。
- [ ] 评论主题跟随明暗模式。
- [ ] 页面有明显入口/说明，引导国内读者到知乎/公众号讨论。
- [ ] 不引入评论后端、数据库或用户系统。
- [ ] 测试只断言配置存在，不依赖外部服务真实行为。
- [ ] 禁用 JavaScript 时有评论不可用的说明或 GitHub Discussions 链接。

## Resolution

Implemented and merged into `feat/blog-v1` (final integration commit `f16132c`). Gate suite passes: content validation, secret scan, static build, artifact validation, internal link check, 115 Playwright tests, deployment smoke.
