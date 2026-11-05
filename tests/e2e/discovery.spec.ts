import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { parseFrontmatter } from '../../shared/frontmatter.mjs'

const siteUrl = 'https://yuanhaisu.com'
const contentDir = resolve(process.cwd(), 'content')

type PublishedPost = {
  slug: string
  title: string
  description: string
  date: string
  tags: string[]
  series?: string
}

async function collectPublishedPosts(): Promise<PublishedPost[]> {
  const postsDir = join(contentDir, 'posts')
  const files: string[] = []

  async function visit(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        await visit(path)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(path)
      }
    }
  }

  await visit(postsDir)

  const posts: PublishedPost[] = []

  for (const file of files) {
    const { data } = parseFrontmatter(await readFile(file, 'utf8'))
    if (!data || data.draft === true || data.draft === 'true') {
      continue
    }

    posts.push({
      slug: relative(postsDir, file)
        .replace(/\.md$/, '')
        .split(sep)
        .join('/'),
      title: String(data.title ?? ''),
      description: String(data.description ?? ''),
      date: String(data.date ?? ''),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      series: data.series ? String(data.series) : undefined,
    })
  }

  return posts
}

async function parseXml(page: Page, body: string) {
  const result = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    return {
      error: document.querySelector('parsererror')?.textContent ?? null,
      root: document.documentElement?.nodeName ?? '',
    }
  }, body)

  expect(result.error, 'XML 应可被浏览器解析').toBeNull()
  return result
}

async function sitemapEntries(page: Page) {
  const response = await page.request.get('/sitemap.xml')
  expect(response.status(), '/sitemap.xml 应可访问').toBe(200)

  const body = await response.text()
  const { root } = await parseXml(page, body)
  expect(root).toBe('urlset')

  return page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    return [...document.getElementsByTagName('url')].map((url) => ({
      loc: url.getElementsByTagName('loc')[0]?.textContent?.trim() ?? '',
      lastmod: url.getElementsByTagName('lastmod')[0]?.textContent?.trim() ?? '',
    }))
  }, body)
}

test('sitemap 包含全部公开路由与 lastmod，排除草稿和 404', async ({ page }) => {
  const posts = await collectPublishedPosts()
  const entries = await sitemapEntries(page)
  const locs = entries.map((entry) => entry.loc)

  const expected = [
    `${siteUrl}/`,
    `${siteUrl}/about`,
    `${siteUrl}/archive`,
    ...posts.map((post) => `${siteUrl}/posts/${post.slug}`),
    ...[...new Set(posts.flatMap((post) => post.tags))].map(
      (tag) => `${siteUrl}/tags/${encodeURIComponent(tag)}`,
    ),
    ...[...new Set(posts.flatMap((post) => (post.series ? [post.series] : [])))].map(
      (series) => `${siteUrl}/series/${encodeURIComponent(series)}`,
    ),
  ]

  for (const url of expected) {
    expect(locs, `sitemap 应包含 ${url}`).toContain(url)
  }

  for (const entry of entries) {
    expect(entry.loc, '每个 url 必须有绝对 loc').toMatch(
      /^https:\/\/yuanhaisu\.com\//,
    )
    expect(entry.lastmod, `${entry.loc} 应有 lastmod`).toMatch(
      /^\d{4}-\d{2}-\d{2}/,
    )
  }

  expect(locs.join('\n')).not.toContain('draft-example-not-published')
  expect(locs.join('\n')).not.toContain('/404')
})

test('feed.xml 是合法 RSS，包含标题、链接、日期、作者与摘要', async ({
  page,
}) => {
  const posts = await collectPublishedPosts()
  const response = await page.request.get('/feed.xml')
  expect(response.status(), '/feed.xml 应可访问').toBe(200)

  const body = await response.text()
  const { root } = await parseXml(page, body)
  expect(root).toBe('rss')

  const feed = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    const text = (parent: Element, tag: string) =>
      parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''

    const channel = document.getElementsByTagName('channel')[0]
    return {
      title: text(channel!, 'title'),
      link: text(channel!, 'link'),
      description: text(channel!, 'description'),
      language: text(channel!, 'language'),
      items: [...channel!.getElementsByTagName('item')].map((item) => ({
        title: text(item, 'title'),
        link: text(item, 'link'),
        pubDate: text(item, 'pubDate'),
        author: text(item, 'author'),
        description: text(item, 'description'),
      })),
    }
  }, body)

  expect(feed.title).toBe('一人交付笔记')
  expect(feed.link).toBe(`${siteUrl}/`)
  expect(feed.description.length).toBeGreaterThan(0)
  expect(feed.language).toBe('zh-CN')
  expect(feed.items).toHaveLength(posts.length)

  for (const item of feed.items) {
    expect(item.title.length, '每条 feed 应有标题').toBeGreaterThan(0)
    expect(item.link, '每条 feed 应有绝对链接').toMatch(
      /^https:\/\/yuanhaisu\.com\/posts\//,
    )
    expect(item.author, '每条 feed 应有作者').toContain('袁海粟')
    expect(item.description.length, '每条 feed 应有摘要').toBeGreaterThan(0)
    expect(
      Number.isNaN(Date.parse(item.pubDate)),
      `pubDate 应可解析：${item.pubDate}`,
    ).toBe(false)
  }

  const itemLinks = feed.items.map((item) => item.link)
  for (const post of posts) {
    expect(itemLinks, `feed 应包含 ${post.slug}`).toContain(
      `${siteUrl}/posts/${post.slug}`,
    )
  }
  expect(body).not.toContain('draft-example-not-published')
})

const crawlerNames = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Googlebot',
  'Google-Extended',
  'Bytespider',
  'Baiduspider',
  'bingbot',
]

type RobotsGroup = {
  agents: string[]
  rules: Array<{ directive: string; value: string }>
}

function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = []
  let current: RobotsGroup | undefined

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) {
      continue
    }

    const separator = line.indexOf(':')
    if (separator === -1) {
      continue
    }

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

test('robots.txt 明确允许主流搜索引擎与 AI 爬虫，并声明 sitemap', async ({
  page,
}) => {
  const response = await page.request.get('/robots.txt')
  expect(response.status(), '/robots.txt 应可访问').toBe(200)

  const text = await response.text()
  const groups = parseRobots(text)

  for (const crawler of crawlerNames) {
    const group = groups.find((entry) =>
      entry.agents.includes(crawler.toLowerCase()),
    )
    expect(group, `robots.txt 应声明 ${crawler}`).toBeTruthy()
    expect(
      group!.rules.some(
        (rule) =>
          rule.directive === 'allow' &&
          (rule.value === '/' || rule.value === ''),
      ),
      `${crawler} 应被允许抓取全站`,
    ).toBe(true)
  }

  const sitemapRules = groups
    .flatMap((group) => group.rules)
    .filter((rule) => rule.directive === 'sitemap')

  expect(sitemapRules.map((rule) => rule.value)).toContain(
    `${siteUrl}/sitemap.xml`,
  )
})

test('llms.txt 包含站点简介、作者、核心页面、文章索引、授权与联系方式', async ({
  page,
}) => {
  const posts = await collectPublishedPosts()
  const response = await page.request.get('/llms.txt')
  expect(response.status(), '/llms.txt 应可访问').toBe(200)

  const text = await response.text()

  expect(text).toMatch(/^# 一人交付笔记/m)
  expect(text).toContain('袁海粟（Yuan Haisu）')
  expect(text).toContain('11 年后端')
  expect(text).toContain('AI agent 流水线')

  for (const link of [
    `${siteUrl}/`,
    `${siteUrl}/about`,
    `${siteUrl}/archive`,
    `${siteUrl}/privacy`,
    `${siteUrl}/feed.xml`,
    `${siteUrl}/sitemap.xml`,
  ]) {
    expect(text, `llms.txt 应链接核心页面 ${link}`).toContain(link)
  }

  for (const post of posts) {
    expect(text, `llms.txt 应索引文章 ${post.slug}`).toContain(
      `${siteUrl}/posts/${post.slug}`,
    )
    expect(text).toContain(post.title)
  }
  expect(text).not.toContain('draft-example-not-published')

  expect(text).toContain('CC BY 4.0')
  expect(text).toContain('https://creativecommons.org/licenses/by/4.0/')
  expect(text).toContain('hi@yuanhaisu.com')
})
