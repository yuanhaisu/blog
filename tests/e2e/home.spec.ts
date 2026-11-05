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
    page.getByRole('link', { name: /我为什么开始「一人交付笔记」/ }).first(),
  ).toHaveAttribute('href', '/posts/why-i-started-one-person-delivery-notes')
})

test('首页展示精选文章与订阅入口', async ({ page }) => {
  await page.goto('/')

  const featured = page.getByRole('region', { name: '精选文章' })
  await expect(featured).toBeVisible()
  await expect(
    featured.getByRole('link', { name: /我为什么开始「一人交付笔记」/ }),
  ).toHaveAttribute('href', '/posts/why-i-started-one-person-delivery-notes')

  const subscribe = page.getByRole('region', { name: '订阅' })
  await expect(subscribe).toBeVisible()
  await expect(
    subscribe.getByRole('link', { name: 'RSS 订阅' }),
  ).toHaveAttribute('href', '/feed.xml')
  await expect(subscribe).toContainText('微信公众号')
})

test('页脚展示 CC BY 4.0 授权声明', async ({ page }) => {
  await page.goto('/')

  const license = page
    .locator('.site-footer')
    .getByRole('link', { name: 'CC BY 4.0', exact: true })
  await expect(license).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by/4.0/',
  )
})
