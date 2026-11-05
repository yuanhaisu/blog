import { expect, test } from '@playwright/test'

test('首页展示站名、身份主张与文章入口', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/一人交付笔记/)
  await expect(page.getByRole('link', { name: '一人交付笔记' }).first()).toBeVisible()
  await expect(
    page.getByText('记录一个人借助 AI agent 流水线完成软件交付的真实实验。', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /我为什么开始「一人交付笔记」/ }),
  ).toHaveAttribute('href', '/posts/why-i-started-one-person-delivery-notes')
})
