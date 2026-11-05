#!/usr/bin/env node
/**
 * Validate the generated static deployment artifacts in .output/public.
 *
 * This is the CI-side counterpart to the Playwright suite: it reads the
 * build output directly (no browser) and checks the invariants that search
 * engines, AI agents, and Cloudflare Pages depend on:
 *
 *   - every public route exists with canonical, OG/Twitter, Person and
 *     WebSite JSON-LD, analytics config, and no-JS article markup;
 *   - JSON-LD is parseable and articles carry BlogPosting + BreadcrumbList;
 *   - sitemap.xml, feed.xml, robots.txt and llms.txt are well-formed, list
 *     exactly the published content, and never leak drafts;
 *   - _headers still carries HSTS + the CSP allow-list;
 *   - Pagefind built a Chinese index for every published post;
 *   - the client content database dump excludes drafts.
 *
 * Reports checks and failing routes only. It never reads credentials.
 *
 * Usage: node scripts/validate-artifacts.mjs [--root .output/public] [--content content]
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  formatReport,
  validateArtifacts,
} from './lib/artifacts/index.mjs'

export { validateArtifacts }

function parseArgs(argv) {
  const options = {
    rootDir: resolve('.output/public'),
    contentDir: resolve('content'),
  }
  const flags = {
    '--root': 'rootDir',
    '--content': 'contentDir',
  }

  for (let index = 0; index < argv.length; index++) {
    const key = flags[argv[index]]
    if (!key) continue
    const value = argv[++index]
    if (!value) throw new Error(`参数 ${argv[index - 1]} 缺少路径`)
    options[key] = resolve(value)
  }

  return options
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (isEntrypoint) {
  try {
    const options = parseArgs(process.argv.slice(2))
    const result = await validateArtifacts(options)
    process.stdout.write(`${formatReport(result, options.rootDir)}\n`)
    if (!result.ok) {
      process.exitCode = 1
    }
  } catch (error) {
    process.stderr.write(`产物校验执行失败：${error?.message ?? '未知错误'}\n`)
    process.exitCode = 1
  }
}
