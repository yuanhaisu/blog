# 05: About 与 Person 实体

**What to build:** 一个可被 AI 与读者引用的 About 页，以及全站一致的 Person 实体信号：姓名、头像、简介、职位、专长、sameAs 链接。About 页提供可验证事实与公开联系方式。

**Blocked by:** 01, 02

**Status:** resolved

- [ ] About 页包含 `袁海粟（Yuan Haisu）`、身份主张、经历摘要、代表项目、技能、公开邮箱、GitHub/知乎/公众号链接。
- [ ] Person JSON-LD 包含 name、alternateName、url、image、jobTitle、description、knowsAbout、sameAs。
- [ ] `sameAs` 指向真实的 GitHub、知乎、公众号与 RSS 地址。
- [ ] 全站输出中不出现「袁海苏」等错误变体。
- [ ] 不出现手机号、客户名称、儿童信息。
- [ ] Playwright 与 JSON-LD 校验通过。

## Resolution

Implemented and merged into `feat/blog-v1` (final integration commit `f16132c`). Gate suite passes: content validation, secret scan, static build, artifact validation, internal link check, 115 Playwright tests, deployment smoke.
