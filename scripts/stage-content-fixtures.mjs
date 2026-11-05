#!/usr/bin/env node
/**
 * Stage test-only content fixtures into the gitignored content tree.
 *
 * Production content lives in `content/posts/` and `content/series/`.
 * Test fixtures live under `tests/fixtures/content/` and are copied in only
 * for guardrails, artifact validation, link checks, and Playwright. The
 * manifest lets `--clean` remove only the files this script staged; it never
 * deletes real content.
 *
 * Usage:
 *   node scripts/stage-content-fixtures.mjs          # stage fixtures
 *   node scripts/stage-content-fixtures.mjs --clean  # remove staged fixtures
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const manifestPath = resolve('.fixtures-staged.json')
const mappings = [
  { from: resolve('tests/fixtures/content/drafts'), to: resolve('content/posts/drafts') },
  { from: resolve('tests/fixtures/content/posts'), to: resolve('content/posts') },
  { from: resolve('tests/fixtures/content/series'), to: resolve('content/series') },
]

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function clean() {
  if (!(await exists(manifestPath))) {
    process.stdout.write('没有 staged fixture manifest，跳过清理。\n')
    return
  }

  const paths = JSON.parse(await readFile(manifestPath, 'utf8'))
  for (const path of paths) {
    await rm(resolve(path), { force: true })
  }
  await rm(manifestPath, { force: true })
  await rm(resolve('content/posts/drafts'), { recursive: true, force: true })
  process.stdout.write(`已清理 ${paths.length} 个 staged fixture。\n`)
}

async function stage() {
  const staged = []

  for (const { from, to } of mappings) {
    if (!(await exists(from))) continue
    await mkdir(to, { recursive: true })
    for (const entry of await readdir(from, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue
      const target = join(to, entry.name)
      await cp(join(from, entry.name), target)
      staged.push(relative(process.cwd(), target))
    }
  }

  await writeFile(manifestPath, JSON.stringify(staged, null, 2))
  process.stdout.write(`已 stage ${staged.length} 个测试 fixture。\n`)
}

if (process.argv.includes('--clean')) {
  await clean()
} else {
  await stage()
}
