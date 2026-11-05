import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { assert } from './context.mjs'
import { assertWellFormedXml } from './html.mjs'
import { SITE_ORIGIN, pathExists } from './source.mjs'

export async function validateFeed(rootDir, posts) {
  const path = join(rootDir, 'feed.xml')
  if (!(await pathExists(path))) {
    assert(false, 'feed.xml 缺失')
    return
  }

  const xml = await readFile(path, 'utf8')
  assertWellFormedXml(xml, 'feed.xml')
  assert(/<rss\b[^>]*version="2\.0"/.test(xml), 'feed.xml 不是 RSS 2.0')

  const channel = /<channel>([\s\S]*?)<\/channel>/.exec(xml)?.[1] ?? ''
  const channelValue = (tag) =>
    new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(channel)?.[1]?.trim() ?? ''

  assert(channelValue('title') === '一人交付笔记', 'feed.xml 频道标题错误')
  assert(channelValue('link') === `${SITE_ORIGIN}/`, 'feed.xml 频道链接错误')
  assert(channelValue('description').length > 0, 'feed.xml 频道描述为空')
  assert(channelValue('language') === 'zh-CN', 'feed.xml 语言错误')
  assert(channelValue('copyright').includes('CC BY 4.0'), 'feed.xml 缺少 CC BY 4.0 授权')
  assert(
    !Number.isNaN(Date.parse(channelValue('lastBuildDate'))),
    'feed.xml lastBuildDate 无法解析',
  )

  const items = [...channel.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(
    (match) => match[1],
  )
  assert(
    items.length === posts.length,
    `feed.xml 条目数应为 ${posts.length}，实际 ${items.length}`,
  )

  const itemLinks = []
  for (const item of items) {
    const value = (tag) =>
      new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(item)?.[1]?.trim() ?? ''

    const title = value('title')
    const link = value('link')
    const pubDate = value('pubDate')
    const author = value('author')
    const description = value('description')

    assert(title.length > 0, 'feed.xml 条目缺少标题')
    assert(
      link.startsWith(`${SITE_ORIGIN}/posts/`),
      `feed.xml 条目链接不是文章绝对 URL：${link}`,
    )
    assert(
      !Number.isNaN(Date.parse(pubDate)),
      `feed.xml 条目 pubDate 无法解析：${link}`,
    )
    assert(author.includes('袁海粟'), `feed.xml 条目缺少作者：${link}`)
    assert(description.length > 0, `feed.xml 条目缺少摘要：${link}`)
    itemLinks.push(link)
  }

  for (const post of posts) {
    assert(
      itemLinks.includes(`${SITE_ORIGIN}/posts/${post.slug}`),
      `feed.xml 缺少文章：${post.slug}`,
    )
  }

  assert(!xml.includes('draft-example-not-published'), 'feed.xml 泄露了草稿')

  return `${items.length} 条`
}
