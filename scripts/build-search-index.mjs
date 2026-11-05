#!/usr/bin/env node
/**
 * Build the Pagefind index, or skip it cleanly when there are no published
 * posts yet. Pagefind refuses to build an empty index, which would make a
 * production build fail before the first launch article is written.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const siteDir = resolve('.output/public')
const postsDir = join(siteDir, 'posts')

function hasHtmlFiles(dir) {
  if (!existsSync(dir)) return false
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory() && hasHtmlFiles(path)) return true
    if (entry.isFile() && entry.name.endsWith('.html')) return true
  }
  return false
}

if (!hasHtmlFiles(postsDir)) {
  process.stdout.write('没有已发布文章，跳过 Pagefind 索引；首篇文章发布后会自动建立索引。\n')
  process.exit(0)
}

const result = spawnSync(
  'pagefind',
  ['--site', siteDir, '--glob', 'posts/**/*.html'],
  { stdio: 'inherit', shell: true },
)

process.exit(result.status ?? 1)
