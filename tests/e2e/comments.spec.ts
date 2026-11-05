import { expect, test } from '@playwright/test'

const articlePath = '/posts/fixture-manifesto'

test('文章页包含 Giscus 配置与国内读者讨论入口', async ({
  page,
  request,
}) => {
  await page.route('https://giscus.app/**', (route) => route.abort())
  const response = await request.get(articlePath)
  expect(response.status()).toBe(200)
  const html = await response.text()

  const section = html.match(/<section[^>]*id="comments"[^>]*>/)
  expect(section, '文章页缺少评论容器').not.toBeNull()
  expect(section![0]).toContain('data-giscus-repo="yuanhaisu/blog"')
  expect(section![0]).toContain(
    'data-giscus-repo-id="REPLACE_WITH_GISCUS_REPO_ID"',
  )
  expect(section![0]).toContain('data-giscus-category="Announcements"')
  expect(section![0]).toContain(
    'data-giscus-category-id="REPLACE_WITH_GISCUS_CATEGORY_ID"',
  )

  // 评论脚本不进入首屏 HTML，只保留配置。
  expect(html).not.toMatch(/<script[^>]+src="https:\/\/giscus\.app\/client\.js"/)

  await page.goto(articlePath)
  const comments = page.locator('#comments')
  await expect(comments.getByRole('heading', { name: '评论' })).toBeVisible()
  await expect(comments).toContainText('知乎')
  await expect(comments).toContainText('微信公众号')
})

test('评论在点击交互后才加载 Giscus 脚本', async ({ page }) => {
  const giscusRequests: string[] = []
  await page.route('https://giscus.app/**', (route) => route.abort())
  page.on('request', (request) => {
    if (request.url().startsWith('https://giscus.app/')) {
      giscusRequests.push(request.url())
    }
  })

  await page.goto(articlePath)
  const comments = page.locator('#comments')
  await expect(comments).toBeVisible()

  const script = page.locator('script[src="https://giscus.app/client.js"]')
  await expect(script).toHaveCount(0)
  expect(giscusRequests).toEqual([])

  const loadButton = comments.getByRole('button', { name: '加载评论' })
  await expect(loadButton).toBeVisible()
  await loadButton.dispatchEvent('click')

  await expect(script).toHaveCount(1)
  await expect(script).toHaveAttribute('data-repo', 'yuanhaisu/blog')
  await expect(script).toHaveAttribute(
    'data-repo-id',
    'REPLACE_WITH_GISCUS_REPO_ID',
  )
  await expect(script).toHaveAttribute('data-category', 'Announcements')
  await expect(script).toHaveAttribute(
    'data-category-id',
    'REPLACE_WITH_GISCUS_CATEGORY_ID',
  )
  await expect(script).toHaveAttribute('data-mapping', 'pathname')
  await expect(script).toHaveAttribute('data-lang', 'zh-CN')
  await expect(script).toHaveAttribute('async', '')
})

test('评论在进入视口后自动加载 Giscus 脚本', async ({ page }) => {
  await page.route('https://giscus.app/**', (route) => route.abort())
  await page.goto(articlePath)

  const script = page.locator('script[src="https://giscus.app/client.js"]')
  await expect(script).toHaveCount(0)

  await page.locator('#comments').scrollIntoViewIfNeeded()
  await expect(script).toHaveCount(1)
})

test('Giscus 加载失败时显示 GitHub Discussions 兜底链接', async ({
  page,
}) => {
  await page.route('https://giscus.app/**', (route) => route.abort())
  await page.goto(articlePath)

  const comments = page.locator('#comments')
  const loadButton = comments.getByRole('button', { name: '加载评论' })
  await expect(loadButton).toBeVisible()
  await loadButton.dispatchEvent('click')

  await expect(comments).toHaveAttribute('data-giscus-state', 'error')

  const failure = comments.locator('.post-comments-error')
  await expect(failure).toBeVisible()
  await expect(
    failure.getByRole('link', { name: 'GitHub Discussions' }),
  ).toHaveAttribute('href', 'https://github.com/yuanhaisu/blog/discussions')
})

test.describe('禁用 JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('SSR 输出评论不可用说明与 GitHub Discussions 链接', async ({
    page,
    request,
  }) => {
    const htmlResponse = await request.get(articlePath)
    expect(htmlResponse.status()).toBe(200)
    const html = await htmlResponse.text()

    // <noscript> 是禁用 JavaScript 时的标准兜底；Playwright 的
    // javaScriptEnabled=false 只停止脚本执行，不会重新启用 noscript 渲染，
    // 因此这里断言构建产物中的兜底内容与链接。
    const fallback = html.match(/<noscript>([\s\S]*?)<\/noscript>/)
    expect(fallback, '缺少 noscript 评论兜底').not.toBeNull()
    expect(fallback![1]).toContain('评论需要启用 JavaScript 才能加载。')
    expect(fallback![1]).toContain(
      'https://github.com/yuanhaisu/blog/discussions',
    )

    // 评论容器与国内读者入口本身由服务端渲染，无 JavaScript 时仍可读。
    const response = await page.goto(articlePath)
    expect(response?.status()).toBe(200)

    const comments = page.locator('#comments')
    await expect(comments).toBeVisible()
    await expect(comments.getByRole('heading', { name: '评论' })).toBeVisible()
    await expect(comments).toContainText('知乎')
    await expect(comments).toContainText('微信公众号')

    // 懒加载按钮依赖客户端脚本，无 JavaScript 时不应出现。
    await expect(
      comments.getByRole('button', { name: '加载评论' }),
    ).toHaveCount(0)
  })
})

test('评论主题跟随系统明暗模式', async ({ page }) => {
  await page.route('https://giscus.app/**', (route) => route.abort())
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto(articlePath)

  const comments = page.locator('#comments')
  await expect(comments).toHaveAttribute('data-giscus-theme', 'dark')

  const loadButton = comments.getByRole('button', { name: '加载评论' })
  await expect(loadButton).toBeVisible()
  await loadButton.dispatchEvent('click')

  const script = page.locator('script[src="https://giscus.app/client.js"]')
  await expect(script).toHaveAttribute('data-theme', 'dark')

  // 系统主题切换后，已插入的脚本与容器都跟着更新。
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(comments).toHaveAttribute('data-giscus-theme', 'light')
  await expect(script).toHaveAttribute('data-theme', 'light')
})

test('评论主题跟随站点 data-theme 切换', async ({ page }) => {
  await page.route('https://giscus.app/**', (route) => route.abort())
  await page.goto(articlePath)

  const comments = page.locator('#comments')
  await expect(comments).toHaveAttribute('data-giscus-theme', 'light')

  await comments
    .getByRole('button', { name: '加载评论' })
    .dispatchEvent('click')
  const script = page.locator('script[src="https://giscus.app/client.js"]')
  await expect(script).toHaveAttribute('data-theme', 'light')

  await page.getByRole('button', { name: '切换到深色模式' }).click()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(comments).toHaveAttribute('data-giscus-theme', 'dark')
  await expect(script).toHaveAttribute('data-theme', 'dark')
})
