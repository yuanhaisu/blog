#!/usr/bin/env node
/**
 * Fail if the tracked repository contains credentials or tracked .env files.
 * Reports paths and pattern names only; never prints matched values.
 */
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const findings = []

const patterns = [
  ['private key block', /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  [
    'Cloudflare API token assignment',
    /\bCLOUDFLARE_API_TOKEN\b\s*[=:]\s*['"]?[A-Za-z0-9_-]{20,}/,
  ],
  [
    'Cloudflare API key assignment',
    /\bCLOUDFLARE_API_KEY\b\s*[=:]\s*['"]?[A-Za-z0-9_-]{20,}/,
  ],
  [
    'GitHub token assignment',
    /\bGITHUB_TOKEN\b\s*[=:]\s*['"]?(?:ghp_|github_pat_)[A-Za-z0-9_]+/,
  ],
]

let tracked
try {
  tracked = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
} catch (error) {
  console.error(`FAIL: cannot list tracked files with git (${error.message})`)
  process.exit(1)
}

for (const relativePath of tracked) {
  if (
    /(^|\/)\.env(?:\.|$)/.test(relativePath) &&
    !relativePath.endsWith('.env.example')
  ) {
    findings.push(`${relativePath}: tracked environment file`)
  }

  let content
  try {
    content = await readFile(resolve(repoRoot, relativePath), 'utf8')
  } catch {
    continue
  }
  if (content.includes('\0')) continue

  for (const [name, pattern] of patterns) {
    const match = pattern.exec(content)
    if (!match) continue
    const line = content.slice(0, match.index).split(/\r?\n/).length
    findings.push(`${relativePath}:${line}: ${name}`)
  }
}

console.log(`Scanned ${tracked.length} tracked files for credentials.`)

if (findings.length) {
  for (const finding of findings) console.error(`  FAIL ${finding}`)
  console.error(`\nFAIL: ${findings.length} secret-related finding(s).`)
  process.exit(1)
}

console.log('PASS: no tracked .env files and no credential patterns found.')
