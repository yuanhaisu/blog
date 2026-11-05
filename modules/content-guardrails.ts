import { defineNuxtModule } from 'nuxt/kit'
import {
  collectDraftRoutes,
  formatGuardrailReport,
  runContentGuardrails,
} from '../scripts/lib/content-guardrails.mjs'

/**
 * Fail the production build when content violates the frontmatter schema,
 * contains broken internal links, or leaks sensitive strings.
 *
 * Draft routes are also excluded from prerendering so `draft: true` content
 * can never reach the static output.
 */
export default defineNuxtModule({
  meta: {
    name: 'content-guardrails',
  },
  setup(_options, nuxt) {
    nuxt.hook('build:before', async () => {
      if (nuxt.options.dev) {
        return
      }

      const result = await runContentGuardrails({ rootDir: nuxt.options.rootDir })

      if (result.errors.length > 0) {
        console.error(`\n${formatGuardrailReport(result)}\n`)
        throw new Error('内容护栏未通过，构建已中止。')
      }

      console.info(
        `内容护栏通过：${result.counts.published} 篇已发布，${result.counts.drafts} 篇草稿。`,
      )
    })

    nuxt.hook('nitro:config', async (nitroConfig) => {
      const draftRoutes = await collectDraftRoutes({ rootDir: nuxt.options.rootDir })

      if (draftRoutes.length > 0) {
        nitroConfig.prerender ||= {}
        nitroConfig.prerender.ignore ||= []
        nitroConfig.prerender.ignore.push(...draftRoutes)
      }
    })
  },
})
