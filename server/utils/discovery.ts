import { queryCollection } from '@nuxt/content/server'
import type { H3Event } from 'h3'

export const SITE_URL = 'https://yuanhaisu.com'

export type DiscoveryPost = {
  path: string
  title: string
  description: string
  date: string
  updated?: string
  tags?: string[]
  series?: string
}

/**
 * Published posts newest first.
 *
 * Discovery artifacts must use this query (not the raw `posts` collection) so
 * drafts can never leak into sitemap, feed, or llms.txt output.
 */
export async function fetchDiscoveryPosts(event: H3Event): Promise<DiscoveryPost[]> {
  const posts = (await queryCollection(event, 'posts')
    .where('draft', '=', false)
    .all()) as DiscoveryPost[]

  return [...posts].sort(
    (left, right) => right.date.localeCompare(left.date) || left.path.localeCompare(right.path),
  )
}

export function postLastmod(post: DiscoveryPost): string {
  return post.updated ?? post.date
}

/**
 * Newest content date across published posts, used as `lastmod` for
 * non-article pages. Falls back to the build date when there are no posts.
 */
export function siteLastmod(posts: DiscoveryPost[]): string {
  const latest = posts.reduce(
    (current, post) => (postLastmod(post) > current ? postLastmod(post) : current),
    '',
  )

  return latest || new Date().toISOString().slice(0, 10)
}

export function collectTags(posts: DiscoveryPost[]): string[] {
  return [...new Set(posts.flatMap((post) => post.tags ?? []))].sort((left, right) =>
    left.localeCompare(right, 'zh-Hans-CN'),
  )
}

export function collectSeries(posts: DiscoveryPost[]): string[] {
  return [
    ...new Set(posts.flatMap((post) => (post.series ? [post.series] : []))),
  ].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function encodeSegment(value: string): string {
  return encodeURIComponent(value)
}

/**
 * Escape a value for XML text nodes and attribute values.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * RFC 822 date required by RSS 2.0. Calendar dates are interpreted as UTC so
 * the published day never shifts across build machines.
 */
export function rssDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toUTCString()
}
