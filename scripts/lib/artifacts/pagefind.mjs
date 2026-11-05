import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { assert } from './context.mjs'
import { pathExists } from './source.mjs'

export async function validatePagefind(rootDir, posts) {
  const entryPath = join(rootDir, 'pagefind/pagefind-entry.json')
  if (!(await pathExists(entryPath))) {
    assert(false, 'pagefind/pagefind-entry.json 缺失')
    return
  }

  let entry
  try {
    entry = JSON.parse(await readFile(entryPath, 'utf8'))
  } catch (error) {
    assert(false, `Pagefind 索引元数据无法解析：${error.message}`)
    return
  }

  const language = entry.languages?.['zh-cn']
  assert(Boolean(language), 'Pagefind 未生成 zh-cn 中文索引')
  assert(
    Number(language?.page_count) === posts.length,
    `Pagefind 索引文章数应为 ${posts.length}，实际 ${language?.page_count}`,
  )
  assert(
    await pathExists(join(rootDir, 'pagefind/index')),
    'Pagefind 索引目录缺失',
  )

  return `${language?.page_count ?? 0} 篇（zh-cn）`
}
