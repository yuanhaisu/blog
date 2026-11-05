import { expect, test } from '@playwright/test'

test('页头提供搜索入口，搜索页默认给出使用提示', async ({ page }) => {
  await page.goto('/')

  const entry = page.getByRole('link', { name: '搜索' })
  await expect(entry).toBeVisible()
  await entry.click()

  await expect(page).toHaveURL(/\/search\/?$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('搜索文章')

  const searchbox = page.getByRole('searchbox', { name: '搜索文章' })
  await expect(searchbox).toBeVisible()
  await expect(searchbox).toHaveValue('')
  await expect(page.getByText(/输入关键词开始搜索/)).toBeVisible()
})

test('中文查询命中预期文章并显示包含查询词的上下文摘要', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: '搜索' }).click()
  const searchbox = page.getByRole('searchbox', { name: '搜索文章' })
  await searchbox.fill('夹具专用检索词')
  await searchbox.press('Enter')

  const results = page.getByRole('list', { name: '搜索结果' })
  await expect(results).toBeVisible()

  const item = results
    .getByRole('listitem')
    .filter({ hasText: '测试夹具：一人交付笔记开篇' })
  await expect(item).toBeVisible()
  await expect(item.getByRole('link')).toHaveAttribute(
    'href',
    '/posts/fixture-manifesto',
  )
  await expect(item).toContainText('夹具专用检索词')
  await expect(item.locator('mark').first()).toBeVisible()
  await expect(page.getByText(/找到 1 篇相关文章/)).toBeVisible()
})

test('空查询与未知查询都有可用的空状态', async ({ page }) => {
  await page.goto('/search')
  const searchbox = page.getByRole('searchbox', { name: '搜索文章' })

  await searchbox.press('Enter')
  await expect(page.getByText('请输入关键词后再搜索。')).toBeVisible()
  await expect(page.getByRole('list', { name: '搜索结果' })).toHaveCount(0)

  await searchbox.fill('不存在的关键词 zzz')
  await searchbox.press('Enter')
  await expect(
    page.getByText('没有找到与「不存在的关键词 zzz」匹配的文章。'),
  ).toBeVisible()
  await expect(page.getByRole('list', { name: '搜索结果' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '文章归档' })).toHaveAttribute(
    'href',
    '/archive',
  )
})

test('草稿、404 与隐私页不被搜索索引收录', async ({ page }) => {
  await page.goto('/search')
  const searchbox = page.getByRole('searchbox', { name: '搜索文章' })

  const excludedMarkers = [
    '草稿隔离', // 仅出现在草稿正文
    '跨站追踪', // 仅出现在隐私说明
    '页面不存在', // 404 页面的占位文案
  ]

  for (const marker of excludedMarkers) {
    await searchbox.fill(marker)
    await searchbox.press('Enter')
    await expect(
      page.getByText(`没有找到与「${marker}」匹配的文章。`),
    ).toBeVisible()
  }

  // A query matching the site chrome returns only article URLs, proving that
  // non-post pages (privacy, 404, archive, search itself) are not indexed.
  await searchbox.fill('袁海粟')
  await searchbox.press('Enter')

  const resultLinks = page
    .getByRole('list', { name: '搜索结果' })
    .getByRole('link')
  await expect(resultLinks.first()).toBeVisible()

  const hrefs = await resultLinks.evaluateAll((links) =>
    links.map((link) => link.getAttribute('href') ?? ''),
  )
  expect(hrefs.length).toBeGreaterThan(0)

  for (const href of hrefs) {
    expect(href).toMatch(/^\/posts\//)
    expect(href).not.toContain('/drafts/')
  }
})

test('构建产物包含站内搜索索引', async ({ request }) => {
  const indexScript = await request.get('/pagefind/pagefind.js')

  expect(indexScript.status()).toBe(200)
  expect(indexScript.headers()['content-type']).toContain('javascript')
  expect(await indexScript.text()).toContain('pagefind')
})
