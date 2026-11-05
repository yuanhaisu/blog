import { expect, test } from '@playwright/test'

test('跳过链接是首个 Tab 焦点，并能跳到主内容', async ({ page }) => {
  await page.goto('/')

  await page.keyboard.press('Tab')

  const skipLink = page.getByRole('link', { name: '跳到主要内容' })
  await expect(skipLink).toBeFocused()
  await expect(skipLink).toBeInViewport()

  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/#main-content$/)
  await expect(page.locator('#main-content')).toBeFocused()
  await expect(page.locator('#main-content')).toBeInViewport()
})

test('主导航可用键盘聚焦并跳转', async ({ page }) => {
  await page.goto('/')

  const navigation = page.getByRole('navigation', { name: '主导航' })
  await expect(navigation).toBeVisible()

  for (const name of ['首页', '归档', '关于']) {
    await expect(navigation.getByRole('link', { name, exact: true })).toBeVisible()
  }

  const archiveLink = navigation.getByRole('link', { name: '归档', exact: true })

  // The skip link is first; tab forward until the archive link has focus.
  for (let press = 0; press < 8; press += 1) {
    const focused = await archiveLink.evaluate(
      (element) => element === document.activeElement,
    )
    if (focused) break
    await page.keyboard.press('Tab')
  }

  await expect(archiveLink).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/archive$/)
  await expect(page.getByRole('heading', { level: 1, name: '归档' })).toBeVisible()
})

test('主题切换按钮可用键盘操作', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')

  const toggle = page.getByRole('button', { name: '切换到深色模式' })

  for (let press = 0; press < 10; press += 1) {
    const focused = await toggle.evaluate(
      (element) => element === document.activeElement,
    )
    if (focused) break
    await page.keyboard.press('Tab')
  }

  await expect(toggle).toBeFocused()
  await page.keyboard.press('Space')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
