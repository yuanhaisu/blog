import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const execFileAsync = promisify(execFile)

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const fixturesRoot = path.join(repoRoot, 'tests/fixtures/guardrails')

async function runGuardrails(fixture: string): Promise<{ code: number; output: string }> {
  const contentDir = path.join(fixturesRoot, fixture, 'content')

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ['scripts/validate-content.mjs', '--content', contentDir],
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

test('合法内容通过构建期内容护栏', async () => {
  const { code, output } = await runGuardrails('valid')

  expect(code).toBe(0)
  expect(output).toContain('2 篇已发布')
  expect(output).toContain('1 篇草稿')
})

test('缺少必填 frontmatter 字段时失败并指出文章与字段', async () => {
  const { code, output } = await runGuardrails('missing-required')

  expect(code).toBe(1)
  expect(output).toContain('missing-required.md')
  expect(output).toContain('内容护栏未通过（6 个问题）')
  for (const field of ['description', 'date', 'tags', 'draft', 'lang', 'license']) {
    expect(output).toContain(`字段 "${field}" 缺失（必填）`)
  }
})

test('frontmatter 字段类型或取值错误时失败并指出字段', async () => {
  const { code, output } = await runGuardrails('invalid-types')

  expect(code).toBe(1)
  expect(output).toContain('wrong-types.md')
  expect(output).toContain('字段 "title" 类型错误：应为 string，实际为 number')
  expect(output).toContain('字段 "description" 类型错误：应为 string，实际为 array')
  expect(output).toContain('字段 "date" 不是有效的日历日期')
  expect(output).toContain('字段 "updated" 不是有效的日历日期')
  expect(output).toContain('字段 "tags" 类型错误：应为 array，实际为 string')
  expect(output).toContain('字段 "draft" 类型错误：应为 boolean，实际为 string')
  expect(output).toContain("字段 \"lang\" 必须是 'zh' 或 'en' 之一")
  expect(output).toContain('字段 "license" 类型错误：应为 string，实际为 boolean')
})

test('未知 frontmatter 字段时失败并指出字段名', async () => {
  const { code, output } = await runGuardrails('unknown-field')

  expect(code).toBe(1)
  expect(output).toContain('unknown-field.md')
  expect(output).toContain('未知 frontmatter 字段 "titel"')
})

test('站内链接指向不存在路由时失败并忽略外链、锚点与代码块', async () => {
  const { code, output } = await runGuardrails('broken-link')

  expect(code).toBe(1)
  expect(output).toContain('broken-link.md')
  expect(output).toContain('内容护栏未通过（1 个问题）')
  expect(output).toContain('内链 "/posts/does-not-exist" 没有对应的站内路由')
  expect(output).not.toContain('/posts/code-only-should-be-ignored')
  expect(output).not.toContain('example.com')
})

test('草稿路由不算已发布路由，但草稿自身的死链不阻止构建', async () => {
  const { code, output } = await runGuardrails('link-to-draft')

  expect(code).toBe(1)
  expect(output).toContain('内容护栏未通过（1 个问题）')
  expect(output).toContain('published-link.md')
  expect(output).toContain('内链 "/posts/hidden-draft" 没有对应的站内路由')
  expect(output).not.toContain('/posts/future-post')
})

test('launch 文章满足站内链接与配图要求时通过，并可使用动态标签/专题路由', async () => {
  const { code, output } = await runGuardrails('launch-valid')

  expect(code).toBe(0)
  expect(output).toContain('1 篇已发布')
  expect(output).not.toContain('没有对应的站内路由')
})

test('launch 文章缺少站内链接或原创配图时失败并说明要求', async () => {
  const { code, output } = await runGuardrails('launch-invalid')

  expect(code).toBe(1)
  expect(output).toContain('launch-invalid.md')
  expect(output).toContain('launch 文章至少需要 3 个不同的站内链接')
  expect(output).toContain('launch 文章至少需要 1 张站内原创配图')
})

test('未标记 launch 的普通文章不受上线链接与配图要求约束', async () => {
  const { code, output } = await runGuardrails('valid')

  expect(code).toBe(0)
  expect(output).not.toContain('launch 文章至少需要')
})

test('手机号被拦截且错误信息不回显敏感值', async () => {
  const { code, output } = await runGuardrails('sensitive-phone')

  expect(code).toBe(1)
  expect(output).toContain('phone.md')
  expect(output).toContain('检测到疑似手机号')
  expect(output).toContain('内容已隐藏')
  expect(output).not.toContain('13800138000')
})

test('客户名称被拦截且指出 frontmatter 字段但不回显敏感值', async () => {
  const { code, output } = await runGuardrails('sensitive-client')

  expect(code).toBe(1)
  expect(output).toContain('client.md')
  expect(output).toContain('字段 "description" 检测到疑似客户名称')
  expect(output).not.toContain('kindergarten')
})

test('儿童信息被拦截且不回显敏感值', async () => {
  const { code, output } = await runGuardrails('sensitive-child')

  expect(code).toBe(1)
  expect(output).toContain('child.md')
  expect(output).toContain('检测到疑似儿童信息')
  expect(output).not.toContain('李小明')
})

test('内部域名被拦截且不回显敏感值', async () => {
  const { code, output } = await runGuardrails('sensitive-domain')

  expect(code).toBe(1)
  expect(output).toContain('domain.md')
  expect(output).toContain('检测到疑似内部域名')
  expect(output).not.toContain('wiki.yuanhaisu.internal')
})

test('代码块中的密钥模式被拦截且不回显敏感值', async () => {
  const { code, output } = await runGuardrails('sensitive-secret')

  expect(code).toBe(1)
  expect(output).toContain('secret.md')
  expect(output).toContain('检测到疑似密钥')
  expect(output).not.toContain('0123456789abcdef0123456789abcdef')
})
