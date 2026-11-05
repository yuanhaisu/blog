import { expect, test } from '@playwright/test'

const articlePath = '/posts/why-i-started-one-person-delivery-notes'
const articleTitle = '我为什么开始「一人交付笔记」'

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
})
