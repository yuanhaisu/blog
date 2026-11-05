import { expect, test } from '@playwright/test'
import { request as httpRequest } from 'node:http'

function parseCsp(header: string) {
  const directives = new Map<string, string[]>()

  for (const part of header.split(';')) {
    const [name, ...values] = part.trim().split(/\s+/)
    if (name) directives.set(name, values)
  }

  return directives
}

test('部署响应包含 HSTS 与 CSP', async ({ request }) => {
  const response = await request.get('/')

  expect(response.status()).toBe(200)

  const headers = response.headers()
  expect(headers['strict-transport-security']).toMatch(
    /max-age=(?:31536000|63072000)(?:;|\s|$)/,
  )
  expect(headers['strict-transport-security']).toContain('includeSubDomains')
  expect(headers['content-security-policy']).toBeTruthy()
})

test('CSP 允许 Giscus、统计、字体与站内搜索所需来源', async ({ request }) => {
  const response = await request.get('/')
  const csp = response.headers()['content-security-policy']
  const directives = parseCsp(csp)

  expect(directives.get('script-src')).toEqual(
    expect.arrayContaining([
      "'self'",
      "'unsafe-inline'",
      "'wasm-unsafe-eval'",
      'https://giscus.app',
      'https://static.cloudflareinsights.com',
      'https://hm.baidu.com',
    ]),
  )
  expect(directives.get('frame-src')).toContain('https://giscus.app')
  expect(directives.get('connect-src')).toEqual(
    expect.arrayContaining([
      "'self'",
      'https://giscus.app',
      'https://cloudflareinsights.com',
      'https://hm.baidu.com',
    ]),
  )
  expect(directives.get('font-src')).toEqual(
    expect.arrayContaining(["'self'", 'data:']),
  )
  expect(directives.get('font-src')).not.toContain('https://fonts.gstatic.com')
  expect(directives.get('style-src')).toEqual(
    expect.arrayContaining(["'self'"]),
  )
  expect(directives.get('style-src')).not.toContain(
    'https://fonts.googleapis.com',
  )
  expect(directives.get('worker-src')).toEqual(
    expect.arrayContaining(["'self'", 'blob:']),
  )
  expect(directives.get('img-src')).toEqual(
    expect.arrayContaining(["'self'", 'data:', 'https://hm.baidu.com']),
  )
  expect(directives.get('object-src')).toEqual(["'none'"])
  expect(directives.get('frame-ancestors')).toEqual(["'none'"])
})

test('CSP 不阻断站点自身的脚本与样式', async ({ page }) => {
  await page.addInitScript(() => {
    const violations: string[] = []
    ;(window as unknown as { __cspViolations: string[] }).__cspViolations =
      violations
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective} ${event.blockedURI}`)
    })
  })

  await page.goto('/')
  await page.waitForFunction(() =>
    Boolean(
      (
        document.querySelector('#__nuxt') as
          | (Element & { __vue_app__?: unknown })
          | null
      )?.__vue_app__,
    ),
  )

  const violations = await page.evaluate(
    () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
  )
  expect(violations).toEqual([])
})

function requestWithHost(baseURL: string, host: string, path: string) {
  const url = new URL(baseURL)

  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined> }>(
    (resolve, reject) => {
      const request = httpRequest(
        {
          hostname: url.hostname,
          port: url.port,
          path,
          headers: { host },
        },
        (response) => {
          response.resume()
          response.on('end', () =>
            resolve({
              status: response.statusCode ?? 0,
              headers: response.headers,
            }),
          )
        },
      )
      request.on('error', reject)
      request.end()
    },
  )
}

test('www 主机 301 跳转到 apex 并保留路径与查询串', async ({}, testInfo) => {
  const baseURL =
    (testInfo.project.use.baseURL as string | undefined) ??
    'http://127.0.0.1:4173'

  const response = await requestWithHost(
    baseURL,
    'www.yuanhaisu.com',
    '/posts/why-i-started-one-person-delivery-notes?from=wechat',
  )

  expect(response.status).toBe(301)
  expect(response.headers.location).toBe(
    'https://yuanhaisu.com/posts/why-i-started-one-person-delivery-notes?from=wechat',
  )
})
