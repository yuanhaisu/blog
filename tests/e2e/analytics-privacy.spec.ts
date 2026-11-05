import { expect, test } from '@playwright/test'

const publicPaths = [
  '/',
  '/posts/why-i-started-one-person-delivery-notes',
  '/privacy',
]

test('所有公开页面加载统计配置，且统计脚本不阻塞正文渲染', async ({
  request,
}) => {
  for (const path of publicPaths) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    const html = await response.text()

    const cloudflareTag = html.match(
      /<script[^>]*id="cloudflare-web-analytics"[^>]*>/,
    )
    expect(cloudflareTag, `${path} 缺少 Cloudflare Web Analytics`).not.toBeNull()
    expect(cloudflareTag![0]).toContain(
      'https://static.cloudflareinsights.com/beacon.min.js',
    )
    expect(cloudflareTag![0]).toContain('defer')
    expect(cloudflareTag![0]).toContain('data-cf-beacon')
    expect(decodeHtmlAttribute(cloudflareTag![0])).toMatch(
      /"token":"[A-Za-z0-9_-]+"/,
    )

    const baiduScript = html.match(
      /<script[^>]*id="baidu-tongji"[^>]*>([\s\S]*?)<\/script>/,
    )
    expect(baiduScript, `${path} 缺少百度统计`).not.toBeNull()
    expect(baiduScript![1]).toMatch(
      /https:\/\/hm\.baidu\.com\/hm\.js\?[A-Za-z0-9_-]+/,
    )
    expect(baiduScript![1]).toContain('async')

    // 两个统计脚本都挂在正文之后，且外部脚本使用 defer / 动态 async，
    // 因此不会阻塞正文渲染。
    const contentIndex = html.indexOf('<main')
    expect(contentIndex, `${path} 缺少正文`).toBeGreaterThan(-1)
    expect(html.indexOf('id="cloudflare-web-analytics"')).toBeGreaterThan(
      contentIndex,
    )
    expect(html.indexOf('id="baidu-tongji"')).toBeGreaterThan(contentIndex)
  }
})

test('隐私页说明统计、评论与公众号订阅的数据范围', async ({ page }) => {
  // 外部统计与评论服务不在测试中真实加载。
  await page.route(/cloudflareinsights\.com|hm\.baidu\.com|giscus\.app/, (route) =>
    route.abort(),
  )

  const homeResponse = await page.goto('/')
  expect(homeResponse?.status()).toBe(200)
  await page.getByRole('link', { name: '隐私说明' }).click()
  await expect(page).toHaveURL(/\/privacy$/)

  const response = await page.goto('/privacy')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('隐私说明')

  const main = page.locator('main')
  await expect(main).toContainText('Cloudflare Web Analytics')
  await expect(main).toContainText('Cloudflare Web Analytics 不使用 Cookie')
  await expect(main).toContainText('百度统计')
  await expect(main).toContainText('百度统计会使用 Cookie')
  await expect(main).toContainText('IP 地址')
  await expect(main).toContainText('Giscus')
  await expect(main).toContainText('GitHub Discussions')
  await expect(main).toContainText('GitHub 账号')
  await expect(main).toContainText('微信公众号')
  await expect(main).toContainText('订阅')
  await expect(main).toContainText('不阻塞')
  await expect(main).toContainText('知乎')
})

function decodeHtmlAttribute(tag: string) {
  return tag
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
}
