import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { assert } from './context.mjs'
import { SITE_ORIGIN, pathExists } from './source.mjs'

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Googlebot',
  'Google-Extended',
  'Bytespider',
  'Baiduspider',
  'bingbot',
]

function parseRobots(text) {
  const groups = []
  let current

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator === -1) continue

    const directive = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (directive === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
    } else if (current) {
      current.rules.push({ directive, value })
    }
  }

  return groups
}

export async function validateRobots(rootDir) {
  const path = join(rootDir, 'robots.txt')
  if (!(await pathExists(path))) {
    assert(false, 'robots.txt 缺失')
    return
  }

  const text = await readFile(path, 'utf8')
  const groups = parseRobots(text)

  const wildcard = groups.find((entry) => entry.agents.includes('*'))
  assert(Boolean(wildcard), 'robots.txt 缺少 User-agent: *')
  if (wildcard) {
    assert(
      wildcard.rules.some(
        (rule) => rule.directive === 'allow' && rule.value === '/',
      ),
      'robots.txt 未允许全站抓取',
    )
  }

  for (const crawler of AI_CRAWLERS) {
    const group = groups.find((entry) =>
      entry.agents.includes(crawler.toLowerCase()),
    )
    assert(Boolean(group), `robots.txt 缺少 ${crawler}`)
    if (group) {
      assert(
        group.rules.some(
          (rule) => rule.directive === 'allow' && rule.value === '/',
        ),
        `robots.txt 未允许 ${crawler}`,
      )
    }
  }

  assert(
    text.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`),
    'robots.txt 缺少 sitemap 声明',
  )

  return `${AI_CRAWLERS.length} 个爬虫`
}
