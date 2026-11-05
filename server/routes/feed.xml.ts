import { setHeader } from 'h3'
import { PERSON, SITE } from '../../app/utils/site'
import {
  absoluteUrl,
  escapeXml,
  fetchDiscoveryPosts,
  postLastmod,
  rssDate,
} from '../utils/discovery'

/**
 * RSS 2.0 feed of published posts, regenerated from content on every build.
 * Each item includes title, canonical link, publication date, author, and
 * summary; drafts never enter the feed.
 */
export default defineEventHandler(async (event) => {
  const posts = await fetchDiscoveryPosts(event)
  const lastBuildDate = posts[0] ? rssDate(postLastmod(posts[0])) : new Date().toUTCString()

  const items = posts
    .map((post) => {
      const categories = (post.tags ?? [])
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join('\n')

      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(absoluteUrl(post.path))}</link>`,
        `      <guid isPermaLink="true">${escapeXml(absoluteUrl(post.path))}</guid>`,
        `      <pubDate>${escapeXml(rssDate(post.date))}</pubDate>`,
        `      <author>${escapeXml(`${PERSON.email} (${PERSON.name})`)}</author>`,
        `      <description>${escapeXml(post.description)}</description>`,
        categories,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${escapeXml(`${SITE.url}/`)}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>zh-CN</language>
    <copyright>${escapeXml(`© ${PERSON.name}（${PERSON.nameEn}），CC BY 4.0`)}</copyright>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <atom:link href="${escapeXml(`${SITE.url}/feed.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`
})
