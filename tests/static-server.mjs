import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRedirectConfigPath = new URL(
  '../cloudflare/www-redirect.json',
  import.meta.url,
)

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
}

async function fileStats(path) {
  try {
    return await stat(path)
  } catch {
    return null
  }
}

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return ''
  }
}

async function loadRedirectConfig(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Emulate a Cloudflare Bulk Redirects entry locally. Cloudflare Pages
 * `_redirects` cannot match by host, so the www-to-apex rule lives in the
 * account-side config and this function mirrors its documented behavior.
 */
export function hostRedirect(config, hostHeader, requestUrl) {
  const rule = config?.www_redirect
  if (!rule || !rule.source_url || !rule.target_url) return null

  const source = new URL(
    /^https?:\/\//i.test(rule.source_url)
      ? rule.source_url
      : `https://${rule.source_url}`,
  )
  const host = (hostHeader ?? '').replace(/:\d+$/, '').toLowerCase()
  const hostMatches =
    host === source.hostname.toLowerCase() ||
    (rule.include_subdomains === true &&
      host.endsWith(`.${source.hostname.toLowerCase()}`))
  if (!hostMatches) return null

  const request = new URL(requestUrl, 'http://localhost')
  const sourcePath =
    source.pathname === '/' ? '' : source.pathname.replace(/\/+$/, '')
  let suffix = request.pathname

  if (sourcePath) {
    if (request.pathname === sourcePath) {
      suffix = ''
    } else if (
      rule.subpath_matching === true &&
      request.pathname.startsWith(`${sourcePath}/`)
    ) {
      suffix = request.pathname.slice(sourcePath.length)
    } else {
      return null
    }
  }

  const target = new URL(rule.target_url)
  let destinationPath = target.pathname

  if (rule.preserve_path_suffix === true && suffix) {
    destinationPath = `${destinationPath.replace(/\/+$/, '')}${suffix}`
  }
  if (!destinationPath.startsWith('/')) destinationPath = `/${destinationPath}`
  if (!destinationPath) destinationPath = '/'

  target.pathname = destinationPath
  if (rule.preserve_query_string === true) {
    target.search = request.search
  }

  return {
    status: Number(rule.status_code) || 301,
    location: target.href,
  }
}

/**
 * Parse a Cloudflare Pages `_headers` file into rules.
 * A rule is a non-indented path pattern followed by indented `Name: value`
 * lines. Lines starting with `#` are comments.
 */
export async function loadHeaderRules(root) {
  const source = await readOptional(join(root, '_headers'))
  const rules = []
  let current = null

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    if (/^\s/.test(rawLine)) {
      if (!current) continue
      const separator = line.indexOf(':')
      if (separator === -1) continue
      current.headers.push([
        line.slice(0, separator).trim().toLowerCase(),
        line.slice(separator + 1).trim(),
      ])
      continue
    }

    current = { pattern: line, headers: [] }
    rules.push(current)
  }

  return rules.map((rule) => ({
    matcher: headerPatternToRegExp(rule.pattern),
    headers: rule.headers,
  }))
}

function headerPatternToRegExp(pattern) {
  let pathname = pattern
  if (/^https?:\/\//.test(pathname)) {
    pathname = new URL(pathname).pathname
  }
  const escaped = pathname.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`)
}

function headersForPath(rules, pathname) {
  const headers = {}

  for (const rule of rules) {
    if (!rule.matcher.test(pathname)) continue
    for (const [name, value] of rule.headers) {
      headers[name] = headers[name] ? `${headers[name]}, ${value}` : value
    }
  }

  return headers
}

export function createStaticServer(
  root,
  { redirectConfigPath = defaultRedirectConfigPath } = {},
) {
  const resolvedRoot = resolve(root)
  const headerRulesPromise = loadHeaderRules(resolvedRoot)
  const redirectConfigPromise = loadRedirectConfig(redirectConfigPath)

  return createServer(async (req, res) => {
    try {
      const redirect = hostRedirect(
        await redirectConfigPromise,
        req.headers.host,
        req.url ?? '/',
      )
      if (redirect) {
        res.writeHead(redirect.status, {
          location: redirect.location,
          'content-length': 0,
        })
        res.end()
        return
      }

      const pathname = decodeURIComponent(
        new URL(req.url ?? '/', 'http://localhost').pathname,
      )
      const headerRules = await headerRulesPromise
      let filePath = resolve(join(resolvedRoot, pathname))

      if (
        filePath !== resolvedRoot &&
        !filePath.startsWith(resolvedRoot + sep)
      ) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('Forbidden')
        return
      }

      let info = await fileStats(filePath)
      if (!info || info.isDirectory()) {
        const indexPath = join(filePath, 'index.html')
        const indexInfo = await fileStats(indexPath)
        if (!indexInfo || indexInfo.isDirectory()) {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('Not found')
          return
        }
        filePath = indexPath
        info = indexInfo
      }

      const body = await readFile(filePath)
      res.writeHead(200, {
        ...headersForPath(headerRules, pathname),
        'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
        'content-length': info.size,
      })
      res.end(body)
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Internal server error')
    }
  })
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (isEntrypoint) {
  const root = resolve(process.argv[2] ?? '.output/public')
  const port = Number(process.env.PORT ?? 4173)
  const server = createStaticServer(root)

  server.listen(port, '127.0.0.1', () => {
    console.log(`Serving ${root} at http://127.0.0.1:${port}`)
  })
}
