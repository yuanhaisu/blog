import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseFrontmatter } from './frontmatter.mjs'

/**
 * Map a content-relative Markdown path to its public route.
 */
export function contentRoute(relativePath) {
  const posix = relativePath.split(path.sep).join('/').replace(/\.md$/i, '')
  const withoutIndex = posix.replace(/\/index$/, '')
  return `/${withoutIndex.replace(/^\/+/, '')}`
}

/**
 * Walk a directory recursively and return files matching `predicate`.
 * Missing directories yield an empty list.
 */
export async function walkFiles(directory, predicate = () => true) {
  const files = []

  async function visit(current) {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return
      }
      throw error
    }

    entries.sort((left, right) => left.name.localeCompare(right.name))

    for (const entry of entries) {
      const absPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await visit(absPath)
      } else if (entry.isFile() && predicate(absPath)) {
        files.push(absPath)
      }
    }
  }

  await visit(directory)
  return files
}

/**
 * Routes of every `draft: true` post under `content/posts`.
 *
 * Shared by the content guardrails, artifact validator and internal link
 * checker so draft isolation is derived from exactly one implementation.
 */
export async function collectDraftRoutes(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())
  const contentDir = path.resolve(
    options.contentDir ?? path.join(rootDir, 'content'),
  )
  const postsDir = path.join(contentDir, 'posts')

  if (!existsSync(postsDir)) {
    return []
  }

  const files = await walkFiles(postsDir, (file) =>
    file.toLowerCase().endsWith('.md'),
  )
  const routes = []

  for (const absPath of files) {
    const parsed = parseFrontmatter(await readFile(absPath, 'utf8'))
    if (!parsed.error && parsed.data?.draft === true) {
      routes.push(contentRoute(path.relative(contentDir, absPath)))
    }
  }

  return routes.sort()
}
