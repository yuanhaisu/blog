import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { assert } from './context.mjs'
import { assertWellFormedXml, isCalendarDate } from './html.mjs'
import {
  SITE_ORIGIN,
  expectedRoutes,
  expectedSitemapUrls,
  pathExists,
} from './source.mjs'

export async function validateSitemap(rootDir, posts, builtRoutes) {
  const path = join(rootDir, 'sitemap.xml')
  if (!(await pathExists(path))) {
    assert(false, 'sitemap.xml 缺失')
    return
  }

  const xml = await readFile(path, 'utf8')
  assertWellFormedXml(xml, 'sitemap.xml')
  assert(
    /<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(xml),
    'sitemap.xml 根元素或命名空间错误',
  )

  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(
    (match) => ({
      loc: /<loc>([\s\S]*?)<\/loc>/.exec(match[1])?.[1]?.trim() ?? '',
      lastmod:
        /<lastmod>([\s\S]*?)<\/lastmod>/.exec(match[1])?.[1]?.trim() ?? '',
    }),
  )

  assert(entries.length > 0, 'sitemap.xml 没有 <url> 条目')
  const locs = entries.map((entry) => entry.loc)
  assert(new Set(locs).size === locs.length, 'sitemap.xml 存在重复 <loc>')

  for (const entry of entries) {
    assert(
      entry.loc.startsWith(`${SITE_ORIGIN}/`),
      `sitemap.xml 的 loc 不是 ${SITE_ORIGIN} 绝对地址：${entry.loc}`,
    )
    assert(
      isCalendarDate(entry.lastmod),
      `sitemap.xml 的 lastmod 不是日历日期：${entry.loc} -> ${entry.lastmod}`,
    )

    let route = null
    try {
      route = decodeURIComponent(new URL(entry.loc).pathname)
    } catch {
      assert(false, `sitemap.xml 的 loc 无法解析：${entry.loc}`)
    }
    if (route) {
      assert(
        builtRoutes.has(route),
        `sitemap.xml 指向不存在的构建产物：${entry.loc}`,
      )
    }
  }

  const expected = expectedRoutes(posts)
  const expectedUrls = expectedSitemapUrls(posts)
  for (const url of expectedUrls) {
    assert(locs.includes(url), `sitemap.xml 缺少公开路由：${url}`)
  }
  for (const loc of locs) {
    let route = ''
    try {
      route = decodeURIComponent(new URL(loc).pathname)
    } catch {
      continue
    }
    assert(expected.has(route), `sitemap.xml 包含不应收录的路径：${loc}`)
  }

  return `${entries.length} 个 URL`
}
