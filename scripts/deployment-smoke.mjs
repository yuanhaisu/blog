#!/usr/bin/env node
/**
 * Deployment smoke test for the static blog.
 *
 * Local mode (default):
 *   - verifies the generated deployment artifacts in .output/public
 *   - serves them through the Cloudflare Pages emulator in tests/static-server.mjs
 *   - checks GET / for 200 + HSTS + CSP
 *   - checks the www Host redirect for 301 + preserved path/query
 *
 * Live mode (SMOKE_BASE_URL=https://<preview>.pages.dev or https://yuanhaisu.com):
 *   - requires HTTPS
 *   - checks 200 + HSTS + CSP on the live origin
 *   - for SMOKE_BASE_URL=https://yuanhaisu.com (or SMOKE_CHECK_WWW=1), checks
 *     https://www.yuanhaisu.com/ -> 301 https://yuanhaisu.com/ and
 *     http://yuanhaisu.com/ -> 301/308 https://yuanhaisu.com/
 *
 * The Cloudflare account-side configuration (DNS, Bulk Redirects, Always Use
 * HTTPS, Pages project) cannot be created from this repository. See
 * docs/deployment.md. This script never reads or prints credentials.
 */
import { access, readFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { resolve } from 'node:path'
import {
  createStaticServer,
  hostRedirect,
} from '../tests/static-server.mjs'

const root = resolve('.output/public')
const redirectConfigPath = resolve('cloudflare/www-redirect.json')
const failures = []

function check(condition, message, detail = '') {
  if (condition) {
    console.log(`  ok   ${message}`)
    return
  }
  const suffix = detail ? ` (${detail})` : ''
  console.log(`  FAIL ${message}${suffix}`)
  failures.push(message)
}

function parseCsp(header) {
  const directives = new Map()
  for (const part of (header ?? '').split(';')) {
    const [name, ...values] = part.trim().split(/\s+/)
    if (name) directives.set(name, values)
  }
  return directives
}

function request(baseURL, path, headers = {}) {
  const url = new URL(baseURL)
  return new Promise((resolvePromise, reject) => {
    const req = httpRequest(
      {
        hostname: url.hostname,
        port: url.port,
        path,
        headers,
        timeout: 10_000,
      },
      (response) => {
        response.resume()
        response.on('end', () =>
          resolvePromise({
            status: response.statusCode ?? 0,
            headers: response.headers,
          }),
        )
      },
    )
    req.on('timeout', () => req.destroy(new Error('request timed out')))
    req.on('error', reject)
    req.end()
  })
}

function checkHeaders(headers, label) {
  const hsts = headers['strict-transport-security']
  const cspHeader = headers['content-security-policy']
  const csp = parseCsp(cspHeader)

  check(
    typeof hsts === 'string' &&
      /max-age=(?:31536000|63072000)(?:;|\s|$)/.test(hsts) &&
      hsts.includes('includeSubDomains'),
    `${label}: HSTS present with long max-age and includeSubDomains`,
  )
  check(Boolean(cspHeader), `${label}: CSP present`)
  check(
    (csp.get('script-src') ?? []).includes("'unsafe-inline'") &&
      (csp.get('script-src') ?? []).includes("'wasm-unsafe-eval'"),
    `${label}: CSP allows Nuxt inline bootstrap and Pagefind WASM`,
  )
  check(
    (csp.get('script-src') ?? []).includes('https://giscus.app') &&
      (csp.get('frame-src') ?? []).includes('https://giscus.app'),
    `${label}: CSP allows Giscus script and iframe`,
  )
  check(
    (csp.get('script-src') ?? []).includes(
      'https://static.cloudflareinsights.com',
    ) &&
      (csp.get('connect-src') ?? []).includes(
        'https://cloudflareinsights.com',
      ) &&
      (csp.get('script-src') ?? []).includes('https://hm.baidu.com'),
    `${label}: CSP allows Cloudflare Web Analytics and Baidu Analytics`,
  )
  check(
    (csp.get('font-src') ?? []).includes("'self'") &&
      !(csp.get('font-src') ?? []).some((source) =>
        /fonts\.(?:googleapis|gstatic)\.com/.test(source),
      ) &&
      !(csp.get('style-src') ?? []).some((source) =>
        /fonts\.googleapis\.com/.test(source),
      ),
    `${label}: CSP keeps fonts self-hosted`,
  )
  check(
    (csp.get('worker-src') ?? []).includes("'self'") &&
      (csp.get('worker-src') ?? []).includes('blob:'),
    `${label}: CSP allows Pagefind workers`,
  )
}

async function checkLocalArtifacts() {
  console.log('Local build artifacts')

  try {
    await access(resolve(root, 'index.html'))
    await access(resolve(root, '_headers'))
  } catch {
    check(false, '.output/public exists with _headers (run npm run build)')
    return
  }
  check(true, '.output/public exists with _headers')

  let config
  try {
    config = JSON.parse(await readFile(redirectConfigPath, 'utf8'))
  } catch {
    check(false, 'cloudflare/www-redirect.json is readable JSON')
    return
  }

  const rule = config.www_redirect ?? {}
  check(
    config.canonical_origin === 'https://yuanhaisu.com' &&
      config.always_use_https === true,
    'config declares apex canonical origin and Always Use HTTPS',
  )
  check(
    rule.source_url === 'www.yuanhaisu.com' &&
      rule.target_url === 'https://yuanhaisu.com' &&
      Number(rule.status_code) === 301,
    'config declares www -> https://yuanhaisu.com with 301',
  )
  check(
    rule.preserve_query_string === true &&
      rule.subpath_matching === true &&
      rule.preserve_path_suffix === true,
    'config preserves www path and query string',
  )
  check(
    config.dns?.name === 'www' &&
      config.dns?.proxied === true &&
      typeof config.dns?.content === 'string',
    'config documents a proxied www DNS record',
  )

  const expectedRedirect = hostRedirect(
    config,
    'www.yuanhaisu.com',
    '/posts/example?from=smoke',
  )
  check(
    expectedRedirect?.status === 301 &&
      expectedRedirect.location ===
        'https://yuanhaisu.com/posts/example?from=smoke',
    'redirect config produces the expected 301 location',
  )

  const server = createStaticServer(root)
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolvePromise)
  })
  const { port } = server.address()
  const baseURL = `http://127.0.0.1:${port}`

  try {
    const response = await request(baseURL, '/')
    check(response.status === 200, 'GET / -> 200')
    checkHeaders(response.headers, 'GET /')

    const www = await request(baseURL, '/posts/example?from=smoke', {
      host: 'www.yuanhaisu.com',
    })
    check(
      www.status === 301 &&
        www.headers.location ===
          'https://yuanhaisu.com/posts/example?from=smoke',
      'Host www.yuanhaisu.com -> 301 apex with path and query preserved',
    )
  } finally {
    await new Promise((resolvePromise) => server.close(resolvePromise))
  }
}

async function checkLive(baseURL) {
  console.log(`Live deployment: ${baseURL}`)

  if (!baseURL.startsWith('https://')) {
    check(false, 'SMOKE_BASE_URL must be an HTTPS URL')
    return
  }

  let response
  try {
    response = await fetch(`${baseURL}/`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    check(false, `GET ${baseURL}/ is reachable`, error.message)
    return
  }

  check(response.status === 200, `GET ${baseURL}/ -> 200`, `got ${response.status}`)
  checkHeaders(
    {
      'strict-transport-security': response.headers.get(
        'strict-transport-security',
      ),
      'content-security-policy': response.headers.get(
        'content-security-policy',
      ),
    },
    `GET ${baseURL}/`,
  )

  if (
    baseURL === 'https://yuanhaisu.com' ||
    process.env.SMOKE_CHECK_WWW === '1'
  ) {
    try {
      const httpResponse = await fetch('http://yuanhaisu.com/', {
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      })
      const httpLocation = httpResponse.headers.get('location') ?? ''
      check(
        [301, 308].includes(httpResponse.status) &&
          httpLocation.startsWith('https://yuanhaisu.com/'),
        'http://yuanhaisu.com/ forces HTTPS',
        `got ${httpResponse.status} ${httpLocation}`,
      )
    } catch (error) {
      check(false, 'http://yuanhaisu.com/ forces HTTPS', error.message)
    }

    try {
      const wwwResponse = await fetch('https://www.yuanhaisu.com/', {
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      })
      const wwwLocation = wwwResponse.headers.get('location') ?? ''
      check(
        wwwResponse.status === 301 &&
          wwwLocation.startsWith('https://yuanhaisu.com/'),
        'https://www.yuanhaisu.com/ -> 301 https://yuanhaisu.com/',
        `got ${wwwResponse.status} ${wwwLocation}`,
      )
    } catch (error) {
      check(
        false,
        'https://www.yuanhaisu.com/ -> 301 https://yuanhaisu.com/',
        error.message,
      )
    }
  }
}

await checkLocalArtifacts()

const liveBaseURL = process.env.SMOKE_BASE_URL?.replace(/\/+$/, '')
if (liveBaseURL) {
  await checkLive(liveBaseURL)
}

if (failures.length) {
  console.error(`\nFAIL: ${failures.length} deployment check(s) failed.`)
  process.exitCode = 1
} else {
  console.log(
    '\nPASS: local deployment artifacts are valid.' +
      (liveBaseURL ? ' Live deployment checks passed.' : ''),
  )
  console.log(
    'Account-side checks still require the Cloudflare account: Pages project, ' +
      'custom domains, Always Use HTTPS, and the www Bulk Redirect. ' +
      'See docs/deployment.md.',
  )
}
