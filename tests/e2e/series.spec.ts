import { expect, test } from '@playwright/test'

const seriesPath = '/series/test-series'

test('专题页按 order 排序文章并展示专题说明', async ({ page }) => {
  const response = await page.goto(seriesPath)

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('测试专题')
  await expect(page.locator('main')).toContainText(
    '用于验证专题页按 order 排序并展示专题说明的测试专题。',
  )

  const titles = await page.locator('main .post-list .post-title').allTextContents()
  expect(titles).toEqual(['测试文章：专题第一篇', '测试文章：专题第二篇'])
})

test('专题页排除草稿，未知专题返回 404', async ({ page }) => {
  const series = await page.goto(seriesPath)
  expect(series?.status()).toBe(200)
  await expect(page.locator('main')).not.toContainText('草稿示例：这篇不会发布')

  const unknownSeries = await page.goto(`/series/${encodeURIComponent('不存在的专题')}`)
  expect(unknownSeries?.status()).toBe(404)
})
