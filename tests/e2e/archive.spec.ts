import { expect, test } from '@playwright/test'

test('归档页按年/月分组列出全部已发布文章', async ({ page }) => {
  const response = await page.goto('/archive')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('归档')
  await expect(page.getByRole('heading', { level: 2, name: '2026 年' })).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 3, name: '2026 年 11 月' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 3, name: '2026 年 10 月' }),
  ).toBeVisible()

  await expect(page.locator('main')).toContainText('我为什么开始「一人交付笔记」')
  await expect(page.locator('main')).not.toContainText('草稿示例：这篇不会发布')
})

test('归档页每月内按发布日期倒序排列', async ({ page }) => {
  await page.goto('/archive')

  const october = page.locator('main .archive-month', {
    has: page.getByRole('heading', { level: 3, name: '2026 年 10 月' }),
  })
  const titles = await october.locator('.post-title').allTextContents()

  expect(titles).toEqual([
    '测试文章：专题第二篇',
    '测试文章：标签排序靠前',
    '测试文章：标签排序靠后',
    '测试文章：专题第一篇',
  ])
})

test('首页导航链接到归档页', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('link', { name: '归档' })).toHaveAttribute(
    'href',
    '/archive',
  )
})
