# 12: 部署加固

**What to build:** 生产级部署行为：`www` 301 到 apex、HTTPS 与 HSTS、CSP、Cloudflare Pages 预览冒烟。部署检查在 CI 或上线脚本中执行。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `www.yuanhaisu.com` 301 到 `https://yuanhaisu.com`。
- [ ] 强制 HTTPS，响应包含 HSTS。
- [ ] 响应包含 CSP，且不阻断 Giscus、统计、字体与搜索。
- [ ] Cloudflare Pages 预览通过 HTTPS 访问。
- [ ] 部署冒烟检查 200、301、HSTS/CSP 响应头。
- [ ] 构建日志与仓库不含密钥。
