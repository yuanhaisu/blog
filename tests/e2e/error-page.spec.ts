import { expect, test } from '@playwright/test'

const missingPath = '/this-page-does-not-exist'

test('未知路径返回 404 页，并提供首页与文章列表入口', async ({ page }) => {
  const response = await page.goto(missingPath)

  expect(response?.status()).toBe(404)
  await expect(page).toHaveTitle(/404|页面不存在/)

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const homeLink = page.getByRole('link', { name: /返回首页/ })
  await expect(homeLink).toHaveAttribute('href', '/')

  const archiveLink = page.getByRole('link', { name: /浏览全部文章|文章列表/ })
  await expect(archiveLink).toHaveAttribute('href', '/archive')
})

test('404 页的入口可以导航到首页', async ({ page }) => {
  await page.goto(missingPath)

  await page.getByRole('link', { name: /返回首页/ }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { level: 1, name: '一人交付笔记' }),
  ).toBeVisible()
})

test('404 页的入口可以导航到文章列表', async ({ page }) => {
  await page.goto(missingPath)

  await page.getByRole('link', { name: /浏览全部文章|文章列表/ }).click()

  await expect(page).toHaveURL(/\/archive$/)
  await expect(page.getByRole('heading', { level: 1, name: '归档' })).toBeVisible()
})

test.describe('禁用 JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('404 页仍提供返回入口', async ({ page }) => {
    const response = await page.goto(missingPath)

    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /返回首页/ })).toBeVisible()
    await expect(
      page.getByRole('link', { name: /浏览全部文章|文章列表/ }),
    ).toBeVisible()
  })
})
