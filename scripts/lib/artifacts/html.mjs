import { addFailure, assert } from './context.mjs'

export function decodeEntities(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

export function getAttribute(tag, name) {
  const match = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  ).exec(tag)
  if (!match) return null
  return decodeEntities(match[1] ?? match[2] ?? match[3] ?? '')
}

export function findTags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? []
}

export function findMeta(html, attribute, value) {
  return findTags(html, 'meta').filter(
    (tag) => getAttribute(tag, attribute) === value,
  )
}

export function isCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function stripTags(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Minimal XML well-formedness check for the generated sitemap and RSS.
 *
 * The build emits simple XML with no CDATA and no processing instructions
 * inside elements, so a tag-stack plus entity check is sufficient to catch
 * truncation, unescaped ampersands, and mismatched closing tags without
 * pulling an XML parser into the toolchain.
 */
export function assertWellFormedXml(xml, label) {
  const withoutCdata = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
  const body = withoutCdata.replace(/<\?[\s\S]*?\?>/g, '')
  const textOnly = body.replace(/<[^>]*>/g, ' ')
  const rawAmpersand = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/
  assert(!rawAmpersand.test(textOnly), `${label} 含有未转义的 & 字符`)

  const stack = []
  for (const match of body.matchAll(/<([^>]+)>/g)) {
    const token = match[1].trim()
    if (!token || token.startsWith('!')) continue

    if (token.startsWith('/')) {
      const name = token.slice(1).trim()
      const open = stack.pop()
      assert(
        open === name,
        `${label} XML 标签未正确闭合：期望 </${open ?? '?'}>，实际 </${name}>`,
      )
      continue
    }

    const name = token.split(/\s+/)[0]
    if (token.endsWith('/')) continue
    stack.push(name)
  }

  assert(
    stack.length === 0,
    `${label} XML 未闭合标签：${stack.join(', ') || '未知'}`,
  )
}

export function readJsonLd(html, route) {
  const nodes = []
  const blocks = [
    ...html.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1])
      if (Array.isArray(parsed)) nodes.push(...parsed)
      else nodes.push(parsed)
    } catch (error) {
      addFailure('JSON-LD', `${route} 的 JSON-LD 无法解析：${error.message}`)
    }
  }

  return nodes
}

export function nodesOfType(nodes, type) {
  return nodes.filter((node) => node?.['@type'] === type)
}

export function isAbsoluteUrl(value) {
  if (typeof value !== 'string') return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}
