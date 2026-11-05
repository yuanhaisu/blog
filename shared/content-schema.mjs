import { z } from '@nuxt/content'

function isCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return false
  }

  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid-date-format')
  .refine(isCalendarDate, 'invalid-date')

/**
 * Complete frontmatter contract for a blog post.
 *
 * Keep this schema as the single source of truth: it is used both by Nuxt
 * Content (build-time rendering) and by the content guardrails validator.
 */
export const postFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: isoDate,
    updated: isoDate.optional(),
    tags: z.array(z.string().min(1)),
    series: z.string().min(1).optional(),
    order: z.number().finite().optional(),
    draft: z.boolean(),
    featured: z.boolean().default(false),
    // Marks an article that is part of the public launch set. Such articles
    // must link to at least three internal routes and include an original
    // site-local diagram/image; test fixtures leave it false.
    launch: z.boolean().default(false),
    lang: z.enum(['zh', 'en']),
    translationOf: z.string().min(1).optional(),
    license: z.string().min(1),
  })
  .strict()

export const REQUIRED_POST_FIELDS = [
  'title',
  'description',
  'date',
  'tags',
  'draft',
  'lang',
  'license',
]

/**
 * Optional metadata document for a series.
 *
 * The series slug comes from the file path (`content/series/<slug>.md`) and is
 * referenced by `PostFrontmatter.series`.
 */
export const seriesFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1).optional(),
  })
  .strict()
