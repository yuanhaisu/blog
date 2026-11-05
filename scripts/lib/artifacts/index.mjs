import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { collectDraftRoutes } from '../../../shared/content-files.mjs'
import { validateContentDump } from './content-dump.mjs'
import {
  assert,
  getValidationState,
  group,
  resetValidationState,
} from './context.mjs'
import { validateFeed } from './feed.mjs'
import { validateHeaders } from './headers.mjs'
import { validateLlms } from './llms.mjs'
import { validatePage } from './pages.mjs'
import { validatePagefind } from './pagefind.mjs'
import { validateRobots } from './robots.mjs'
import { validateSitemap } from './sitemap.mjs'
import {
  REQUIRED_FILES,
  collectHtmlRoutes,
  collectPublishedPosts,
  expectedRoutes,
  pathExists,
} from './source.mjs'

export async function validateArtifacts({
  rootDir = resolve('.output/public'),
  contentDir = resolve('content'),
} = {}) {
  resetValidationState()

  const posts = await collectPublishedPosts(contentDir)
  const draftRoutes = await collectDraftRoutes({ contentDir })
  let htmlRoutes = new Map()

  await group('必需产物', async () => {
    for (const file of REQUIRED_FILES) {
      assert(
        await pathExists(join(rootDir, file)),
        `缺少必需产物：${file}`,
      )
    }
    return REQUIRED_FILES.length + ' 个文件'
  })

  await group('路由清单', async () => {
    htmlRoutes = await collectHtmlRoutes(rootDir)
    const expected = expectedRoutes(posts)

    for (const route of expected) {
      assert(htmlRoutes.has(route), `缺少公开路由产物：${route}`)
    }
    for (const route of htmlRoutes.keys()) {
      assert(expected.has(route), `存在未声明的公开路由产物：${route}`)
    }
    for (const route of draftRoutes) {
      assert(!htmlRoutes.has(route), `草稿路由进入了构建产物：${route}`)
    }

    return `${htmlRoutes.size} 条公开路由，${draftRoutes.length} 条草稿被排除`
  })

  await group('页面 HTML / JSON-LD / 无 JS', async () => {
    for (const [route, file] of htmlRoutes) {
      validatePage(route, await readFile(file, 'utf8'))
    }
    return `${htmlRoutes.size} 个页面`
  })

  await group('sitemap.xml', () =>
    validateSitemap(rootDir, posts, new Set(htmlRoutes.keys())),
  )
  await group('feed.xml', () => validateFeed(rootDir, posts))
  await group('robots.txt', () => validateRobots(rootDir))
  await group('llms.txt', () => validateLlms(rootDir, posts))
  await group('_headers', () => validateHeaders(rootDir))
  await group('Pagefind 中文索引', () => validatePagefind(rootDir, posts))
  await group('草稿隔离', () => validateContentDump(rootDir))

  const state = getValidationState()

  return {
    ok: state.failures.length === 0,
    checks: state.checks,
    failures: state.failures,
    counts: {
      routes: htmlRoutes.size,
      posts: posts.length,
      drafts: draftRoutes.length,
    },
  }
}

export function formatReport(result, rootDir) {
  const lines = [`Artifact validation: ${rootDir}`]
  for (const check of result.checks) {
    lines.push(
      `  ${check.ok ? 'ok  ' : 'FAIL'} ${check.label}${check.detail ? ` (${check.detail})` : ''}`,
    )
  }

  if (result.failures.length > 0) {
    lines.push('')
    for (const failure of result.failures) {
      lines.push(`  FAIL [${failure.group}] ${failure.message}`)
    }
    lines.push(`\nFAIL: ${result.failures.length} 项产物校验失败。`)
  } else {
    lines.push(
      `\nPASS: ${result.checks.length} 组产物校验通过（${result.counts.routes} 条路由，${result.counts.posts} 篇文章）。`,
    )
  }

  return lines.join('\n')
}
