import { createHash } from 'node:crypto'
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Build site-specific Chinese font subsets with the Google Fonts CSS API.
 *
 * The generated woff2 files and CSS are committed so production builds never
 * download a multi-megabyte CJK font and never need network access. Re-run
 * `npm run fonts:subset` after adding content so new characters are covered.
 *
 * Noto Serif SC and Noto Sans SC are licensed under SIL OFL 1.1.
 */

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(rootDir, 'public', 'fonts')
const cssPath = join(rootDir, 'app', 'assets', 'css', 'fonts.css')

const sourceDirs = ['app', 'content', 'shared']
const sourceExtensions = new Set(['.vue', '.ts', '.js', '.mjs', '.md'])

const families = [
  { name: 'Noto Serif SC', slug: 'noto-serif-sc' },
  { name: 'Noto Sans SC', slug: 'noto-sans-sc' },
]

// 300 glyphs keeps each file ~90KB while covering the whole site in a few
// batches. Browsers only request batches whose unicode-range appears on a page.
const batchSize = 300
const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

async function collectSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)))
    } else if (sourceExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }

  return files
}

async function collectCharacters() {
  const characters = new Set()

  // Always cover printable ASCII (dates, code, punctuation, brand initials).
  for (let code = 0x20; code <= 0x7e; code += 1) {
    characters.add(String.fromCodePoint(code))
  }

  for (const dir of sourceDirs) {
    for (const file of await collectSourceFiles(join(rootDir, dir))) {
      const content = await readFile(file, 'utf8')
      for (const character of content) {
        if (character === '\n' || character === '\r') continue
        if (character < ' ') continue
        characters.add(character)
      }
    }
  }

  return [...characters].sort(
    (a, b) => a.codePointAt(0) - b.codePointAt(0),
  )
}

function toUnicodeRange(characters) {
  const points = [
    ...new Set(characters.map((character) => character.codePointAt(0))),
  ].sort((a, b) => a - b)

  const ranges = []
  let start = points[0]
  let previous = points[0]

  for (const point of points.slice(1)) {
    if (point === previous + 1) {
      previous = point
      continue
    }

    ranges.push([start, previous])
    start = point
    previous = point
  }
  ranges.push([start, previous])

  const hex = (value) => value.toString(16).toUpperCase().padStart(4, '0')

  return ranges
    .map(([from, to]) =>
      from === to ? `U+${hex(from)}` : `U+${hex(from)}-${hex(to)}`,
    )
    .join(', ')
}

async function fetchWithRetry(url, { attempts = 4, label = url } = {}) {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': userAgent },
      })

      if (!response.ok) {
        throw new Error(`${label} 返回 HTTP ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        await new Promise((resolveDelay) =>
          setTimeout(resolveDelay, 500 * attempt),
        )
      }
    }
  }

  throw lastError
}

async function fetchSubsetUrl(family, text) {
  const url = new URL('https://fonts.googleapis.com/css2')
  url.searchParams.set('family', `${family}:wght@200..900`)
  url.searchParams.set('text', text)
  url.searchParams.set('display', 'swap')

  const response = await fetchWithRetry(url.href, {
    label: `${family} 子集 CSS`,
  })
  const css = await response.text()
  const match = css.match(/src:\s*url\((https:[^)]+)\)/)

  if (!match) {
    throw new Error(`${family} 子集 CSS 中没有找到字体地址`)
  }

  return match[1]
}

async function downloadSubset(family, characters, index) {
  const text = characters.join('')
  const fontUrl = await fetchSubsetUrl(family.name, text)
  const response = await fetchWithRetry(fontUrl, {
    label: `${family.name} 子集字体`,
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  const hash = createHash('sha1')
    .update(`${family.slug}:${text}`)
    .digest('hex')
    .slice(0, 10)
  const filename = `${family.slug}-${index}-${hash}.woff2`

  await writeFile(join(outputDir, filename), buffer)

  return {
    family: family.name,
    filename,
    unicodeRange: toUnicodeRange(characters),
    bytes: buffer.byteLength,
  }
}

function renderCss(faces) {
  const rules = faces.map(
    (face) => `@font-face {
  font-family: '${face.family}';
  font-style: normal;
  font-weight: 200 900;
  font-display: swap;
  src: url('/fonts/${face.filename}') format('woff2');
  unicode-range: ${face.unicodeRange};
}`,
  )

  return `/*
 * Generated by \`npm run fonts:subset\` — do not edit by hand.
 * Noto Serif SC / Noto Sans SC are licensed under SIL OFL 1.1.
 * See /fonts/OFL.txt. Re-run the script after adding content.
 */

${rules.join('\n\n')}
`
}

async function main() {
  const characters = await collectCharacters()
  await mkdir(outputDir, { recursive: true })

  // Remove stale generated subsets so deleted characters do not linger.
  for (const file of await readdir(outputDir)) {
    if (/^noto-.*\.woff2$/.test(file)) {
      await rm(join(outputDir, file))
    }
  }

  const faces = []
  const batches = []

  for (let index = 0; index < characters.length; index += batchSize) {
    batches.push(characters.slice(index, index + batchSize))
  }

  for (const family of families) {
    for (let index = 0; index < batches.length; index += 1) {
      const face = await downloadSubset(family, batches[index], index)
      faces.push(face)
      console.info(
        `${family.name} 子集 ${index + 1}/${batches.length}: ${face.filename} (${Math.round(face.bytes / 1024)}KB)`,
      )
    }
  }

  await writeFile(cssPath, renderCss(faces))

  const totalBytes = faces.reduce((total, face) => total + face.bytes, 0)
  console.info(
    `完成：${characters.length} 个字符，${faces.length} 个字体文件，合计 ${Math.round(totalBytes / 1024)}KB。`,
  )
}

main().catch((error) => {
  console.error('字体子集化失败：', error)
  process.exit(1)
})
