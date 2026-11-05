import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { assert } from './context.mjs'
import { pathExists } from './source.mjs'

export async function validateContentDump(rootDir) {
  const path = join(rootDir, '__nuxt_content/posts/sql_dump.txt')
  if (!(await pathExists(path))) {
    assert(false, '__nuxt_content/posts/sql_dump.txt 缺失')
    return
  }

  const raw = (await readFile(path, 'utf8')).trim()
  let dump = raw
  if (raw.startsWith('H4sI')) {
    try {
      dump = gunzipSync(Buffer.from(raw, 'base64')).toString('utf8')
    } catch {
      assert(false, '内容数据库转储无法解压')
      return
    }
  }

  assert(
    !dump.includes('draft-example-not-published'),
    '内容数据库转储泄露了草稿路由',
  )
  assert(
    !dump.includes('草稿示例：这篇不会发布'),
    '内容数据库转储泄露了草稿标题',
  )

  return '未包含草稿'
}
