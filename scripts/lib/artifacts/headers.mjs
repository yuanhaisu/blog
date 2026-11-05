import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { assert } from './context.mjs'
import { pathExists } from './source.mjs'

function parseCsp(header) {
  const directives = new Map()
  for (const part of header.split(';')) {
    const [name, ...values] = part.trim().split(/\s+/)
    if (name) directives.set(name, values)
  }
  return directives
}

export async function validateHeaders(rootDir) {
  const path = join(rootDir, '_headers')
  if (!(await pathExists(path))) {
    assert(false, '_headers 缺失')
    return
  }

  const text = await readFile(path, 'utf8')
  const hsts = /Strict-Transport-Security:\s*([^\n]+)/i.exec(text)?.[1] ?? ''
  assert(/max-age=(?:31536000|63072000)/.test(hsts), '_headers HSTS max-age 不足')
  assert(hsts.includes('includeSubDomains'), '_headers HSTS 缺少 includeSubDomains')

  const cspHeader =
    /Content-Security-Policy:\s*([^\n]+)/i.exec(text)?.[1] ?? ''
  assert(Boolean(cspHeader), '_headers 缺少 CSP')
  const csp = parseCsp(cspHeader)

  const scriptSrc = csp.get('script-src') ?? []
  for (const source of [
    "'self'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    'https://giscus.app',
    'https://static.cloudflareinsights.com',
    'https://hm.baidu.com',
  ]) {
    assert(scriptSrc.includes(source), `CSP script-src 缺少 ${source}`)
  }
  assert(
    (csp.get('frame-src') ?? []).includes('https://giscus.app'),
    'CSP frame-src 缺少 Giscus',
  )
  assert(
    (csp.get('connect-src') ?? []).includes('https://cloudflareinsights.com'),
    'CSP connect-src 缺少 Cloudflare Analytics',
  )
  assert(
    (csp.get('font-src') ?? []).includes("'self'"),
    'CSP font-src 缺少 self（字体自托管）',
  )
  assert(
    !(csp.get('font-src') ?? []).some((source) =>
      /fonts\.(?:googleapis|gstatic)\.com/.test(source),
    ),
    'CSP font-src 不应包含 Google Fonts（字体自托管）',
  )
  assert(
    !(csp.get('style-src') ?? []).some((source) =>
      /fonts\.googleapis\.com/.test(source),
    ),
    'CSP style-src 不应包含 Google Fonts（字体自托管）',
  )
  assert(
    (csp.get('worker-src') ?? []).includes("'self'") &&
      (csp.get('worker-src') ?? []).includes('blob:'),
    'CSP worker-src 缺少 Pagefind worker 来源',
  )
  assert((csp.get('object-src') ?? []).includes("'none'"), 'CSP object-src 应为 none')
  assert(
    (csp.get('frame-ancestors') ?? []).includes("'none'"),
    'CSP frame-ancestors 应为 none',
  )

  for (const header of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy:',
    'Permissions-Policy:',
  ]) {
    assert(text.includes(header), `_headers 缺少 ${header}`)
  }

  return 'HSTS + CSP'
}
