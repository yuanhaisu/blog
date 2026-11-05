import { expect, test } from '@playwright/test'

const tagPath = `/tags/${encodeURIComponent('测试标签')}`

test('标签页按发布日期倒序列出该标签下的已发布文章', async ({ page }) => {
  const response = await page.goto(tagPath)

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('测试标签')

  const titles = await page.locator('main .post-list .post-title').allTextContents()
  expect(titles).toEqual(['测试文章：标签排序靠前', '测试文章：标签排序靠后'])
  await expect(page.locator('main')).not.toContainText('草稿示例：这篇不会发布')
})

test('只有草稿使用的标签与未知标签返回 404', async ({ page }) => {
  const draftOnlyTag = await page.goto(`/tags/${encodeURIComponent('内容护栏')}`)
  expect(draftOnlyTag?.status()).toBe(404)

  const unknownTag = await page.goto(`/tags/${encodeURIComponent('不存在的标签')}`)
  expect(unknownTag?.status()).toBe(404)
})
