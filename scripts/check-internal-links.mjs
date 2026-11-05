#!/usr/bin/env node
/**
 * Crawl the generated static site and verify every internal link resolves.
 *
 * The site is served through tests/static-server.mjs, the same Cloudflare
 * Pages emulator the Playwright suite uses, so this checks the deployment
 * artifact rather than the dev server:
 *
 *   - every sitemap URL, discovery artifact, and linked asset returns 200;
 *   - every internal href/src found in server-rendered HTML returns 200;
 *   - an unknown path returns the generated 404 page with status 404;
 *   - draft routes are never reachable;
 *   - a www Host request returns 301 to the apex origin with path and query.
 *
 * Usage: node scripts/check-internal-links.mjs [--root .output/public] [--content content]
 */
import { once } from 'node:events'
import { access, readFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStaticServer } from '../tests/static-server.mjs'
import { collectDraftRoutes } from '../shared/content-files.mjs'
import { SITE_ORIGIN } from '../shared/site-config.mjs'

const failures = []
const checks = []

function parseArgs(argv) {
  const options = {
    rootDir: resolve('.output/public'),
    contentDir: resolve('content'),
  }
  const flags = {
    '--root': 'rootDir',
    '--content': 'contentDir',
  }

  for (let index = 0; index < argv.length; index++) {
    const key = flags[argv[index]]
    if (!key) continue
    const value = argv[++index]
    if (!value) throw new Error(`参数 ${argv[index - 1]} 缺少路径`)
    options[key] = resolve(value)
  }

  return options
}

function fail(message) {
  failures.push(message)
}

function group(label, ok, detail = '') {
  checks.push({ label, ok, detail })
}

function decodeEntities(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function extractLinks(html) {
  const links = []
  for (const match of html.matchAll(
    /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  )) {
    links.push(decodeEntities(match[1] ?? match[2] ?? match[3] ?? ''))
  }
  return links
}

function normalizeLink(raw, currentPath) {
  const value = raw.trim()
  if (!value || value.startsWith('#')) return null
  if (/^(?:mailto|tel|javascript|data|blob):/i.test(value)) return null

  let url
  try {
    url = new URL(value, `${SITE_ORIGIN}${currentPath}`)
  } catch {
    return null
  }

  if (url.origin !== SITE_ORIGIN) return null
  return `${url.pathname}${url.search}`
}

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function readSitemapPaths(rootDir) {
  const path = join(rootDir, 'sitemap.xml')
  if (!(await pathExists(path))) return null

  const xml = await readFile(path, 'utf8')
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) => {
    const loc = decodeEntities(match[1].trim())
    try {
      const url = new URL(loc)
      return `${url.pathname}${url.search}`
    } catch {
      return loc
    }
  })
}

function request(baseUrl) {
  const origin = new URL(baseUrl)

  return (path, headers = {}) =>
    new Promise((resolvePromise, reject) => {
      const req = httpRequest(
        {
          hostname: origin.hostname,
          port: origin.port,
          path,
          headers: { connection: 'close', ...headers },
          timeout: 15_000,
        },
        (response) => {
          const chunks = []
          response.on('data', (chunk) => chunks.push(chunk))
          response.on('end', () =>
            resolvePromise({
              status: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks).toString('utf8'),
            }),
          )
        },
      )
      req.on('timeout', () => req.destroy(new Error('request timed out')))
      req.on('error', reject)
      req.end()
    })
}

export async function checkInternalLinks({
  rootDir = resolve('.output/public'),
  contentDir = resolve('content'),
} = {}) {
  failures.length = 0
  checks.length = 0

  const redirectConfigPath = resolve('cloudflare/www-redirect.json')
  const server = createStaticServer(rootDir, { redirectConfigPath })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  const doRequest = request(`http://127.0.0.1:${port}`)

  try {
    const sitemapPaths = await readSitemapPaths(rootDir)
    const seeds = [
      '/',
      '/search',
      '/feed.xml',
      '/sitemap.xml',
      '/robots.txt',
      '/llms.txt',
      '/avatar.png',
      ...(sitemapPaths ?? []),
    ]
    const uniqueSeeds = [...new Set(seeds)]

    const seedResults = new Map()
    for (const seed of uniqueSeeds) {
      const response = await doRequest(seed)
      seedResults.set(seed, response.status)
      if (response.status !== 200) {
        fail(`公开产物应返回 200，实际 ${response.status}：${seed}`)
      }
    }
    group(
      '公开路由与发现产物返回 200',
      [...seedResults.values()].every((status) => status === 200),
      `${uniqueSeeds.length} 个入口`,
    )

    if (!sitemapPaths) {
      fail('sitemap.xml 缺失或没有 <loc>，无法作为内链抓取种子')
    }

    const visited = new Set()
    const queued = new Set(uniqueSeeds)
    const queue = [...uniqueSeeds]
    const referrers = new Map()
    let htmlPages = 0
    let linkCount = 0
    let brokenCount = 0

    while (queue.length > 0) {
      const path = queue.shift()
      if (visited.has(path)) continue
      visited.add(path)

      const response = await doRequest(path)
      if (response.status !== 200) {
        brokenCount++
        const referrer = referrers.get(path)
        fail(
          `内链返回 ${response.status}: ${path}${referrer ? `（引用页：${referrer}）` : ''}`,
        )
        continue
      }

      const contentType = response.headers['content-type'] ?? ''
      if (!contentType.includes('text/html')) continue
      htmlPages++

      for (const raw of extractLinks(response.body)) {
        const target = normalizeLink(raw, path)
        if (!target) continue
        linkCount++
        if (!referrers.has(target)) referrers.set(target, path)
        if (!visited.has(target) && !queued.has(target)) {
          queued.add(target)
          queue.push(target)
        }
      }
    }

    group(
      '抓取站内链接',
      brokenCount === 0,
      `${htmlPages} 个 HTML 页面，${linkCount} 个站内链接`,
    )

    const unknownPath = `/__link-check-unknown-${Date.now()}`
    const unknown = await doRequest(unknownPath)
    if (unknown.status !== 404) {
      fail(`未知路由应返回 404，实际 ${unknown.status}：${unknownPath}`)
    }
    group(
      '未知路由返回 404',
      unknown.status === 404,
      unknownPath,
    )

    const draftRoutes = await collectDraftRoutes({ contentDir })
    const reachableDrafts = []
    for (const route of draftRoutes) {
      const response = await doRequest(route)
      if (response.status !== 404) {
        reachableDrafts.push(`${route} -> ${response.status}`)
      }
    }
    for (const message of reachableDrafts) {
      fail(`草稿路由不应可访问：${message}`)
    }
    group(
      '草稿路由不可访问',
      reachableDrafts.length === 0,
      `${draftRoutes.length} 条草稿`,
    )

    const wwwPath = '/about?from=www'
    const www = await doRequest(wwwPath, { host: 'www.yuanhaisu.com' })
    const expectedLocation = `${SITE_ORIGIN}/about?from=www`
    const location = www.headers.location ?? ''
    const redirectOk =
      www.status === 301 && location === expectedLocation
    if (!redirectOk) {
      fail(
        `www 请求应 301 到 ${expectedLocation}，实际 ${www.status} ${location || '(无 Location)'}`,
      )
    }
    group(
      'www 301 到 apex 并保留路径与查询',
      redirectOk,
      `${www.status} ${location}`,
    )
  } finally {
    await new Promise((resolvePromise) => server.close(resolvePromise))
  }

  return {
    ok: failures.length === 0,
    checks,
    failures,
  }
}

function formatReport(result, rootDir) {
  const lines = [`Internal link check: ${rootDir}`]
  for (const check of result.checks) {
    lines.push(
      `  ${check.ok ? 'ok  ' : 'FAIL'} ${check.label}${check.detail ? ` (${check.detail})` : ''}`,
    )
  }

  if (result.failures.length > 0) {
    lines.push('')
    for (const failure of result.failures) {
      lines.push(`  FAIL ${failure}`)
    }
    lines.push(`\nFAIL: ${result.failures.length} 项内链检查失败。`)
  } else {
    lines.push(`\nPASS: ${result.checks.length} 组内链检查通过。`)
  }

  return lines.join('\n')
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (isEntrypoint) {
  try {
    const options = parseArgs(process.argv.slice(2))
    const result = await checkInternalLinks(options)
    process.stdout.write(`${formatReport(result, options.rootDir)}\n`)
    if (!result.ok) process.exitCode = 1
  } catch (error) {
    process.stderr.write(`内链检查执行失败：${error?.message ?? '未知错误'}\n`)
    process.exitCode = 1
  }
}
