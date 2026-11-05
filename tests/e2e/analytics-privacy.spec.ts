import { expect, test } from '@playwright/test'

const publicPaths = [
  '/',
  '/posts/why-i-started-one-person-delivery-notes',
  '/privacy',
]

test('公开页面默认只加载无 Cookie 统计，百度统计等待明确同意', async ({
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

    // 百度统计必须由访客明确同意后才在客户端插入，SSR HTML 只保留门控标记。
    expect(html).toContain('data-baidu-analytics="consent-required"')
    expect(html).not.toMatch(/<script[^>]*id="baidu-tongji"/)
    expect(html).not.toContain('hm.baidu.com/hm.js')

    // 统计脚本挂在正文之后且外部脚本使用 defer，不会阻塞正文渲染。
    const contentIndex = html.indexOf('<main')
    expect(contentIndex, `${path} 缺少正文`).toBeGreaterThan(-1)
    expect(html.indexOf('id="cloudflare-web-analytics"')).toBeGreaterThan(
      contentIndex,
    )
  }
})

test('百度统计只在点击允许后加载，并把选择保存到 localStorage', async ({
  page,
}) => {
  const baiduRequests: string[] = []
  await page.route(/hm\.baidu\.com/, (route) => route.abort())
  page.on('request', (request) => {
    if (request.url().includes('hm.baidu.com')) {
      baiduRequests.push(request.url())
    }
  })

  await page.goto('/')

  const consent = page.getByRole('complementary', {
    name: /Cloudflare Web Analytics/,
  })
  await expect(consent).toBeVisible()
  await expect(page.locator('script#baidu-tongji')).toHaveCount(0)
  expect(baiduRequests).toEqual([])

  await page.getByRole('button', { name: '允许百度统计' }).click()

  const script = page.locator('script#baidu-tongji')
  await expect(script).toHaveCount(1)
  await expect(script).toHaveAttribute('src', /hm\.baidu\.com\/hm\.js\?/)
  await expect(script).toHaveAttribute('async', '')
  expect(baiduRequests.length).toBeGreaterThan(0)
  expect(
    await page.evaluate(() => window.localStorage.getItem('analytics-consent')),
  ).toBe('granted')

  await page.reload()
  await expect(page.locator('script#baidu-tongji')).toHaveCount(1)
  await expect(consent).toHaveCount(0)
})

test('拒绝百度统计后不再加载，也不会再次提示', async ({ page }) => {
  const baiduRequests: string[] = []
  await page.route(/hm\.baidu\.com/, (route) => route.abort())
  page.on('request', (request) => {
    if (request.url().includes('hm.baidu.com')) {
      baiduRequests.push(request.url())
    }
  })

  await page.goto('/')
  await page.getByRole('button', { name: '仅使用无 Cookie 统计' }).click()

  const consent = page.getByRole('complementary', {
    name: /Cloudflare Web Analytics/,
  })
  await expect(consent).toHaveCount(0)
  await expect(page.locator('script#baidu-tongji')).toHaveCount(0)
  expect(baiduRequests).toEqual([])
  expect(
    await page.evaluate(() => window.localStorage.getItem('analytics-consent')),
  ).toBe('denied')

  await page.reload()
  await expect(consent).toHaveCount(0)
  await expect(page.locator('script#baidu-tongji')).toHaveCount(0)
})

test('隐私页说明统计、评论与公众号订阅的数据范围', async ({ page }) => {
  // 外部统计与评论服务不在测试中真实加载。
  await page.route(/cloudflareinsights\.com|hm\.baidu\.com|giscus\.app/, (route) =>
    route.abort(),
  )

  const homeResponse = await page.goto('/')
  expect(homeResponse?.status()).toBe(200)
  await page
    .getByRole('contentinfo')
    .getByRole('link', { name: '隐私说明' })
    .click()
  await expect(page).toHaveURL(/\/privacy$/)

  const response = await page.goto('/privacy')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('隐私说明')

  const main = page.locator('main')
  await expect(main).toContainText('Cloudflare Web Analytics')
  await expect(main).toContainText('Cloudflare Web Analytics 不使用 Cookie')
  await expect(main).toContainText('百度统计')
  await expect(main).toContainText('百度统计会使用 Cookie')
  await expect(main).toContainText('只有在你明确同意后')
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
