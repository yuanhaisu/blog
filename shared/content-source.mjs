import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from './frontmatter.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Files that must be excluded from the production content collection.
 *
 * Drafts are removed at the source level (not only filtered at query time) so
 * their bodies never reach the prerendered output or the public content
 * database dump. In development they stay in the collection for local preview.
 */
export function draftPostExcludes(rootDir = projectRoot) {
  if (process.env.NODE_ENV !== 'production') {
    return []
  }

  const contentDir = path.join(rootDir, 'content')
  const postsDir = path.join(contentDir, 'posts')

  if (!existsSync(postsDir)) {
    return []
  }

  const excludes = []

  for (const absPath of listMarkdownFiles(postsDir)) {
    const parsed = parseFrontmatter(readFileSync(absPath, 'utf8'))

    if (!parsed.error && parsed.data?.draft === true) {
      excludes.push(path.relative(contentDir, absPath).split(path.sep).join('/'))
    }
  }

  return excludes
}

function listMarkdownFiles(directory) {
  const files = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(absPath))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(absPath)
    }
  }

  return files
}
