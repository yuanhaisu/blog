import { readdir, readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const outputDir = resolve(process.cwd(), '.output/public')
const textExtensions = new Set(['.html', '.json', '.txt', '.xml'])

const phonePattern = /(?<!\d)(?:\+?86[\s-]?)?1[3-9]\d(?:[\s-]?\d{4}){2}(?!\d)/
const childDataPattern =
  /(?:孩子|女儿|儿子|宝宝|小朋友|儿童|幼儿)[^\n。；;]{0,12}(?:姓名|名字|生日|出生日期|出生|身份证|幼儿园|学校|班级)/

async function collectTextArtifacts(directory: string): Promise<string[]> {
  const files: string[] = []

  async function visit(current: string) {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) {
        await visit(path)
      } else if (entry.isFile() && textExtensions.has(extname(entry.name))) {
        files.push(path)
      }
    }
  }

  await visit(directory)
  return files
}

test('所有构建产物不包含错误姓名变体、手机号、客户名称或儿童信息', async () => {
  const files = await collectTextArtifacts(outputDir)
  expect(files.length).toBeGreaterThan(0)

  for (const file of files) {
    const text = await readFile(file, 'utf8')

    expect(text, `${file} 不应出现姓名错误变体`).not.toContain('袁海苏')
    expect(text, `${file} 不应出现内部客户名称`).not.toMatch(/kindergarten/i)
    expect(text, `${file} 不应出现手机号`).not.toMatch(phonePattern)
    expect(text, `${file} 不应出现儿童个人信息`).not.toMatch(childDataPattern)
  }
})
