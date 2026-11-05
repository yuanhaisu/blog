import { setHeader } from 'h3'
import {
  absoluteUrl,
  collectSeries,
  collectTags,
  encodeSegment,
  escapeXml,
  fetchDiscoveryPosts,
  postLastmod,
  siteLastmod,
} from '../utils/discovery'

type SitemapEntry = {
  loc: string
  lastmod: string
}

/**
 * XML sitemap of every public route. Drafts are excluded by the shared
 * published-posts query; the 404 page is never listed.
 */
export default defineEventHandler(async (event) => {
  const posts = await fetchDiscoveryPosts(event)
  const pageLastmod = siteLastmod(posts)
  const entries: SitemapEntry[] = [
    { loc: absoluteUrl('/'), lastmod: pageLastmod },
    ...posts.map((post) => ({
      loc: absoluteUrl(post.path),
      lastmod: postLastmod(post),
    })),
    ...collectTags(posts).map((tag) => ({
      loc: absoluteUrl(`/tags/${encodeSegment(tag)}`),
      lastmod: pageLastmod,
    })),
    ...collectSeries(posts).map((series) => ({
      loc: absoluteUrl(`/series/${encodeSegment(series)}`),
      lastmod: pageLastmod,
    })),
    { loc: absoluteUrl('/about'), lastmod: pageLastmod },
    { loc: absoluteUrl('/archive'), lastmod: pageLastmod },
    { loc: absoluteUrl('/privacy'), lastmod: pageLastmod },
  ]

  const urls = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n  </url>`,
    )
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
})
