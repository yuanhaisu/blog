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
