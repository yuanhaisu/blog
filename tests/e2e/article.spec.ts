import { expect, test } from '@playwright/test'

const articlePath = '/posts/why-i-started-one-person-delivery-notes'
const articleTitle = '我为什么开始「一人交付笔记」'

const fixturePath = '/posts/fixture-code-and-toc'
const fixtureTitle = '测试夹具：目录、代码块与阅读体验'
const fixtureDescription =
  '用于验证文章页目录、代码高亮、复制、上下篇与相关文章的测试夹具，不属于正式发布内容。'

test('文章页渲染中文正文、标题、日期、作者与 canonical', async ({ page }) => {
  const response = await page.goto(articlePath)

  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(new RegExp(articleTitle))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(articleTitle)
  await expect(page.locator('time[datetime="2026-11-05"]')).toHaveText(
    '2026-11-05',
  )
  await expect(page.getByText('作者：袁海粟')).toBeVisible()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `https://yuanhaisu.com${articlePath}`,
  )
  await expect(page.locator('article')).toContainText(
    '过去十一年，我主要做后端与分布式系统',
  )
  await expect(page.locator('article')).toContainText('一人交付笔记')
})

test('文章页展示描述、更新日期、标签、专题与阅读时长', async ({ page }) => {
  const response = await page.goto(fixturePath)

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fixtureTitle)
  await expect(page.getByText(fixtureDescription, { exact: true })).toBeVisible()
  await expect(page.locator('time[datetime="2026-11-06"]')).toHaveText(
    '2026-11-06',
  )
  await expect(page.locator('time[datetime="2026-11-08"]')).toContainText(
    '更新于',
  )
  await expect(page.getByText('作者：袁海粟')).toBeVisible()

  const tags = page.getByRole('navigation', { name: '文章标签' })
  await expect(tags.getByRole('link', { name: '一人交付', exact: true })).toBeVisible()
  await expect(tags.getByRole('link', { name: 'AI Agent', exact: true })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: '文章专题' }),
  ).toContainText('一人交付实验')
  await expect(page.getByText(/阅读约 \d+ 分钟/)).toBeVisible()
})

test('目录列出 h2/h3 标题并链接到对应锚点', async ({ page }) => {
  await page.goto(fixturePath)

  const toc = page.getByRole('navigation', { name: '目录' })
  await expect(toc).toBeVisible()

  const expected = [
    { level: 2, text: '准备工作' },
    { level: 3, text: '环境要求' },
    { level: 3, text: '目录结构' },
    { level: 2, text: '示例代码' },
    { level: 2, text: '小结' },
  ]

  for (const item of expected) {
    await expect(
      toc.getByRole('link', { name: item.text, exact: true }),
    ).toHaveAttribute('href', `#${item.text}`)
    await expect(
      page.locator(`h${item.level}#${item.text}`),
    ).toHaveText(item.text)
  }

  await expect(toc.getByRole('link')).toHaveCount(expected.length)
})

test('代码块有语法高亮且文本可复制', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(fixturePath)

  const codeBlock = page.locator('.post-body pre').first()
  await expect(codeBlock).toHaveClass(/shiki/)

  const code = codeBlock.locator('code')
  await expect(code).toContainText('findFixture')

  const baseColor = await code.evaluate((element) => getComputedStyle(element).color)
  const tokenColor = await code
    .locator('span span')
    .first()
    .evaluate((element) => getComputedStyle(element).color)
  expect(tokenColor).not.toBe(baseColor)

  const copyButton = codeBlock.getByRole('button', { name: '复制代码' })
  await expect(copyButton).toBeVisible()
  await copyButton.click()
  await expect(
    codeBlock.getByRole('button', { name: '已复制' }),
  ).toBeVisible()

  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toContain('findFixture')
})

test('上一篇/下一篇按文章日期顺序链接', async ({ page }) => {
  await page.goto(fixturePath)

  const pagination = page.getByRole('navigation', { name: '文章导航' })
  await expect(pagination).toBeVisible()

  const previous = pagination.getByRole('link', { name: /上一篇/ })
  await expect(previous).toHaveAttribute('href', articlePath)
  await expect(previous).toContainText(articleTitle)

  const next = pagination.getByRole('link', { name: /下一篇/ })
  await expect(next).toHaveAttribute('href', '/posts/fixture-related-notes')
  await expect(next).toContainText('测试夹具：用于上下篇与相关文章')
})

test('文章页脚展示 CC BY 4.0 授权与相关文章', async ({ page }) => {
  await page.goto(fixturePath)

  const footer = page.locator('footer.post-footer')
  await expect(footer).toBeVisible()

  const license = footer.getByRole('link', { name: 'CC BY 4.0', exact: true })
  await expect(license).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by/4.0/',
  )

  const related = footer.getByRole('navigation', { name: '相关文章' })
  await expect(related).toBeVisible()

  const links = related.getByRole('link')
  await expect(links).toHaveCount(2)
  await expect(links.nth(0)).toHaveAttribute('href', articlePath)
  await expect(links.nth(0)).toContainText(articleTitle)
  await expect(links.nth(1)).toHaveAttribute(
    'href',
    '/posts/fixture-related-notes',
  )
  await expect(links.nth(1)).toContainText('测试夹具：用于上下篇与相关文章')
  await expect(related.getByRole('link', { name: fixtureTitle })).toHaveCount(0)
})
