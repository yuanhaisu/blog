import { defineCollection, defineContentConfig } from '@nuxt/content'
import { postFrontmatterSchema } from './shared/content-schema.mjs'
import { draftPostExcludes } from './shared/content-source.mjs'

export default defineContentConfig({
  collections: {
    posts: defineCollection({
      type: 'page',
      source: {
        include: 'posts/**/*.md',
        exclude: draftPostExcludes(),
      },
      schema: postFrontmatterSchema,
    }),
  },
})
