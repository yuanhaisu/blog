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

/**
 * All published posts, newest first. ISO `date` strings sort chronologically.
 */
export async function fetchPublishedPostsByDate() {
  const posts = await queryPublishedPosts().order('date', 'DESC').all()

  return [...posts].sort(
    (left, right) => right.date.localeCompare(left.date) || left.path.localeCompare(right.path),
  )
}

/**
 * Published posts carrying `tag`, newest first.
 */
export async function fetchPublishedPostsByTag(tag: string) {
  const posts = await fetchPublishedPostsByDate()

  return posts.filter((post) => post.tags?.includes(tag))
}

/**
 * Published posts in `series`, ordered by their reading order.
 *
 * Posts without an explicit `order` go last; date breaks ties.
 */
export async function fetchPublishedPostsBySeries(series: string) {
  const posts = await queryPublishedPosts().where('series', '=', series).all()

  return [...posts].sort((left, right) => {
    const leftOrder = typeof left.order === 'number' ? left.order : Number.POSITIVE_INFINITY
    const rightOrder = typeof right.order === 'number' ? right.order : Number.POSITIVE_INFINITY

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return left.date.localeCompare(right.date) || left.path.localeCompare(right.path)
  })
}

type PublishedPost = Awaited<ReturnType<typeof fetchPublishedPostsByDate>>[number]

export type ArchiveMonth = {
  month: string
  posts: PublishedPost[]
}

export type ArchiveYear = {
  year: string
  months: ArchiveMonth[]
}

/**
 * Group date-sorted posts into years and months, preserving input order.
 */
export function groupPostsByMonth(posts: PublishedPost[]): ArchiveYear[] {
  const years = new Map<string, ArchiveYear>()

  for (const post of posts) {
    const [year, month] = post.date.split('-')
    let yearGroup = years.get(year)

    if (!yearGroup) {
      yearGroup = { year, months: [] }
      years.set(year, yearGroup)
    }

    let monthGroup = yearGroup.months.find((group) => group.month === month)

    if (!monthGroup) {
      monthGroup = { month, posts: [] }
      yearGroup.months.push(monthGroup)
    }

    monthGroup.posts.push(post)
  }

  return [...years.values()]
}
