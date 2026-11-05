import { execFile } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const execFileAsync = promisify(execFile)

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
const outputDir = path.join(repoRoot, '.output/public')

async function runScript(
  script: string,
  args: string[] = [],
): Promise<{ code: number; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [script, ...args],
      { cwd: repoRoot },
    )
    return { code: 0, output: `${stdout}\n${stderr}` }
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string }
    return {
      code: failure.code ?? 1,
      output: `${failure.stdout ?? ''}\n${failure.stderr ?? ''}`,
    }
  }
}

async function copyBuild(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'launch-verification-'))
  await cp(outputDir, directory, { recursive: true })
  return directory
}

test('构建产物通过上线验收脚本：JSON-LD、sitemap、RSS、robots、llms.txt、Pagefind', async () => {
  const { code, output } = await runScript('scripts/validate-artifacts.mjs')

  expect(code, output).toBe(0)
  expect(output).toContain('PASS')
  expect(output).toContain('JSON-LD')
  expect(output).toContain('sitemap.xml')
  expect(output).toContain('feed.xml')
  expect(output).toContain('robots.txt')
  expect(output).toContain('llms.txt')
  expect(output).toContain('Pagefind')
})

test('sitemap 损坏时上线验收失败并指出产物', async () => {
  const directory = await copyBuild()

  try {
    await writeFile(
      path.join(directory, 'sitemap.xml'),
      '<?xml version="1.0"?><urlset><url><loc>https://yuanhaisu.com/</loc>',
      'utf8',
    )

    const { code, output } = await runScript(
      'scripts/validate-artifacts.mjs',
      ['--root', directory],
    )

    expect(code, output).toBe(1)
    expect(output).toContain('sitemap.xml')
    expect(output).toMatch(/XML|well-formed|未闭合|合法/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('缺少 llms.txt 时上线验收失败并指出缺失文件', async () => {
  const directory = await copyBuild()

  try {
    await rm(path.join(directory, 'llms.txt'))

    const { code, output } = await runScript(
      'scripts/validate-artifacts.mjs',
      ['--root', directory],
    )

    expect(code, output).toBe(1)
    expect(output).toContain('llms.txt')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('站内链接检查通过：全部公开路由 200、未知路由 404、www 301', async () => {
  const { code, output } = await runScript('scripts/check-internal-links.mjs')

  expect(code, output).toBe(0)
  expect(output).toContain('PASS')
  expect(output).toContain('200')
  expect(output).toContain('404')
  expect(output).toContain('www')
})

test('存在站内死链时链接检查失败并指出目标 URL', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'broken-links-'))

  try {
    await writeFile(
      path.join(directory, 'index.html'),
      '<!doctype html><html><body><a href="/missing-page">坏链接</a></body></html>',
      'utf8',
    )
    await writeFile(
      path.join(directory, 'sitemap.xml'),
      '<?xml version="1.0"?><urlset><url><loc>https://yuanhaisu.com/</loc></url></urlset>',
      'utf8',
    )

    const { code, output } = await runScript(
      'scripts/check-internal-links.mjs',
      ['--root', directory],
    )

    expect(code, output).toBe(1)
    expect(output).toContain('/missing-page')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('CI 工作流与本地 npm run ci 覆盖同一组上线检查', async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(repoRoot, 'package.json'), 'utf8'),
  ) as { scripts: Record<string, string> }
  const workflow = await readFile(
    path.join(repoRoot, '.github/workflows/ci.yml'),
    'utf8',
  )

  const checks = [
    'validate:content',
    'check:secrets',
    'build',
    'validate:artifacts',
    'check:links',
    'test:e2e',
    'smoke:deployment',
  ]

  for (const check of checks) {
    expect(packageJson.scripts.ci, `npm run ci 缺少 ${check}`).toContain(
      `npm run ${check}`,
    )
    expect(workflow, `CI 工作流缺少 ${check}`).toContain(`npm run ${check}`)
  }
})
