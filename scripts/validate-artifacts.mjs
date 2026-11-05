#!/usr/bin/env node
/**
 * Validate the generated static deployment artifacts in .output/public.
 *
 * This is the CI-side counterpart to the Playwright suite: it reads the
 * build output directly (no browser) and checks the invariants that search
 * engines, AI agents, and Cloudflare Pages depend on:
 *
 *   - every public route exists with canonical, OG/Twitter, Person and
 *     WebSite JSON-LD, analytics config, and no-JS article markup;
 *   - JSON-LD is parseable and articles carry BlogPosting + BreadcrumbList;
 *   - sitemap.xml, feed.xml, robots.txt and llms.txt are well-formed, list
 *     exactly the published content, and never leak drafts;
 *   - _headers still carries HSTS + the CSP allow-list;
 *   - Pagefind built a Chinese index for every published post;
 *   - the client content database dump excludes drafts.
 *
 * Reports checks and failing routes only. It never reads credentials.
 *
 * Usage: node scripts/validate-artifacts.mjs [--root .output/public] [--content content]
 */
import { access, readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { parseFrontmatter } from '../shared/frontmatter.mjs'

const SITE_ORIGIN = 'https://yuanhaisu.com'
const PERSON_ID = `${SITE_ORIGIN}/#person`
const WEBSITE_ID = `${SITE_ORIGIN}/#website`
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
const STATIC_ROUTES = ['/', '/about', '/archive', '/privacy', '/search']
const SITEMAP_STATIC_ROUTES = ['/', '/about', '/archive', '/privacy']

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Googlebot',
  'Google-Extended',
  'Bytespider',
  'Baiduspider',
  'bingbot',
]

const REQUIRED_FILES = [
  'index.html',
  '404.html',
  '_headers',
  'sitemap.xml',
  'feed.xml',
  'robots.txt',
  'llms.txt',
  'avatar.png',
  'pagefind/pagefind.js',
  'pagefind/pagefind-entry.json',
]

const failures = []
const checks = []
let activeGroup = null
let groupFailuresAtStart = 0

function assert(condition, message) {
  if (condition) return true
  failures.push({ group: activeGroup, message })
  return false
}

async function group(label, run) {
  activeGroup = label
  groupFailuresAtStart = failures.length
  try {
    const detail = await run()
    checks.push({
      label,
      ok: failures.length === groupFailuresAtStart,
      detail: typeof detail === 'string' ? detail : '',
    })
  } catch (error) {
    failures.push({
      group: label,
      message: `执行失败：${error?.message ?? String(error)}`,
    })
    checks.push({ label, ok: false, detail: '' })
  }
}

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

function decodeEntities(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function getAttribute(tag, name) {
  const match = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  ).exec(tag)
  if (!match) return null
  return decodeEntities(match[1] ?? match[2] ?? match[3] ?? '')
}

function findTags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? []
}

function findMeta(html, attribute, value) {
  return findTags(html, 'meta').filter(
    (tag) => getAttribute(tag, attribute) === value,
  )
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function stripTags(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Minimal XML well-formedness check for the generated sitemap and RSS.
 *
 * The build emits simple XML with no CDATA and no processing instructions
 * inside elements, so a tag-stack plus entity check is sufficient to catch
 * truncation, unescaped ampersands, and mismatched closing tags without
 * pulling an XML parser into the toolchain.
 */
function assertWellFormedXml(xml, label) {
  const withoutCdata = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
  const body = withoutCdata.replace(/<\?[\s\S]*?\?>/g, '')
  const textOnly = body.replace(/<[^>]*>/g, ' ')
  const rawAmpersand = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/
  assert(
    !rawAmpersand.test(textOnly),
    `${label} 含有未转义的 & 字符`,
  )

  const stack = []
  for (const match of body.matchAll(/<([^>]+)>/g)) {
    const token = match[1].trim()
    if (!token || token.startsWith('!')) continue

    if (token.startsWith('/')) {
      const name = token.slice(1).trim()
      const open = stack.pop()
      assert(
        open === name,
        `${label} XML 标签未正确闭合：期望 </${open ?? '?'}>，实际 </${name}>`,
      )
      continue
    }

    const name = token.split(/\s+/)[0]
    if (token.endsWith('/')) continue
    stack.push(name)
  }

  assert(
    stack.length === 0,
    `${label} XML 未闭合标签：${stack.join(', ') || '未知'}`,
  )
}

function parseRobots(text) {
  const groups = []
  let current

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator === -1) continue

    const directive = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (directive === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
    } else if (current) {
      current.rules.push({ directive, value })
    }
  }

  return groups
}

function parseCsp(header) {
  const directives = new Map()
  for (const part of header.split(';')) {
    const [name, ...values] = part.trim().split(/\s+/)
    if (name) directives.set(name, values)
  }
  return directives
}

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function walk(directory, options = {}) {
  const files = []
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    if (options.skip?.includes(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(path, options)))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

async function collectPublishedPosts(contentDir) {
  const postsDir = join(contentDir, 'posts')
  if (!(await pathExists(postsDir))) return []

  const posts = []
  for (const file of await walk(postsDir)) {
    if (!file.toLowerCase().endsWith('.md')) continue
    const parsed = parseFrontmatter(await readFile(file, 'utf8'))
    if (parsed.error) {
      failures.push({
        group: '内容源',
        message: `${relative(contentDir, file)} frontmatter 解析失败：${parsed.error}`,
      })
      continue
    }
    if (parsed.data?.draft === true) continue

    posts.push({
      slug: relative(postsDir, file)
        .replace(/\.md$/i, '')
        .split(sep)
        .join('/'),
      title: String(parsed.data?.title ?? ''),
      description: String(parsed.data?.description ?? ''),
      date: String(parsed.data?.date ?? ''),
      tags: Array.isArray(parsed.data?.tags)
        ? parsed.data.tags.map(String)
        : [],
      series: parsed.data?.series ? String(parsed.data.series) : undefined,
    })
  }

  return posts.sort((left, right) => left.slug.localeCompare(right.slug))
}

async function collectDraftRoutes(contentDir) {
  const postsDir = join(contentDir, 'posts')
  if (!(await pathExists(postsDir))) return []

  const routes = []
  for (const file of await walk(postsDir)) {
    if (!file.toLowerCase().endsWith('.md')) continue
    const parsed = parseFrontmatter(await readFile(file, 'utf8'))
    if (parsed.error || parsed.data?.draft !== true) continue
    routes.push(
      `/posts/${relative(postsDir, file)
        .replace(/\.md$/i, '')
        .split(sep)
        .join('/')}`,
    )
  }
  return routes
}

function expectedRoutes(posts) {
  const tags = [...new Set(posts.flatMap((post) => post.tags))]
  const series = [...new Set(posts.flatMap((post) => post.series ?? []))]

  return new Set([
    ...STATIC_ROUTES,
    ...posts.map((post) => `/posts/${post.slug}`),
    ...tags.map((tag) => `/tags/${tag}`),
    ...series.map((item) => `/series/${item}`),
  ])
}

/**
 * Encode each path segment for sitemap URLs. Filesystem routes keep raw
 * Unicode (tags/一人交付/index.html); only URLs percent-encode.
 */
function encodeRoute(route) {
  return route
    .split('/')
    .map((segment) => (segment ? encodeURIComponent(segment) : ''))
    .join('/')
}

function expectedSitemapUrls(posts) {
  const tags = [...new Set(posts.flatMap((post) => post.tags))]
  const series = [...new Set(posts.flatMap((post) => post.series ?? []))]

  return new Set([
    ...SITEMAP_STATIC_ROUTES,
    ...posts.map((post) => `/posts/${post.slug}`),
    ...tags.map((tag) => `/tags/${tag}`),
    ...series.map((item) => `/series/${item}`),
  ].map((route) => `${SITE_ORIGIN}${encodeRoute(route)}`))
}

function routeFromHtmlPath(rootDir, file) {
  const relativeDir = relative(rootDir, join(file, '..'))
    .split(sep)
    .join('/')
  return relativeDir ? `/${relativeDir}` : '/'
}

async function collectHtmlRoutes(rootDir) {
  const files = await walk(rootDir, {
    skip: ['_nuxt', 'pagefind', '__nuxt_content'],
  })
  const routes = new Map()

  for (const file of files) {
    if (!file.toLowerCase().endsWith('.html')) continue
    const relativePath = relative(rootDir, file).split(sep).join('/')
    if (relativePath === '404.html' || relativePath === '200.html') continue
    if (!relativePath.endsWith('index.html')) {
      failures.push({
        group: '路由',
        message: `未知 HTML 产物：${relativePath}`,
      })
      continue
    }
    routes.set(routeFromHtmlPath(rootDir, file), file)
  }

  return routes
}

function readJsonLd(html, route) {
  const nodes = []
  const blocks = [
    ...html.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1])
      if (Array.isArray(parsed)) nodes.push(...parsed)
      else nodes.push(parsed)
    } catch (error) {
      failures.push({
        group: 'JSON-LD',
        message: `${route} 的 JSON-LD 无法解析：${error.message}`,
      })
    }
  }

  return nodes
}

function nodesOfType(nodes, type) {
  return nodes.filter((node) => node?.['@type'] === type)
}

function isAbsoluteUrl(value) {
  if (typeof value !== 'string') return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function validatePage(route, html) {
  const label = route || '/'

  assert(
    !html.includes('袁海苏'),
    `${label} 出现错误姓名变体「袁海苏」`,
  )

  const titles = html.match(/<title>([\s\S]*?)<\/title>/i)
  assert(Boolean(titles?.[1]?.trim()), `${label} 缺少非空 <title>`)

  const canonicalTags = findTags(html, 'link').filter(
    (tag) => getAttribute(tag, 'rel') === 'canonical',
  )
  assert(
    canonicalTags.length === 1,
    `${label} 应只有一个 canonical，实际 ${canonicalTags.length}`,
  )

  const canonical = canonicalTags[0]
    ? getAttribute(canonicalTags[0], 'href')
    : null
  if (canonical) {
    let canonicalPath = null
    try {
      const url = new URL(canonical)
      canonicalPath = decodeURIComponent(url.pathname)
      assert(
        url.origin === SITE_ORIGIN,
        `${label} canonical 主机应为 ${SITE_ORIGIN}，实际 ${url.origin}`,
      )
    } catch {
      assert(false, `${label} 的 canonical 不是绝对 URL：${canonical}`)
    }
    assert(
      canonicalPath === (route === '/' ? '/' : route),
      `${label} 的 canonical 路径应指向自身，实际 ${canonicalPath}`,
    )
  }

  const descriptions = findMeta(html, 'name', 'description')
  assert(
    descriptions.length === 1,
    `${label} 应只有一个 meta description，实际 ${descriptions.length}`,
  )
  assert(
    Boolean(getAttribute(descriptions[0] ?? '', 'content')?.trim()),
    `${label} 的 meta description 为空`,
  )

  for (const property of [
    'og:title',
    'og:description',
    'og:image',
    'og:type',
    'og:url',
  ]) {
    const matches = findMeta(html, 'property', property)
    assert(
      matches.length === 1,
      `${label} 应只有一个 ${property}，实际 ${matches.length}`,
    )
    assert(
      Boolean(getAttribute(matches[0] ?? '', 'content')?.trim()),
      `${label} 的 ${property} 为空`,
    )
  }

  const ogUrl = getAttribute(
    findMeta(html, 'property', 'og:url')[0] ?? '',
    'content',
  )
  assert(
    ogUrl === canonical,
    `${label} 的 og:url 应与 canonical 一致`,
  )

  for (const name of [
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
  ]) {
    const matches = findMeta(html, 'name', name)
    assert(
      matches.length === 1,
      `${label} 应只有一个 ${name}，实际 ${matches.length}`,
    )
    assert(
      Boolean(getAttribute(matches[0] ?? '', 'content')?.trim()),
      `${label} 的 ${name} 为空`,
    )
  }

  const nodes = readJsonLd(html, label)
  const types = nodes.map((node) => node?.['@type'])
  const duplicateType = types.find(
    (type, index) => type !== undefined && types.indexOf(type) !== index,
  )
  assert(!duplicateType, `${label} 存在重复 JSON-LD 类型：${duplicateType}`)

  const people = nodesOfType(nodes, 'Person')
  assert(people.length === 1, `${label} 应只有一个 Person，实际 ${people.length}`)
  const person = people[0]
  if (person) {
    assert(person['@context'] === 'https://schema.org', `${label} Person @context 错误`)
    assert(person['@id'] === PERSON_ID, `${label} Person @id 错误`)
    for (const field of ['name', 'url', 'image', 'jobTitle', 'description']) {
      assert(
        typeof person[field] === 'string' && person[field].length > 0,
        `${label} Person.${field} 为空`,
      )
    }
    assert(
      Array.isArray(person.knowsAbout) && person.knowsAbout.length > 0,
      `${label} Person.knowsAbout 为空`,
    )
    assert(
      Array.isArray(person.sameAs) &&
        person.sameAs.includes('https://github.com/yuanhaisu'),
      `${label} Person.sameAs 缺少 GitHub`,
    )
    assert(
      Array.isArray(person.sameAs) &&
        person.sameAs.includes(`${SITE_ORIGIN}/feed.xml`),
      `${label} Person.sameAs 缺少 RSS`,
    )
    assert(
      !person.sameAs?.some((url) => /zhihu\.com|weixin|wechat/i.test(String(url))),
      `${label} Person.sameAs 含未确认的知乎/微信链接`,
    )
  }

  const websites = nodesOfType(nodes, 'WebSite')
  assert(
    websites.length === 1,
    `${label} 应只有一个 WebSite，实际 ${websites.length}`,
  )
  const website = websites[0]
  if (website) {
    assert(website['@context'] === 'https://schema.org', `${label} WebSite @context 错误`)
    assert(website['@id'] === WEBSITE_ID, `${label} WebSite @id 错误`)
    assert(website.url === `${SITE_ORIGIN}/`, `${label} WebSite.url 错误`)
    assert(website.inLanguage === 'zh-CN', `${label} WebSite.inLanguage 错误`)
    assert(
      website.publisher?.['@id'] === PERSON_ID,
      `${label} WebSite.publisher 应指向 Person`,
    )
  }

  const uniqueIds = nodes
    .map((node) => node?.['@id'])
    .filter((id) => typeof id === 'string')
  assert(
    new Set(uniqueIds).size === uniqueIds.length,
    `${label} 的 JSON-LD @id 不唯一`,
  )

  const cloudflareTags = findTags(html, 'script').filter(
    (tag) => getAttribute(tag, 'id') === 'cloudflare-web-analytics',
  )
  assert(
    cloudflareTags.length === 1 &&
      getAttribute(cloudflareTags[0], 'src') ===
        'https://static.cloudflareinsights.com/beacon.min.js',
    `${label} 缺少 Cloudflare Web Analytics 配置`,
  )

  const baiduScript = /<script\b[^>]*id="baidu-tongji"[^>]*>([\s\S]*?)<\/script>/i.exec(
    html,
  )
  assert(
    Boolean(baiduScript?.[1]?.includes('https://hm.baidu.com/hm.js?')),
    `${label} 缺少百度统计配置`,
  )

  assert(
    /<h1\b/i.test(html),
    `${label} 缺少 <h1>`,
  )

  if (!route.startsWith('/posts/')) {
    assert(
      nodesOfType(nodes, 'BlogPosting').length === 0,
      `${label} 非文章页不应输出 BlogPosting`,
    )
    assert(
      nodesOfType(nodes, 'BreadcrumbList').length === 0,
      `${label} 非文章页不应输出 BreadcrumbList`,
    )
    return
  }

  const postings = nodesOfType(nodes, 'BlogPosting')
  assert(
    postings.length === 1,
    `${label} 应只有一个 BlogPosting，实际 ${postings.length}`,
  )
  const posting = postings[0]
  if (posting) {
    assert(posting['@context'] === 'https://schema.org', `${label} BlogPosting @context 错误`)
    assert(
      typeof posting.headline === 'string' && posting.headline.length > 0,
      `${label} BlogPosting.headline 为空`,
    )
    assert(
      typeof posting.description === 'string' && posting.description.length > 0,
      `${label} BlogPosting.description 为空`,
    )
    assert(
      isCalendarDate(posting.datePublished),
      `${label} BlogPosting.datePublished 不是 ISO 日期`,
    )
    assert(
      isCalendarDate(posting.dateModified),
      `${label} BlogPosting.dateModified 不是 ISO 日期`,
    )
    assert(
      posting.author?.['@id'] === PERSON_ID,
      `${label} BlogPosting.author 应指向 Person`,
    )
    assert(
      posting.publisher?.['@id'] === PERSON_ID,
      `${label} BlogPosting.publisher 应指向 Person`,
    )
    assert(
      isAbsoluteUrl(posting.mainEntityOfPage?.['@id']),
      `${label} BlogPosting.mainEntityOfPage 不是绝对 URL`,
    )
    assert(
      isAbsoluteUrl(posting.image),
      `${label} BlogPosting.image 不是绝对 URL`,
    )
    assert(posting.inLanguage === 'zh-CN', `${label} BlogPosting.inLanguage 错误`)
    assert(posting.license === LICENSE_URL, `${label} BlogPosting.license 错误`)
  }

  const breadcrumbs = nodesOfType(nodes, 'BreadcrumbList')
  assert(
    breadcrumbs.length === 1,
    `${label} 应只有一个 BreadcrumbList，实际 ${breadcrumbs.length}`,
  )
  const items = breadcrumbs[0]?.itemListElement
  assert(Array.isArray(items) && items.length >= 2, `${label} BreadcrumbList 条目不足`)
  if (Array.isArray(items)) {
    for (const [index, item] of items.entries()) {
      assert(
        item?.position === index + 1,
        `${label} BreadcrumbList 第 ${index + 1} 项 position 错误`,
      )
      assert(
        typeof item?.name === 'string' && item.name.length > 0,
        `${label} BreadcrumbList 第 ${index + 1} 项缺少 name`,
      )
      assert(
        isAbsoluteUrl(item?.item),
        `${label} BreadcrumbList 第 ${index + 1} 项 item 不是绝对 URL`,
      )
    }
  }

  const articleTag = html.match(/<article\b[^>]*>/i)?.[0] ?? ''
  assert(Boolean(articleTag), `${label} 缺少 <article>`)
  assert(
    articleTag.includes('data-pagefind-body'),
    `${label} 的 <article> 缺少 data-pagefind-body（Pagefind 不会索引）`,
  )
  assert(
    /<time\b[^>]*datetime="\d{4}-\d{2}-\d{2}"/i.test(html),
    `${label} 缺少机器可读的 <time datetime>`,
  )
  assert(html.includes('作者：袁海粟'), `${label} 缺少服务端渲染的作者信息`)

  const bodyMatch = /<div class="post-body"[^>]*>([\s\S]*)/i.exec(html)
  const bodyText = stripTags(bodyMatch?.[1] ?? '')
  assert(
    bodyText.length >= 10,
    `${label} 的正文未在服务端输出（无 JS 时不可读）`,
  )

  const commentsTag = /<section\b[^>]*id="comments"[^>]*>/i.exec(html)?.[0] ?? ''
  assert(Boolean(commentsTag), `${label} 缺少评论容器`)
  assert(
    getAttribute(commentsTag, 'data-giscus-repo') === 'yuanhaisu/blog',
    `${label} 的 Giscus repo 配置缺失`,
  )
  assert(
    Boolean(getAttribute(commentsTag, 'data-giscus-repo-id')),
    `${label} 的 Giscus repoId 配置缺失`,
  )
  assert(
    getAttribute(commentsTag, 'data-giscus-category') === 'Announcements',
    `${label} 的 Giscus category 配置缺失`,
  )
  assert(
    Boolean(getAttribute(commentsTag, 'data-giscus-category-id')),
    `${label} 的 Giscus categoryId 配置缺失`,
  )
}

async function validateSitemap(rootDir, posts, builtRoutes) {
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
  assert(
    new Set(locs).size === locs.length,
    'sitemap.xml 存在重复 <loc>',
  )

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
    assert(
      expected.has(route),
      `sitemap.xml 包含不应收录的路径：${loc}`,
    )
  }

  return `${entries.length} 个 URL`
}

async function validateFeed(rootDir, posts) {
  const path = join(rootDir, 'feed.xml')
  if (!(await pathExists(path))) {
    assert(false, 'feed.xml 缺失')
    return
  }

  const xml = await readFile(path, 'utf8')
  assertWellFormedXml(xml, 'feed.xml')
  assert(/<rss\b[^>]*version="2\.0"/.test(xml), 'feed.xml 不是 RSS 2.0')

  const channel = /<channel>([\s\S]*?)<\/channel>/.exec(xml)?.[1] ?? ''
  const channelValue = (tag) =>
    new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(channel)?.[1]?.trim() ?? ''

  assert(channelValue('title') === '一人交付笔记', 'feed.xml 频道标题错误')
  assert(channelValue('link') === `${SITE_ORIGIN}/`, 'feed.xml 频道链接错误')
  assert(channelValue('description').length > 0, 'feed.xml 频道描述为空')
  assert(channelValue('language') === 'zh-CN', 'feed.xml 语言错误')
  assert(channelValue('copyright').includes('CC BY 4.0'), 'feed.xml 缺少 CC BY 4.0 授权')
  assert(
    !Number.isNaN(Date.parse(channelValue('lastBuildDate'))),
    'feed.xml lastBuildDate 无法解析',
  )

  const items = [...channel.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(
    (match) => match[1],
  )
  assert(
    items.length === posts.length,
    `feed.xml 条目数应为 ${posts.length}，实际 ${items.length}`,
  )

  const itemLinks = []
  for (const item of items) {
    const value = (tag) =>
      new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(item)?.[1]?.trim() ?? ''

    const title = value('title')
    const link = value('link')
    const pubDate = value('pubDate')
    const author = value('author')
    const description = value('description')

    assert(title.length > 0, 'feed.xml 条目缺少标题')
    assert(
      link.startsWith(`${SITE_ORIGIN}/posts/`),
      `feed.xml 条目链接不是文章绝对 URL：${link}`,
    )
    assert(
      !Number.isNaN(Date.parse(pubDate)),
      `feed.xml 条目 pubDate 无法解析：${link}`,
    )
    assert(author.includes('袁海粟'), `feed.xml 条目缺少作者：${link}`)
    assert(description.length > 0, `feed.xml 条目缺少摘要：${link}`)
    itemLinks.push(link)
  }

  for (const post of posts) {
    assert(
      itemLinks.includes(`${SITE_ORIGIN}/posts/${post.slug}`),
      `feed.xml 缺少文章：${post.slug}`,
    )
  }

  assert(
    !xml.includes('draft-example-not-published'),
    'feed.xml 泄露了草稿',
  )

  return `${items.length} 条`
}

async function validateRobots(rootDir) {
  const path = join(rootDir, 'robots.txt')
  if (!(await pathExists(path))) {
    assert(false, 'robots.txt 缺失')
    return
  }

  const text = await readFile(path, 'utf8')
  const groups = parseRobots(text)

  const wildcard = groups.find((entry) => entry.agents.includes('*'))
  assert(Boolean(wildcard), 'robots.txt 缺少 User-agent: *')
  if (wildcard) {
    assert(
      wildcard.rules.some(
        (rule) => rule.directive === 'allow' && rule.value === '/',
      ),
      'robots.txt 未允许全站抓取',
    )
  }

  for (const crawler of AI_CRAWLERS) {
    const group = groups.find((entry) =>
      entry.agents.includes(crawler.toLowerCase()),
    )
    assert(Boolean(group), `robots.txt 缺少 ${crawler}`)
    if (group) {
      assert(
        group.rules.some(
          (rule) => rule.directive === 'allow' && rule.value === '/',
        ),
        `robots.txt 未允许 ${crawler}`,
      )
    }
  }

  assert(
    text.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`),
    'robots.txt 缺少 sitemap 声明',
  )

  return `${AI_CRAWLERS.length} 个爬虫`
}

async function validateLlms(rootDir, posts) {
  const path = join(rootDir, 'llms.txt')
  if (!(await pathExists(path))) {
    assert(false, 'llms.txt 缺失')
    return
  }

  const text = await readFile(path, 'utf8')
  assert(/^# 一人交付笔记/m.test(text), 'llms.txt 缺少站点标题')
  assert(text.includes('袁海粟（Yuan Haisu）'), 'llms.txt 缺少作者身份')
  assert(text.includes('11 年后端'), 'llms.txt 缺少可验证经历')
  assert(text.includes('AI agent 流水线'), 'llms.txt 缺少定位描述')

  for (const route of [
    '/',
    '/about',
    '/archive',
    '/privacy',
    '/feed.xml',
    '/sitemap.xml',
  ]) {
    assert(
      text.includes(`${SITE_ORIGIN}${route}`),
      `llms.txt 缺少核心页面：${route}`,
    )
  }

  for (const post of posts) {
    assert(
      text.includes(`${SITE_ORIGIN}/posts/${post.slug}`),
      `llms.txt 缺少文章索引：${post.slug}`,
    )
    assert(text.includes(post.title), `llms.txt 缺少文章标题：${post.title}`)
  }

  const indexedPosts = [
    ...text.matchAll(/https:\/\/yuanhaisu\.com\/posts\/[^\s)（]+/g),
  ].map((match) => match[0])
  assert(
    indexedPosts.length === posts.length,
    `llms.txt 文章索引数应为 ${posts.length}，实际 ${indexedPosts.length}`,
  )

  assert(text.includes('CC BY 4.0'), 'llms.txt 缺少授权声明')
  assert(text.includes(LICENSE_URL), 'llms.txt 缺少 CC BY 4.0 链接')
  assert(text.includes('hi@yuanhaisu.com'), 'llms.txt 缺少联系方式')
  assert(!text.includes('draft-example-not-published'), 'llms.txt 泄露了草稿')

  return `${posts.length} 篇文章`
}

async function validateHeaders(rootDir) {
  const path = join(rootDir, '_headers')
  if (!(await pathExists(path))) {
    assert(false, '_headers 缺失')
    return
  }

  const text = await readFile(path, 'utf8')
  const hsts = /Strict-Transport-Security:\s*([^\n]+)/i.exec(text)?.[1] ?? ''
  assert(/max-age=(?:31536000|63072000)/.test(hsts), '_headers HSTS max-age 不足')
  assert(hsts.includes('includeSubDomains'), '_headers HSTS 缺少 includeSubDomains')

  const cspHeader =
    /Content-Security-Policy:\s*([^\n]+)/i.exec(text)?.[1] ?? ''
  assert(Boolean(cspHeader), '_headers 缺少 CSP')
  const csp = parseCsp(cspHeader)

  const scriptSrc = csp.get('script-src') ?? []
  for (const source of [
    "'self'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    'https://giscus.app',
    'https://static.cloudflareinsights.com',
    'https://hm.baidu.com',
  ]) {
    assert(scriptSrc.includes(source), `CSP script-src 缺少 ${source}`)
  }
  assert(
    (csp.get('frame-src') ?? []).includes('https://giscus.app'),
    'CSP frame-src 缺少 Giscus',
  )
  assert(
    (csp.get('connect-src') ?? []).includes('https://cloudflareinsights.com'),
    'CSP connect-src 缺少 Cloudflare Analytics',
  )
  assert(
    (csp.get('font-src') ?? []).includes('https://fonts.gstatic.com'),
    'CSP font-src 缺少字体来源',
  )
  assert(
    (csp.get('worker-src') ?? []).includes("'self'") &&
      (csp.get('worker-src') ?? []).includes('blob:'),
    'CSP worker-src 缺少 Pagefind worker 来源',
  )
  assert((csp.get('object-src') ?? []).includes("'none'"), 'CSP object-src 应为 none')
  assert(
    (csp.get('frame-ancestors') ?? []).includes("'none'"),
    'CSP frame-ancestors 应为 none',
  )

  for (const header of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy:',
    'Permissions-Policy:',
  ]) {
    assert(text.includes(header), `_headers 缺少 ${header}`)
  }

  return 'HSTS + CSP'
}

async function validatePagefind(rootDir, posts) {
  const entryPath = join(rootDir, 'pagefind/pagefind-entry.json')
  if (!(await pathExists(entryPath))) {
    assert(false, 'pagefind/pagefind-entry.json 缺失')
    return
  }

  let entry
  try {
    entry = JSON.parse(await readFile(entryPath, 'utf8'))
  } catch (error) {
    assert(false, `Pagefind 索引元数据无法解析：${error.message}`)
    return
  }

  const language = entry.languages?.['zh-cn']
  assert(Boolean(language), 'Pagefind 未生成 zh-cn 中文索引')
  assert(
    Number(language?.page_count) === posts.length,
    `Pagefind 索引文章数应为 ${posts.length}，实际 ${language?.page_count}`,
  )
  assert(
    await pathExists(join(rootDir, 'pagefind/index')),
    'Pagefind 索引目录缺失',
  )

  return `${language?.page_count ?? 0} 篇（zh-cn）`
}

async function validateContentDump(rootDir) {
  const path = join(rootDir, '__nuxt_content/posts/sql_dump.txt')
  if (!(await pathExists(path))) {
    assert(false, '__nuxt_content/posts/sql_dump.txt 缺失')
    return
  }

  const raw = (await readFile(path, 'utf8')).trim()
  let dump = raw
  if (raw.startsWith('H4sI')) {
    try {
      dump = gunzipSync(Buffer.from(raw, 'base64')).toString('utf8')
    } catch {
      assert(false, '内容数据库转储无法解压')
      return
    }
  }

  assert(
    !dump.includes('draft-example-not-published'),
    '内容数据库转储泄露了草稿路由',
  )
  assert(
    !dump.includes('草稿示例：这篇不会发布'),
    '内容数据库转储泄露了草稿标题',
  )

  return '未包含草稿'
}

export async function validateArtifacts({
  rootDir = resolve('.output/public'),
  contentDir = resolve('content'),
} = {}) {
  failures.length = 0
  checks.length = 0

  const posts = await collectPublishedPosts(contentDir)
  const draftRoutes = await collectDraftRoutes(contentDir)
  let htmlRoutes = new Map()

  await group('必需产物', async () => {
    for (const file of REQUIRED_FILES) {
      assert(
        await pathExists(join(rootDir, file)),
        `缺少必需产物：${file}`,
      )
    }
    return REQUIRED_FILES.length + ' 个文件'
  })

  await group('路由清单', async () => {
    htmlRoutes = await collectHtmlRoutes(rootDir)
    const expected = expectedRoutes(posts)

    for (const route of expected) {
      assert(htmlRoutes.has(route), `缺少公开路由产物：${route}`)
    }
    for (const route of htmlRoutes.keys()) {
      assert(expected.has(route), `存在未声明的公开路由产物：${route}`)
    }
    for (const route of draftRoutes) {
      assert(!htmlRoutes.has(route), `草稿路由进入了构建产物：${route}`)
    }

    return `${htmlRoutes.size} 条公开路由，${draftRoutes.length} 条草稿被排除`
  })

  await group('页面 HTML / JSON-LD / 无 JS', async () => {
    for (const [route, file] of htmlRoutes) {
      validatePage(route, await readFile(file, 'utf8'))
    }
    return `${htmlRoutes.size} 个页面`
  })

  await group('sitemap.xml', () => validateSitemap(rootDir, posts, new Set(htmlRoutes.keys())))
  await group('feed.xml', () => validateFeed(rootDir, posts))
  await group('robots.txt', () => validateRobots(rootDir))
  await group('llms.txt', () => validateLlms(rootDir, posts))
  await group('_headers', () => validateHeaders(rootDir))
  await group('Pagefind 中文索引', () => validatePagefind(rootDir, posts))
  await group('草稿隔离', () => validateContentDump(rootDir))

  return {
    ok: failures.length === 0,
    checks,
    failures,
    counts: {
      routes: htmlRoutes.size,
      posts: posts.length,
      drafts: draftRoutes.length,
    },
  }
}

function formatReport(result, rootDir) {
  const lines = [`Artifact validation: ${rootDir}`]
  for (const check of result.checks) {
    lines.push(
      `  ${check.ok ? 'ok  ' : 'FAIL'} ${check.label}${check.detail ? ` (${check.detail})` : ''}`,
    )
  }

  if (result.failures.length > 0) {
    lines.push('')
    for (const failure of result.failures) {
      lines.push(`  FAIL [${failure.group}] ${failure.message}`)
    }
    lines.push(`\nFAIL: ${result.failures.length} 项产物校验失败。`)
  } else {
    lines.push(
      `\nPASS: ${result.checks.length} 组产物校验通过（${result.counts.routes} 条路由，${result.counts.posts} 篇文章）。`,
    )
  }

  return lines.join('\n')
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (isEntrypoint) {
  try {
    const options = parseArgs(process.argv.slice(2))
    const result = await validateArtifacts(options)
    process.stdout.write(`${formatReport(result, options.rootDir)}\n`)
    if (!result.ok) {
      process.exitCode = 1
    }
  } catch (error) {
    process.stderr.write(`产物校验执行失败：${error?.message ?? '未知错误'}\n`)
    process.exitCode = 1
  }
}
