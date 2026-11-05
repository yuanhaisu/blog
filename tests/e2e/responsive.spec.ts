import { expect, test, type Page } from '@playwright/test'

const viewports = [
  { name: '手机 360px', width: 360, height: 800 },
  { name: '平板 768px', width: 768, height: 1024 },
  { name: '桌面 1440px', width: 1440, height: 900 },
]

const routes = [
  { path: '/', heading: /一人交付笔记/ },
  { path: '/archive', heading: '归档' },
  { path: '/about', heading: /袁海粟/ },
  {
    path: '/posts/fixture-manifesto',
    heading: /测试夹具：一人交付笔记开篇/,
  },
  {
    path: '/posts/fixture-code-and-toc',
    heading: /测试夹具：目录、代码块与阅读体验/,
  },
]

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
  }))
}

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test('关键页面无横向滚动，导航可用', async ({ page }) => {
      for (const route of routes) {
        const response = await page.goto(route.path)
        expect(response?.status(), `访问 ${route.path} 应返回 200`).toBe(200)

        await expect(
          page.getByRole('heading', { level: 1, name: route.heading }),
        ).toBeVisible()

        const overflow = await horizontalOverflow(page)
        expect(
          overflow.documentWidth,
          `${route.path} 在 ${viewport.width}px 下不应出现横向滚动`,
        ).toBeLessThanOrEqual(overflow.documentClientWidth + 1)
        expect(
          overflow.bodyWidth,
          `${route.path} 在 ${viewport.width}px 下 body 不应出现横向滚动`,
        ).toBeLessThanOrEqual(overflow.bodyClientWidth + 1)

        const navigation = page.getByRole('navigation', { name: '主导航' })
        await expect(navigation).toBeVisible()
        await expect(
          page.getByRole('button', { name: /切换到(浅色|深色)模式/ }),
        ).toBeVisible()
      }
    })
  })
}
