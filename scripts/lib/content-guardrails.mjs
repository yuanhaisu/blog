import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { postFrontmatterSchema } from '../../shared/content-schema.mjs'
import { contentRoute, walkFiles } from '../../shared/content-files.mjs'
import { parseFrontmatter } from '../../shared/frontmatter.mjs'

export { collectDraftRoutes } from '../../shared/content-files.mjs'

const DEFAULT_CONFIG = {
  clientNames: [],
  internalDomains: [],
  childDataPatterns: [],
}

const PHONE_PATTERNS = [
  /(?<!\d)(?:\+?86[\s-]?)?1[3-9]\d(?:[\s-]?\d{4}){2}(?!\d)/g,
]

const CHILD_DATA_PATTERNS = [
  /(?:孩子|女儿|儿子|宝宝|小朋友|儿童|幼儿)[^\n。；;]{0,12}(?:姓名|名字|生日|出生日期|出生|身份证|幼儿园|学校|班级)/g,
  /(?:孩子|女儿|儿子|宝宝|小朋友|儿童|幼儿)[^\n。；;]{0,12}\d{1,2}\s*岁(?:半)?/g,
  /\d{1,2}\s*岁(?:半)?的?(?:孩子|女儿|儿子|宝宝|小朋友|儿童|幼儿)/g,
]

const INTERNAL_DOMAIN_PATTERNS = [
  /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:internal|intranet|corp|local|lan)\b/gi,
  /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
]

const SECRET_PATTERNS = [
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}\b/g,
  /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/g,
  /\b(?:api[_-]?key|apikey|secret|token|password|passwd|pwd)\s*[:=]\s*['"]?[A-Za-z0-9_\-./+]{12,}['"]?/gi,
]

/**
 * Build-time content guardrails: frontmatter schema, draft isolation,
 * internal link checking, and sensitive string scanning.
 */
export async function runContentGuardrails(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())
  const contentDir = path.resolve(options.contentDir ?? path.join(rootDir, 'content'))
  const appDir = path.resolve(options.appDir ?? path.join(rootDir, 'app'))
  const serverDir = path.resolve(options.serverDir ?? path.join(rootDir, 'server'))
  const publicDir = path.resolve(options.publicDir ?? path.join(rootDir, 'public'))
  const configPath = path.resolve(options.configPath ?? path.join(rootDir, 'guardrails.config.mjs'))

  const errors = []
  const posts = []
  const routes = new Set()

  const config = await loadConfig(configPath)
  const sensitiveCategories = buildSensitiveCategories(config)

  const postsDir = path.join(contentDir, 'posts')
  if (!existsSync(contentDir)) {
    errors.push(`内容目录不存在：${displayPath(rootDir, contentDir)}`)
  } else if (!existsSync(postsDir)) {
    errors.push(`内容目录缺少 posts 子目录：${displayPath(rootDir, postsDir)}`)
  } else {
    const files = await walkFiles(postsDir, (file) => file.toLowerCase().endsWith('.md'))

    for (const absPath of files) {
      const file = displayPath(rootDir, absPath)
      const raw = await readFile(absPath, 'utf8')
      const parsed = parseFrontmatter(raw)

      if (parsed.error) {
        errors.push(`${file}: ${parsed.error}`)
        continue
      }

      const post = {
        file,
        absPath,
        route: contentRoute(path.relative(contentDir, absPath)),
        frontmatter: parsed.data,
        body: parsed.body,
        bodyStartLine: parsed.bodyStartLine,
        valid: false,
        draft: parsed.data?.draft === true,
      }

      const result = postFrontmatterSchema.safeParse(parsed.data)
      if (!result.success) {
        for (const message of formatIssues(result.error.issues)) {
          errors.push(`${file}: ${message}`)
        }
      } else {
        post.frontmatter = result.data
        post.valid = true
        post.draft = result.data.draft
        if (!post.draft) {
          routes.add(post.route)
        }
      }

      posts.push(post)

      for (const error of scanSensitive(post, sensitiveCategories)) {
        errors.push(`${file}: ${error}`)
      }
    }
  }

  for (const route of await collectAppRoutes(appDir)) {
    routes.add(route)
  }
  for (const route of await collectServerRoutes(serverDir)) {
    routes.add(route)
  }
  for (const route of await collectPublicRoutes(publicDir)) {
    routes.add(route)
  }

  // Dynamic taxonomy routes are generated from published posts; add them so
  // articles can link to their own tag and series pages without false errors.
  for (const post of posts) {
    if (!post.valid || post.draft) {
      continue
    }

    for (const tag of post.frontmatter.tags) {
      routes.add(`/tags/${tag}`)
    }

    if (post.frontmatter.series) {
      routes.add(`/series/${post.frontmatter.series}`)
    }
  }

  for (const post of posts) {
    if (!post.valid || post.draft) {
      continue
    }

    for (const error of checkInternalLinks(post, routes)) {
      errors.push(`${post.file}: ${error}`)
    }

    for (const error of checkLaunchRequirements(post)) {
      errors.push(`${post.file}: ${error}`)
    }
  }

  const published = posts.filter((post) => post.valid && !post.draft)
  const drafts = posts.filter((post) => post.valid && post.draft)

  return {
    errors,
    posts: posts.map(({ file, route, valid, draft }) => ({ file, route, valid, draft })),
    counts: { published: published.length, drafts: drafts.length },
    publishedRoutes: published.map((post) => post.route).sort(),
    draftRoutes: drafts.map((post) => post.route).sort(),
  }
}

export function formatGuardrailReport(result) {
  const lines = [`内容护栏未通过（${result.errors.length} 个问题）：`]
  for (const error of result.errors) {
    lines.push(`  - ${error}`)
  }
  lines.push('请修复后重新构建。')
  return lines.join('\n')
}

function formatIssues(issues) {
  const messages = []

  for (const issue of issues) {
    const field = formatFieldPath(issue.path)

    switch (issue.code) {
      case 'invalid_type':
        if (issue.received === 'undefined') {
          messages.push(`字段 "${field}" 缺失（必填）`)
        } else {
          messages.push(
            `字段 "${field}" 类型错误：应为 ${issue.expected}，实际为 ${issue.received}`,
          )
        }
        break
      case 'invalid_enum_value':
        messages.push(
          `字段 "${field}" 必须是 ${issue.options.map((option) => `'${option}'`).join(' 或 ')} 之一`,
        )
        break
      case 'invalid_string':
        if (issue.validation === 'regex') {
          messages.push(`字段 "${field}" 必须是 YYYY-MM-DD 格式的 ISO 8601 日期`)
        } else {
          messages.push(`字段 "${field}" 格式不正确`)
        }
        break
      case 'custom':
        messages.push(`字段 "${field}" 不是有效的日历日期`)
        break
      case 'too_small':
        messages.push(`字段 "${field}" 不能为空`)
        break
      case 'unrecognized_keys':
        for (const key of issue.keys) {
          messages.push(`未知 frontmatter 字段 "${key}"`)
        }
        break
      default:
        messages.push(`字段 "${field}" 校验失败（${issue.code}）`)
    }
  }

  return messages
}

function formatFieldPath(parts) {
  if (!parts.length) {
    return 'frontmatter'
  }

  return parts
    .map((part, index) => {
      if (typeof part === 'number') {
        return `[${part}]`
      }
      return index === 0 ? part : `.${part}`
    })
    .join('')
}

async function collectAppRoutes(appDir) {
  const pagesDir = path.join(appDir, 'pages')
  const files = await walkFiles(pagesDir, (file) => /\.(?:vue|ts|js|mjs|tsx|jsx)$/i.test(file))
  const routes = new Set()

  for (const absPath of files) {
    const relative = path.relative(pagesDir, absPath).split(path.sep).join('/')
    if (relative.split('/').some((segment) => segment.includes('['))) {
      continue
    }

    routes.add(pageRoute(relative))
  }

  return routes
}

async function collectServerRoutes(serverDir) {
  const routesDir = path.join(serverDir, 'routes')
  const files = await walkFiles(routesDir, (file) => /\.(?:ts|js|mjs|tsx|jsx)$/i.test(file))
  const routes = new Set()

  for (const absPath of files) {
    const relative = path.relative(routesDir, absPath).split(path.sep).join('/')
    if (relative.split('/').some((segment) => segment.includes('['))) {
      continue
    }

    routes.add(pageRoute(relative))
  }

  return routes
}

async function collectPublicRoutes(publicDir) {
  const files = await walkFiles(publicDir, () => true)
  return new Set(files.map((absPath) => `/${path.relative(publicDir, absPath).split(path.sep).join('/')}`))
}

function pageRoute(relativePath) {
  const withoutExtension = relativePath.replace(/\.(?:vue|ts|js|mjs|tsx|jsx)$/i, '')
  const withoutIndex = withoutExtension.replace(/(?:^|\/)index$/, '')
  return `/${withoutIndex.replace(/^\/+/, '')}`.replace(/\/$/, '') || '/'
}

function checkInternalLinks(post, routes) {
  const masked = maskCode(post.body)
  const links = extractLinks(masked)
  const errors = []
  const seen = new Set()

  for (const link of links) {
    const destination = normalizeDestination(link.destination)
    if (!destination) {
      continue
    }

    const resolved = resolveInternalPath(destination, post.route)
    if (!resolved || seen.has(resolved)) {
      continue
    }
    seen.add(resolved)

    if (!routes.has(resolved)) {
      const line = post.bodyStartLine + lineNumberAt(post.body, link.index) - 1
      errors.push(`正文第 ${line} 行内链 "${link.destination}" 没有对应的站内路由`)
    }
  }

  return errors
}

/**
 * Launch articles must be self-contained entry points: at least three
 * distinct internal links and one original site-local diagram/image.
 *
 * The explicit `launch: true` flag keeps test fixtures and pre-launch posts
 * exempt from a rule that only applies to the public launch set.
 */
function checkLaunchRequirements(post) {
  if (post.frontmatter.launch !== true) {
    return []
  }

  const links = extractLinks(maskCode(post.body))
  const internalLinks = new Set()
  let hasLocalImage = false

  for (const link of links) {
    const destination = normalizeDestination(link.destination)
    if (!destination) {
      continue
    }

    const resolved = resolveInternalPath(destination, post.route)
    if (!resolved) {
      continue
    }

    if (link.image) {
      hasLocalImage = true
    } else {
      internalLinks.add(resolved)
    }
  }

  const errors = []

  if (internalLinks.size < 3) {
    errors.push(
      `launch 文章至少需要 3 个不同的站内链接（当前 ${internalLinks.size} 个）`,
    )
  }

  if (!hasLocalImage) {
    errors.push(
      'launch 文章至少需要 1 张站内原创配图（Markdown ![...](/...) 或 <img src="/...">）',
    )
  }

  return errors
}

function maskCode(body) {
  const withoutFences = body.replace(
    /^[ \t]{0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]{0,3}\1[ \t]*$/gm,
    (block) => block.replace(/[^\n]/g, ' '),
  )

  return withoutFences.replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length))
}

function extractLinks(maskedBody) {
  const links = []
  let match

  const markdownLink =
    /(!?)\[[^\]]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/g
  while ((match = markdownLink.exec(maskedBody)) !== null) {
    links.push({
      destination: match[2],
      index: match.index,
      image: match[1] === '!',
    })
  }

  const referenceDefinition =
    /^[ \t]{0,3}(!?)\[[^\]]+\]:[ \t]*(<[^>\n]+>|\S+)/gm
  while ((match = referenceDefinition.exec(maskedBody)) !== null) {
    links.push({
      destination: match[2],
      index: match.index,
      image: match[1] === '!',
    })
  }

  const htmlAttribute =
    /\b(href|src)[ \t]*=[ \t]*(?:"([^"]*)"|'([^']*)')/gi
  while ((match = htmlAttribute.exec(maskedBody)) !== null) {
    links.push({
      destination: match[2] ?? match[3],
      index: match.index,
      image: match[1].toLowerCase() === 'src',
    })
  }

  return links
}

function normalizeDestination(destination) {
  const value = destination.trim().replace(/^<|>$/g, '')
  if (!value || value.startsWith('#') || value.startsWith('//')) {
    return null
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    return null
  }
  return value
}

function resolveInternalPath(destination, postRoute) {
  let url
  try {
    url = new URL(destination, `https://content-guardrails.invalid${postRoute}`)
  } catch {
    return null
  }

  if (url.origin !== 'https://content-guardrails.invalid') {
    return null
  }

  let pathname = url.pathname
  try {
    pathname = decodeURIComponent(pathname)
  } catch {
    // Keep the raw pathname when it contains malformed escapes.
  }

  return normalizeRoute(pathname)
}

function normalizeRoute(pathname) {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') || '/' : '/'
}

function lineNumberAt(text, index) {
  let line = 1
  for (let position = 0; position < index && position < text.length; position++) {
    if (text[position] === '\n') {
      line++
    }
  }
  return line
}

function buildSensitiveCategories(config) {
  const clientNamePatterns = config.clientNames
    .filter((name) => typeof name === 'string' && name.length > 0)
    .map((name) => {
      const escaped = escapeRegExp(name)
      if (/^[A-Za-z0-9_ -]+$/.test(name)) {
        return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'gi')
      }
      return new RegExp(escaped, 'gi')
    })

  const internalDomainPatterns = [
    ...INTERNAL_DOMAIN_PATTERNS,
    ...config.internalDomains
      .filter((domain) => typeof domain === 'string' && domain.length > 0)
      .map((domain) => new RegExp(`(?<![A-Za-z0-9-])${escapeRegExp(domain)}(?![A-Za-z0-9-])`, 'gi')),
  ]

  const childDataPatterns = [
    ...CHILD_DATA_PATTERNS,
    ...config.childDataPatterns.map((pattern) =>
      pattern instanceof RegExp
        ? new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
        : new RegExp(String(pattern), 'g'),
    ),
  ]

  return [
    { label: '手机号', patterns: PHONE_PATTERNS },
    ...(clientNamePatterns.length ? [{ label: '客户名称', patterns: clientNamePatterns }] : []),
    { label: '儿童信息', patterns: childDataPatterns },
    { label: '内部域名', patterns: internalDomainPatterns },
    { label: '密钥', patterns: SECRET_PATTERNS },
  ]
}

function scanSensitive(post, categories) {
  const errors = []

  for (const category of categories) {
    const fieldHits = new Map()

    for (const { fieldPath, text } of collectFrontmatterStrings(post.frontmatter)) {
      if (hasMatch(text, category.patterns)) {
        const key = `${fieldPath}\u0000${category.label}`
        if (!fieldHits.has(key)) {
          fieldHits.set(key, `字段 "${fieldPath}" 检测到疑似${category.label}（内容已隐藏）`)
        }
      }
    }

    errors.push(...fieldHits.values())

    const bodyMatches = findMatches(post.body, category.patterns)
    if (bodyMatches.length) {
      const first = bodyMatches[0]
      const line = post.bodyStartLine + lineNumberAt(post.body, first) - 1
      errors.push(`正文第 ${line} 行检测到疑似${category.label}（内容已隐藏）`)
    }
  }

  return errors
}

function collectFrontmatterStrings(value, fieldPath = '') {
  if (typeof value === 'string' || typeof value === 'number') {
    return [{ fieldPath: fieldPath || 'frontmatter', text: String(value) }]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectFrontmatterStrings(item, `${fieldPath}[${index}]`),
    )
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      collectFrontmatterStrings(item, fieldPath ? `${fieldPath}.${key}` : key),
    )
  }

  return []
}

function hasMatch(text, patterns) {
  return findMatches(text, patterns).length > 0
}

function findMatches(text, patterns) {
  const indexes = new Set()

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
    let match
    while ((match = regex.exec(text)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex += 1
        continue
      }
      indexes.add(match.index)
      if (indexes.size >= 50) {
        return [...indexes]
      }
    }
  }

  return [...indexes].sort((a, b) => a - b)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function loadConfig(configPath) {
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG }
  }

  const module = await import(pathToFileURL(configPath).href)
  return { ...DEFAULT_CONFIG, ...(module.default ?? {}) }
}

function displayPath(rootDir, absPath) {
  const relative = path.relative(rootDir, absPath)
  const value = relative && !relative.startsWith('..') ? relative : absPath
  return value.split(path.sep).join('/')
}
