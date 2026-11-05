#!/usr/bin/env node
/**
 * Stage test-only content fixtures into the gitignored content tree.
 *
 * The draft-isolation checks (content guardrails, artifact validator, link
 * checker, Playwright) need a real `draft: true` post during the build. The
 * only tracked copy lives under tests/fixtures so the public content tree
 * never contains a draft. This script copies it in before validation/build.
 *
 * Usage:
 *   node scripts/stage-content-fixtures.mjs          # stage fixtures
 *   node scripts/stage-content-fixtures.mjs --clean  # remove staged fixtures
 */
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const fixtureDir = resolve('tests/fixtures/content/drafts')
const targetDir = resolve('content/posts/drafts')

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function clean() {
  await rm(targetDir, { recursive: true, force: true })
  process.stdout.write(`已清理临时草稿夹具：${targetDir}\n`)
}

async function stage() {
  if (!(await exists(fixtureDir))) {
    process.stdout.write('没有可用的草稿夹具，跳过。\n')
    return
  }

  await mkdir(targetDir, { recursive: true })
  const entries = await readdir(fixtureDir, { withFileTypes: true })
  let copied = 0
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue
    await cp(join(fixtureDir, entry.name), join(targetDir, entry.name))
    copied += 1
  }
  process.stdout.write(`已复制 ${copied} 个草稿夹具到 ${targetDir}\n`)
}

if (process.argv.includes('--clean')) {
  await clean()
} else {
  await stage()
}
