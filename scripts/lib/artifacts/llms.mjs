import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { LICENSE_URL, SITE_ORIGIN } from '../../../shared/site-config.mjs'
import { assert } from './context.mjs'
import { pathExists } from './source.mjs'

export async function validateLlms(rootDir, posts) {
  const path = join(rootDir, 'llms.txt')
  if (!(await pathExists(path))) {
    assert(false, 'llms.txt 缺失')
    return
  }

  const text = await readFile(path, 'utf8')
  assert(/^# 一人交付笔记/m.test(text), 'llms.txt 缺少站点标题')
  assert(text.includes('袁海粟（Yuan Haisu）'), 'llms.txt 缺少作者身份')
  assert(text.includes('11 年后端'), 'llms.txt 缺少可验证经历')
  assert(text.includes('AI agent 流水线'), 'llms.txt 缺少定位描述')

  for (const route of [
    '/',
    '/about',
    '/archive',
    '/privacy',
    '/feed.xml',
    '/sitemap.xml',
  ]) {
    assert(
      text.includes(`${SITE_ORIGIN}${route}`),
      `llms.txt 缺少核心页面：${route}`,
    )
  }

  for (const post of posts) {
    assert(
      text.includes(`${SITE_ORIGIN}/posts/${post.slug}`),
      `llms.txt 缺少文章索引：${post.slug}`,
    )
    assert(text.includes(post.title), `llms.txt 缺少文章标题：${post.title}`)
  }

  const indexedPosts = [
    ...text.matchAll(/https:\/\/yuanhaisu\.com\/posts\/[^\s)（]+/g),
  ].map((match) => match[0])
  assert(
    indexedPosts.length === posts.length,
    `llms.txt 文章索引数应为 ${posts.length}，实际 ${indexedPosts.length}`,
  )

  assert(text.includes('CC BY 4.0'), 'llms.txt 缺少授权声明')
  assert(text.includes(LICENSE_URL), 'llms.txt 缺少 CC BY 4.0 链接')
  assert(text.includes('hi@yuanhaisu.com'), 'llms.txt 缺少联系方式')
  assert(!text.includes('draft-example-not-published'), 'llms.txt 泄露了草稿')

  return `${posts.length} 篇文章`
}
