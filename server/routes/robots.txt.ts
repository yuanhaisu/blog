import { setHeader } from 'h3'
import { SITE_URL } from '../utils/discovery'

/**
 * Explicitly allow mainstream search and AI crawlers, per ADR-0006. No
 * site-wide anti-bot rules: abusive traffic is handled at the Cloudflare edge.
 */
const CRAWLERS = [
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

export default defineEventHandler((event) => {
  const groups = CRAWLERS.map(
    (crawler) => `User-agent: ${crawler}\nAllow: /`,
  ).join('\n\n')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  return `# ${SITE_URL}/robots.txt
# 全站开放抓取：主流搜索引擎与 AI 爬虫均被明确允许。

User-agent: *
Allow: /

${groups}

Sitemap: ${SITE_URL}/sitemap.xml
`
})
