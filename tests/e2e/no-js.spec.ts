import { expect, test } from '@playwright/test'

const articlePath = '/posts/fixture-manifesto'
const articleTitle = '测试夹具：一人交付笔记开篇'

const fixturePath = '/posts/fixture-code-and-toc'
const fixtureTitle = '测试夹具：目录、代码块与阅读体验'

test.describe('禁用 JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('文章正文、标题、日期、作者仍可读', async ({ page }) => {
    const response = await page.goto(articlePath)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      articleTitle,
    )
    await expect(page.locator('time[datetime="2026-11-05"]')).toHaveText(
      '2026-11-05',
    )
    await expect(page.getByText('作者：袁海粟')).toBeVisible()
    await expect(page.locator('article')).toContainText(
      '过去十一年，我主要做后端与分布式系统',
    )
    await expect(page.locator('article')).toContainText('这里会写什么')
  })

  test('目录链接可跳转到正文标题，代码文本仍可读', async ({ page }) => {
    const response = await page.goto(fixturePath)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      fixtureTitle,
    )

    const toc = page.getByRole('navigation', { name: '目录' })
    await expect(toc).toBeVisible()

    const anchor = toc.getByRole('link', { name: '环境要求', exact: true })
    await expect(anchor).toHaveAttribute('href', '#环境要求')
    await anchor.click()

    await expect(page).toHaveURL(
      new RegExp(`#${encodeURIComponent('环境要求')}$`),
    )
    await expect(page.locator('h3#环境要求')).toBeInViewport()

    const codeBlock = page.locator('.post-body pre').first()
    await expect(codeBlock).toContainText('findFixture')
    await expect(codeBlock.getByRole('button')).toHaveCount(0)
  })
})
