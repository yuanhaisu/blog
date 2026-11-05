import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const personId = 'https://yuanhaisu.com/#person'
const articlePath = '/posts/why-i-started-one-person-delivery-notes'
const articleUrl = `https://yuanhaisu.com${articlePath}`

type JsonLdNode = Record<string, unknown>

async function readJsonLd(page: Page): Promise<JsonLdNode[]> {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents()

  return blocks.map((block) => JSON.parse(block) as JsonLdNode)
}

function nodesOfType(nodes: JsonLdNode[], type: string): JsonLdNode[] {
  return nodes.filter((node) => node['@type'] === type)
}

function expectAbsoluteUrl(value: unknown, label: string) {
  expect(typeof value, `${label} 应为字符串`).toBe('string')
  expect(() => new URL(value as string), `${label} 应为绝对 URL`).not.toThrow()
}

function expectIso8601Date(value: unknown, label: string) {
  expect(typeof value, `${label} 应为字符串`).toBe('string')
  expect(value as string, `${label} 应为 ISO 8601 日期`).toMatch(
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/,
  )
  expect(
    Number.isNaN(Date.parse(value as string)),
    `${label} 应能被解析为日期`,
  ).toBe(false)
}

const siteOrigin = 'https://yuanhaisu.com'

const postPaths = [
  articlePath,
  '/posts/fixture-code-and-toc',
  '/posts/fixture-related-notes',
  '/posts/fixture-series-part-one',
  '/posts/fixture-series-part-two',
  '/posts/fixture-tag-newer',
  '/posts/fixture-tag-older',
]

const tagNames = ['AI Agent', '一人交付', '专题测试', '个人品牌', '测试标签']

const publicPages = [
  { path: '/', type: 'website' },
  { path: '/about', type: 'website' },
  { path: '/archive', type: 'website' },
  { path: '/privacy', type: 'website' },
  ...postPaths.map((path) => ({ path, type: 'article' as const })),
  { path: '/series/test-series', type: 'website' },
  ...tagNames.map((tag) => ({
    path: `/tags/${encodeURIComponent(tag)}`,
    type: 'website' as const,
  })),
]

function expectedCanonical(path: string) {
  return new URL(path, `${siteOrigin}/`).href
}

test('文章页输出唯一且字段完整的 BlogPosting JSON-LD', async ({ page }) => {
  await page.goto(articlePath)

  const posting = nodesOfType(await readJsonLd(page), 'BlogPosting')
  expect(posting, '文章页应只有一个 BlogPosting').toHaveLength(1)

  const node = posting[0]!
  expect(node['@context']).toBe('https://schema.org')
  expect(node.headline).toBe('我为什么开始「一人交付笔记」')
  expect(node.description).toBe(
    '从十一年后端与数据分析经验出发，说明「一人交付笔记」要记录什么，以及为什么要公开这些交付过程。',
  )

  expectIso8601Date(node.datePublished, 'datePublished')
  expectIso8601Date(node.dateModified, 'dateModified')
  expect(node.datePublished).toBe('2026-11-05')
  expect(node.dateModified).toBe('2026-11-05')

  expect(node.author).toMatchObject({ '@id': personId })
  expect(node.publisher).toMatchObject({ '@id': personId })
  expect(node.mainEntityOfPage).toMatchObject({ '@id': articleUrl })

  expectAbsoluteUrl(node.image, 'BlogPosting.image')
  expect(node.image).toBe('https://yuanhaisu.com/avatar.png')

  expect(node.inLanguage).toBe('zh-CN')
  expect(node.license).toBe('https://creativecommons.org/licenses/by/4.0/')
})

test('文章日期使用 ISO 8601，updated 反映到 dateModified', async ({ page }) => {
  await page.goto('/posts/fixture-code-and-toc')

  const posting = nodesOfType(await readJsonLd(page), 'BlogPosting')[0]!
  expectIso8601Date(posting.datePublished, 'datePublished')
  expectIso8601Date(posting.dateModified, 'dateModified')
  expect(posting.datePublished).toBe('2026-11-06')
  expect(posting.dateModified).toBe('2026-11-08')
  expect(posting.inLanguage).toBe('zh-CN')

  const datetimes = await page
    .locator('article time[datetime]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('datetime')!))
  expect(datetimes.length).toBeGreaterThanOrEqual(2)
  for (const datetime of datetimes) {
    expectIso8601Date(datetime, '<time datetime>')
  }
})

test('同一页面没有重复 JSON-LD 或冲突 canonical，Person 只出现一次', async ({
  page,
}) => {
  for (const { path } of publicPages) {
    const response = await page.goto(path)
    expect(response?.status(), `${path} 应返回 200`).toBe(200)

    const nodes = await readJsonLd(page)
    const types = nodes.map((node) => node['@type'])
    const duplicates = types.filter(
      (type, index) => types.indexOf(type) !== index,
    )
    expect(duplicates, `${path} 存在重复 JSON-LD 类型`).toEqual([])

    expect(
      nodesOfType(nodes, 'Person'),
      `${path} 应只有一个 Person 实体`,
    ).toHaveLength(1)

    if (path.startsWith('/posts/')) {
      expect(
        nodesOfType(nodes, 'BlogPosting'),
        `${path} 应只有一个 BlogPosting`,
      ).toHaveLength(1)
      expect(
        nodesOfType(nodes, 'BreadcrumbList'),
        `${path} 应只有一个 BreadcrumbList`,
      ).toHaveLength(1)
    }

    const ids = nodes
      .map((node) => node['@id'])
      .filter((id): id is string => typeof id === 'string')
    expect(new Set(ids).size, `${path} 的 JSON-LD @id 应唯一`).toBe(ids.length)

    await expect(
      page.locator('link[rel="canonical"]'),
      `${path} 应只有一个 canonical`,
    ).toHaveCount(1)
  }
})

test('客户端导航后不残留上一页的 canonical 或 JSON-LD', async ({ page }) => {
  await page.goto('/')
  await page
    .getByRole('link', { name: /我为什么开始「一人交付笔记」/ })
    .first()
    .click()
  await page.waitForURL(`**${articlePath}`)

  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    articleUrl,
  )
  expect(nodesOfType(await readJsonLd(page), 'BlogPosting')).toHaveLength(1)
  expect(nodesOfType(await readJsonLd(page), 'BreadcrumbList')).toHaveLength(1)
  expect(nodesOfType(await readJsonLd(page), 'Person')).toHaveLength(1)

  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '归档' })
    .click()
  await page.waitForURL('**/archive')

  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://yuanhaisu.com/archive',
  )
  const nodes = await readJsonLd(page)
  expect(nodesOfType(nodes, 'BlogPosting')).toHaveLength(0)
  expect(nodesOfType(nodes, 'BreadcrumbList')).toHaveLength(0)
  expect(nodesOfType(nodes, 'Person')).toHaveLength(1)
})

test.describe('禁用 JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('文章页的 JSON-LD、canonical 与正文仍由服务端输出', async ({
    page,
  }) => {
    const response = await page.goto(articlePath)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      '我为什么开始「一人交付笔记」',
    )
    await expect(page.getByText('作者：袁海粟')).toBeVisible()

    const nodes = await readJsonLd(page)
    expect(nodesOfType(nodes, 'BlogPosting')).toHaveLength(1)
    expect(nodesOfType(nodes, 'BreadcrumbList')).toHaveLength(1)
    expect(nodesOfType(nodes, 'Person')).toHaveLength(1)

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      articleUrl,
    )
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      articleUrl,
    )
  })
})

test('每个公开页面都有唯一 canonical 与完整 OG/Twitter 元数据', async ({
  page,
}) => {
  for (const { path, type } of publicPages) {
    const canonical = expectedCanonical(path)
    const response = await page.goto(path)
    expect(response?.status(), `${path} 应返回 200`).toBe(200)

    const canonicalLinks = page.locator('link[rel="canonical"]')
    await expect(canonicalLinks, `${path} 应只有一个 canonical`).toHaveCount(1)
    await expect(canonicalLinks).toHaveAttribute('href', canonical)
    expect(new URL(canonical).origin, `${path} 的 canonical 主机`).toBe(
      siteOrigin,
    )

    const description = page.locator('meta[name="description"]')
    await expect(description, `${path} 应只有一个 description`).toHaveCount(1)
    expect(
      (await description.getAttribute('content'))?.trim().length,
      `${path} 的 description 不应为空`,
    ).toBeGreaterThan(0)

    for (const property of [
      'og:title',
      'og:description',
      'og:image',
      'og:type',
      'og:url',
    ]) {
      await expect(
        page.locator(`meta[property="${property}"]`),
        `${path} 缺少 ${property}`,
      ).toHaveCount(1)
    }

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      /.+/,
    )
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute('content', /.+/)
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      'content',
      type,
    )
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      canonical,
    )

    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content')
    expectAbsoluteUrl(ogImage, `${path} 的 og:image`)
    expect(new URL(ogImage!).origin, `${path} 的 og:image 主机`).toBe(siteOrigin)

    for (const name of [
      'twitter:card',
      'twitter:title',
      'twitter:description',
      'twitter:image',
    ]) {
      await expect(
        page.locator(`meta[name="${name}"]`),
        `${path} 缺少 ${name}`,
      ).toHaveCount(1)
    }

    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      'content',
      /.+/,
    )
    await expect(
      page.locator('meta[name="twitter:description"]'),
    ).toHaveAttribute('content', /.+/)

    const twitterImage = await page
      .locator('meta[name="twitter:image"]')
      .getAttribute('content')
    expectAbsoluteUrl(twitterImage, `${path} 的 twitter:image`)
    expect(new URL(twitterImage!).origin, `${path} 的 twitter:image 主机`).toBe(
      siteOrigin,
    )

    const twitterCard = await page
      .locator('meta[name="twitter:card"]')
      .getAttribute('content')
    expect(['summary', 'summary_large_image'], `${path} 的 twitter:card`).toContain(
      twitterCard,
    )
  }
})

test('文章页输出合法的 BreadcrumbList', async ({ page }) => {
  await page.goto(articlePath)

  const lists = nodesOfType(await readJsonLd(page), 'BreadcrumbList')
  expect(lists, '文章页应只有一个 BreadcrumbList').toHaveLength(1)

  const node = lists[0]!
  expect(node['@context']).toBe('https://schema.org')

  const items = node.itemListElement as Record<string, unknown>[]
  expect(Array.isArray(items)).toBe(true)
  expect(items.length).toBeGreaterThanOrEqual(2)

  for (const [index, item] of items.entries()) {
    expect(item['@type']).toBe('ListItem')
    expect(item.position).toBe(index + 1)
    expect(typeof item.name).toBe('string')
    expect((item.name as string).length).toBeGreaterThan(0)
    expectAbsoluteUrl(item.item, `BreadcrumbList item ${index + 1}`)
  }

  expect(items[0]!.name).toBe('首页')
  expect(items[0]!.item).toBe('https://yuanhaisu.com/')
  expect(items.at(-1)!.name).toBe('我为什么开始「一人交付笔记」')
  expect(items.at(-1)!.item).toBe(articleUrl)
})
