/**
 * Single entry point for published posts.
 *
 * Draft content must never reach the home page, taxonomy pages, archives, or
 * discovery artifacts (RSS, sitemap, llms.txt). Those consumers must use this
 * helper instead of querying the `posts` collection directly.
 */
export function queryPublishedPosts() {
  return queryCollection('posts').where('draft', '=', false)
}
