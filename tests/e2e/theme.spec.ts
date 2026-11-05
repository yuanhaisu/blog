import { expect, test, type Page } from '@playwright/test'

/**
 * Read the page background as relative luminance so assertions describe
 * "light vs dark" instead of pinning exact palette values.
 */
async function backgroundLuminance(page: Page): Promise<number> {
  return page.evaluate(() => {
    const value = getComputedStyle(document.documentElement).backgroundColor
    const channels = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []
    const [r = 0, g = 0, b = 0] = channels
    const linear = (channel: number) => {
      const normalized = channel / 255
      return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
  })
}

async function storedTheme(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    try {
      return window.localStorage.getItem('theme')
    } catch {
      return null
    }
  })
}

test('未设置偏好时跟随 prefers-color-scheme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')

  const toggle = page.getByRole('button', { name: '切换到浅色模式' })
  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => backgroundLuminance(page)).toBeLessThan(0.2)

  await page.emulateMedia({ colorScheme: 'light' })

  await expect(page.getByRole('button', { name: '切换到深色模式' })).toBeVisible()
  await expect
    .poll(() => backgroundLuminance(page))
    .toBeGreaterThan(0.7)
})

test('切换后持久化，并覆盖系统偏好', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')

  const darkToggle = page.getByRole('button', { name: '切换到深色模式' })
  await darkToggle.focus()
  await page.keyboard.press('Enter')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect
    .poll(() => backgroundLuminance(page))
    .toBeLessThan(0.2)
  await expect(page.getByRole('button', { name: '切换到浅色模式' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(await storedTheme(page)).toBe('dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() => backgroundLuminance(page)).toBeLessThan(0.2)
  expect(await storedTheme(page)).toBe('dark')

  // An explicit choice must not be overridden by the operating system.
  await page.emulateMedia({ colorScheme: 'light' })
  await expect.poll(() => backgroundLuminance(page)).toBeLessThan(0.2)

  await page.getByRole('button', { name: '切换到浅色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect.poll(() => backgroundLuminance(page)).toBeGreaterThan(0.7)
  expect(await storedTheme(page)).toBe('light')

  await page.reload()
  await expect.poll(() => backgroundLuminance(page)).toBeGreaterThan(0.7)

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => backgroundLuminance(page)).toBeGreaterThan(0.7)
})

test('已保存的偏好优先于系统深色模式', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('theme', 'light')
  })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect.poll(() => backgroundLuminance(page)).toBeGreaterThan(0.7)
  await expect(page.getByRole('button', { name: '切换到深色模式' })).toBeVisible()
})
