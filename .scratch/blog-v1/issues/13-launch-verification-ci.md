# 13: 上线验收与 CI gate

**What to build:** 单一 seam 上的完整上线验收：CI 在 PR 上执行构建、E2E、内链检查、产物校验与部署冒烟；生产部署到 `https://yuanhaisu.com`；确认 3 篇中文博客与 2 篇平台文章已就绪（内容写作另行跟踪）。

**Blocked by:** 06, 07, 08, 09, 10, 11, 12

**Status:** ready-for-agent

- [ ] CI 在 PR 上运行构建、Playwright E2E、内链检查、产物校验与部署冒烟。
- [ ] 全部公开路由 200；未知路由 404；`www` 301。
- [ ] 每篇文章的无 JS 内容测试通过。
- [ ] JSON-LD、sitemap、RSS、robots、llms.txt 校验通过。
- [ ] Pagefind 中文搜索测试通过。
- [ ] Giscus 与统计配置存在。
- [ ] 生产部署到 `https://yuanhaisu.com` 成功。
- [ ] 上线清单确认 3 篇中文博客与 2 篇平台文章就绪/已发布（内容写作不在本 ticket）。
- [ ] 输出中无敏感字符串。
