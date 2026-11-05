# 部署与加固

状态（2026-11-05）：

- **仓库侧已实现**：Cloudflare Pages 响应头（HSTS、CSP、安全头、缓存）、`www` → apex 的账号侧配置声明、部署冒烟脚本、仓库密钥扫描。
- **账号侧待用户执行（当前 blocked）**：创建 Pages 项目、接入自定义域名、开启 Always Use HTTPS、创建 `www` Bulk Redirect、确认预览部署 HTTPS。仓库无法创建这些 Cloudflare 资源，也不保存任何凭据。

## 仓库内产物

| 文件 | 作用 |
| --- | --- |
| `public/_headers` | 构建时复制到 `.output/public/_headers`，由 Cloudflare Pages 解析（不会作为文件对外提供）。配置 HSTS、CSP、安全头与 `_nuxt` 缓存。 |
| `cloudflare/www-redirect.json` | 账号侧 Bulk Redirects 条目的声明式副本，同时记录 DNS 与 Always Use HTTPS 意图。Cloudflare Pages 的 `_redirects` 只匹配路径、不支持域名级跳转，所以仓库内不能直接写 `www` 跳转。 |
| `scripts/deployment-smoke.mjs` | 本地检查构建产物、200、HSTS/CSP、`www` 301；设置 `SMOKE_BASE_URL` 后检查在线预览或生产环境。 |
| `scripts/check-no-secrets.mjs` | 扫描 Git 跟踪的文件，发现 `.env` 或常见凭据模式时失败；只输出路径与模式名，不输出匹配值。 |
| `tests/static-server.mjs` | 本地 Cloudflare Pages 模拟器：应用 `_headers`，并按 `cloudflare/www-redirect.json` 模拟 `www` 301。 |
| `tests/e2e/deployment.spec.ts` | 在构建产物 over HTTP 的 seam 上验证 200、HSTS/CSP、CSP 来源与 `www` 301。 |

## 本地验证

```bash
npm run ci                   # 内容、密钥、构建、产物、内链、Playwright、部署冒烟
npm run build                # 生成 .output/public
npm test                     # Playwright：页面、无 JS、部署头与 www 301
npm run validate:artifacts   # JSON-LD、sitemap、RSS、robots、llms.txt、Pagefind
npm run check:links          # 公开路由 200、未知路由 404、www 301
npm run smoke:deployment     # 部署冒烟（本地构建产物）
npm run check:secrets        # 仓库密钥扫描
```

本地冒烟通过只代表仓库侧配置正确。DNS、证书、Always Use HTTPS 与 `www` 跳转必须由 Cloudflare 账号完成。完整的仓库侧/内容/账号侧状态见[上线验收清单](launch-checklist.md)。

## Cloudflare 账号侧配置（blocked for user）

以下步骤需要登录 Cloudflare 账号，仓库与 CI 都无法代做。

### 1. Pages 项目

- 从 GitHub 仓库 `yuanhaisu/blog` 创建 Cloudflare Pages 项目。
- 构建命令：`npm run generate`
- 构建输出目录：`.output/public`
- 环境变量：`NODE_VERSION=22`（不要添加任何密钥；本项目不需要构建期密钥）
- 框架预设：None（纯静态站点）

### 2. 自定义域名与 HTTPS

- 只把 apex `yuanhaisu.com` 接入 Pages 自定义域名，按提示创建 DNS 记录。
- `www.yuanhaisu.com` **不要**接入 Pages 自定义域名；它由第 3 步的代理 DNS + Bulk Redirect 处理。
- Cloudflare 会自动签发并续期边缘证书；等待证书状态为 Active。
- 进入 **SSL/TLS → Edge Certificates → Always Use HTTPS**，设为 **On**。这是“强制 HTTPS”的账号侧开关；仓库内只能通过 HSTS 告诉浏览器以后只用 HTTPS。
- 不要在 Zone 级再次开启 HSTS，否则会和 `_headers` 的 HSTS 合并成重复头；本项目用 `_headers` 统一管理。
- 可选：开启 Automatic HTTPS Rewrites。

### 3. `www` → apex 301

Cloudflare 官方推荐 Bulk Redirects（或等价的单条 Redirect Rule），因为 Pages 的 `_redirects` 不支持域名级匹配：

1. **Bulk Redirects → Create a bulk redirect list**，条目与 `cloudflare/www-redirect.json` 的 `www_redirect` 保持一致：
   - Source URL: `www.yuanhaisu.com`
   - Target URL: `https://yuanhaisu.com`
   - Status: `301`
   - 勾选：Preserve query string、Subpath matching、Preserve path suffix、Include subdomains
2. 创建并启用使用该列表的 Bulk Redirect rule。
3. **DNS**：为 `www` 添加 **Proxied（橙色云）** 记录。官方示例使用占位 IPv4 `192.0.2.1`，也可以使用指向 apex 的 CNAME；必须是 Proxied，否则请求不经过 Cloudflare 边缘，跳转不会执行。
4. 验证：

```bash
curl -sI https://www.yuanhaisu.com/ | head -n 5
# 期望 HTTP/2 301，location: https://yuanhaisu.com/
```

单条 Redirect Rule 的等价写法：匹配表达式 `http.host eq "www.yuanhaisu.com"`，动态目标 `concat("https://yuanhaisu.com", http.request.uri.path)`，状态 301，保留查询串。

修改账号侧跳转设置时，同步更新 `cloudflare/www-redirect.json`，本地冒烟会按该文件模拟并校验路径与查询串保留。

### 4. 预览部署 HTTPS

- Cloudflare Pages 会为每次非生产分支构建生成 `https://<hash>.yuanhaisu-blog.pages.dev` 预览地址，HTTPS 自动生效，无需额外证书。
- 在 Pages 项目的 Settings → Builds & deployments 中确认生产分支与预览分支策略。预览地址默认公开；如需私密预览，可加 Cloudflare Access，但此时冒烟脚本需要人工登录，不应把 Access 凭据写入仓库。
- 预览地址冒烟：

```bash
SMOKE_BASE_URL=https://<preview>.yuanhaisu-blog.pages.dev npm run smoke:deployment
```

预览地址不是 `yuanhaisu.com`，因此默认只检查 HTTPS、200、HSTS/CSP；`www` 与强制 HTTPS 的检查只在生产域名执行。

### 5. 生产冒烟

账号侧配置完成后执行：

```bash
SMOKE_BASE_URL=https://yuanhaisu.com npm run smoke:deployment
```

它检查：

- `https://yuanhaisu.com/` 返回 200，且带 HSTS 与 CSP；
- `http://yuanhaisu.com/` 跳转到 `https://yuanhaisu.com/`（Always Use HTTPS）；
- `https://www.yuanhaisu.com/` 返回 301 且 `location` 指向 `https://yuanhaisu.com/`。

## 验收项与责任边界

| 验收项 | 仓库侧 | 账号侧（用户） |
| --- | --- | --- |
| `www.yuanhaisu.com` 301 到 `https://yuanhaisu.com` | 配置声明、本地模拟与测试 | Proxied DNS + Bulk Redirect 实际生效 |
| 强制 HTTPS、响应含 HSTS | `_headers` 中的 HSTS | Always Use HTTPS、证书签发 |
| CSP 不阻断 Giscus、统计、字体、搜索 | `_headers` 中的 CSP 与来源白名单 | 无（部署后自动生效） |
| Cloudflare Pages 预览可 HTTPS 访问 | 无（平台行为） | 创建 Pages 项目并触发预览构建 |
| 部署冒烟检查 200、301、HSTS/CSP | 本地冒烟脚本与 Playwright 测试 | 提供预览/生产 URL 后运行在线冒烟 |
| 仓库与构建日志不含密钥 | 密钥扫描脚本、`.gitignore` | 只在 Dashboard 配置环境变量，不粘贴密钥到日志 |

## CSP 维护

- Nuxt 静态产物包含内联 import map 与 `window.__NUXT__` 引导脚本，因此 `script-src` 需要 `'unsafe-inline'`；如果未来 Nuxt 提供 nonce/hash 方案，可再收紧。
- Pagefind 需要 `script-src 'wasm-unsafe-eval'` 与 `worker-src 'self' blob:`。
- Giscus 允许 `https://giscus.app`（脚本与 iframe）；统计允许 Cloudflare Web Analytics 与百度统计域名；字体允许自托管与 Google Fonts 来源。
- 新增第三方服务时，同时更新 `public/_headers`、`tests/e2e/deployment.spec.ts` 与 `scripts/deployment-smoke.mjs` 的允许来源断言，避免“配置存在但实际被 CSP 拦截”。

## 密钥与日志

- 仓库不保存 Cloudflare、GitHub、百度统计等凭据；`.env` 与 `.env.*` 已被 `.gitignore` 忽略（`.env.example` 除外）。
- Pages 构建只需 `NODE_VERSION`，不需要密钥；如未来需要构建期变量，在 Cloudflare Dashboard 配置，不写入仓库。
- 冒烟脚本只请求公开 URL，不读取、不打印任何凭据。
- 提交前运行 `npm run check:secrets`；CI 也应执行同一脚本。
