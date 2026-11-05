import { expect, test } from '@playwright/test'

test('文章页链接到所属的每个标签', async ({ page }) => {
  await page.goto('/posts/fixture-manifesto')

  for (const tag of ['夹具关联', '夹具标签']) {
    await expect(
      page.getByRole('link', { name: tag, exact: true }),
    ).toHaveAttribute('href', `/tags/${encodeURIComponent(tag)}`)
  }
})

test('文章页链接到所属专题并展示专题标题', async ({ page }) => {
  await page.goto('/posts/fixture-series-part-one')

  await expect(
    page.getByRole('link', { name: '测试专题', exact: true }),
  ).toHaveAttribute('href', '/series/test-series')
})

test('没有专题的文章不展示专题链接', async ({ page }) => {
  await page.goto('/posts/fixture-manifesto')

  await expect(page.locator('main a[href^="/series/"]')).toHaveCount(0)
})
