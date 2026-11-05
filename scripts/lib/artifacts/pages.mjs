import {
  LICENSE_URL,
  PERSON_ID,
  SITE_ORIGIN,
  WEBSITE_ID,
} from '../../../shared/site-config.mjs'
import { assert } from './context.mjs'
import {
  findMeta,
  findTags,
  getAttribute,
  isAbsoluteUrl,
  isCalendarDate,
  nodesOfType,
  readJsonLd,
  stripTags,
} from './html.mjs'

export function validatePage(route, html) {
  const label = route || '/'

  assert(!html.includes('袁海苏'), `${label} 出现错误姓名变体「袁海苏」`)

  const titles = html.match(/<title>([\s\S]*?)<\/title>/i)
  assert(Boolean(titles?.[1]?.trim()), `${label} 缺少非空 <title>`)

  const canonicalTags = findTags(html, 'link').filter(
    (tag) => getAttribute(tag, 'rel') === 'canonical',
  )
  assert(
    canonicalTags.length === 1,
    `${label} 应只有一个 canonical，实际 ${canonicalTags.length}`,
  )

  const canonical = canonicalTags[0]
    ? getAttribute(canonicalTags[0], 'href')
    : null
  if (canonical) {
    let canonicalPath = null
    try {
      const url = new URL(canonical)
      canonicalPath = decodeURIComponent(url.pathname)
      assert(
        url.origin === SITE_ORIGIN,
        `${label} canonical 主机应为 ${SITE_ORIGIN}，实际 ${url.origin}`,
      )
    } catch {
      assert(false, `${label} 的 canonical 不是绝对 URL：${canonical}`)
    }
    assert(
      canonicalPath === (route === '/' ? '/' : route),
      `${label} 的 canonical 路径应指向自身，实际 ${canonicalPath}`,
    )
  }

  const descriptions = findMeta(html, 'name', 'description')
  assert(
    descriptions.length === 1,
    `${label} 应只有一个 meta description，实际 ${descriptions.length}`,
  )
  assert(
    Boolean(getAttribute(descriptions[0] ?? '', 'content')?.trim()),
    `${label} 的 meta description 为空`,
  )

  for (const property of [
    'og:title',
    'og:description',
    'og:image',
    'og:type',
    'og:url',
  ]) {
    const matches = findMeta(html, 'property', property)
    assert(
      matches.length === 1,
      `${label} 应只有一个 ${property}，实际 ${matches.length}`,
    )
    assert(
      Boolean(getAttribute(matches[0] ?? '', 'content')?.trim()),
      `${label} 的 ${property} 为空`,
    )
  }

  const ogUrl = getAttribute(
    findMeta(html, 'property', 'og:url')[0] ?? '',
    'content',
  )
  assert(ogUrl === canonical, `${label} 的 og:url 应与 canonical 一致`)

  for (const name of [
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
  ]) {
    const matches = findMeta(html, 'name', name)
    assert(
      matches.length === 1,
      `${label} 应只有一个 ${name}，实际 ${matches.length}`,
    )
    assert(
      Boolean(getAttribute(matches[0] ?? '', 'content')?.trim()),
      `${label} 的 ${name} 为空`,
    )
  }

  const nodes = readJsonLd(html, label)
  const types = nodes.map((node) => node?.['@type'])
  const duplicateType = types.find(
    (type, index) => type !== undefined && types.indexOf(type) !== index,
  )
  assert(!duplicateType, `${label} 存在重复 JSON-LD 类型：${duplicateType}`)

  const people = nodesOfType(nodes, 'Person')
  assert(people.length === 1, `${label} 应只有一个 Person，实际 ${people.length}`)
  const person = people[0]
  if (person) {
    assert(person['@context'] === 'https://schema.org', `${label} Person @context 错误`)
    assert(person['@id'] === PERSON_ID, `${label} Person @id 错误`)
    for (const field of ['name', 'url', 'image', 'jobTitle', 'description']) {
      assert(
        typeof person[field] === 'string' && person[field].length > 0,
        `${label} Person.${field} 为空`,
      )
    }
    assert(
      Array.isArray(person.knowsAbout) && person.knowsAbout.length > 0,
      `${label} Person.knowsAbout 为空`,
    )
    assert(
      Array.isArray(person.sameAs) &&
        person.sameAs.includes('https://github.com/yuanhaisu'),
      `${label} Person.sameAs 缺少 GitHub`,
    )
    assert(
      Array.isArray(person.sameAs) &&
        person.sameAs.includes(`${SITE_ORIGIN}/feed.xml`),
      `${label} Person.sameAs 缺少 RSS`,
    )
    assert(
      !person.sameAs?.some((url) => /zhihu\.com|weixin|wechat/i.test(String(url))),
      `${label} Person.sameAs 含未确认的知乎/微信链接`,
    )
  }

  const websites = nodesOfType(nodes, 'WebSite')
  assert(
    websites.length === 1,
    `${label} 应只有一个 WebSite，实际 ${websites.length}`,
  )
  const website = websites[0]
  if (website) {
    assert(website['@context'] === 'https://schema.org', `${label} WebSite @context 错误`)
    assert(website['@id'] === WEBSITE_ID, `${label} WebSite @id 错误`)
    assert(website.url === `${SITE_ORIGIN}/`, `${label} WebSite.url 错误`)
    assert(website.inLanguage === 'zh-CN', `${label} WebSite.inLanguage 错误`)
    assert(
      website.publisher?.['@id'] === PERSON_ID,
      `${label} WebSite.publisher 应指向 Person`,
    )
  }

  const uniqueIds = nodes
    .map((node) => node?.['@id'])
    .filter((id) => typeof id === 'string')
  assert(
    new Set(uniqueIds).size === uniqueIds.length,
    `${label} 的 JSON-LD @id 不唯一`,
  )

  const cloudflareTags = findTags(html, 'script').filter(
    (tag) => getAttribute(tag, 'id') === 'cloudflare-web-analytics',
  )
  assert(
    cloudflareTags.length === 1 &&
      getAttribute(cloudflareTags[0], 'src') ===
        'https://static.cloudflareinsights.com/beacon.min.js',
    `${label} 缺少 Cloudflare Web Analytics 配置`,
  )

  assert(
    html.includes('data-baidu-analytics="consent-required"'),
    `${label} 缺少百度统计同意门控`,
  )
  assert(
    !/<script\b[^>]*id="baidu-tongji"[^>]*>[\s\S]*?hm\.baidu\.com\/hm\.js\?/i.test(
      html,
    ),
    `${label} 未获同意前不应加载百度统计`,
  )

  assert(/<h1\b/i.test(html), `${label} 缺少 <h1>`)

  if (!route.startsWith('/posts/')) {
    assert(
      nodesOfType(nodes, 'BlogPosting').length === 0,
      `${label} 非文章页不应输出 BlogPosting`,
    )
    assert(
      nodesOfType(nodes, 'BreadcrumbList').length === 0,
      `${label} 非文章页不应输出 BreadcrumbList`,
    )
    return
  }

  const postings = nodesOfType(nodes, 'BlogPosting')
  assert(
    postings.length === 1,
    `${label} 应只有一个 BlogPosting，实际 ${postings.length}`,
  )
  const posting = postings[0]
  if (posting) {
    assert(posting['@context'] === 'https://schema.org', `${label} BlogPosting @context 错误`)
    assert(
      typeof posting.headline === 'string' && posting.headline.length > 0,
      `${label} BlogPosting.headline 为空`,
    )
    assert(
      typeof posting.description === 'string' && posting.description.length > 0,
      `${label} BlogPosting.description 为空`,
    )
    assert(
      isCalendarDate(posting.datePublished),
      `${label} BlogPosting.datePublished 不是 ISO 日期`,
    )
    assert(
      isCalendarDate(posting.dateModified),
      `${label} BlogPosting.dateModified 不是 ISO 日期`,
    )
    assert(
      posting.author?.['@id'] === PERSON_ID,
      `${label} BlogPosting.author 应指向 Person`,
    )
    assert(
      posting.publisher?.['@id'] === PERSON_ID,
      `${label} BlogPosting.publisher 应指向 Person`,
    )
    assert(
      isAbsoluteUrl(posting.mainEntityOfPage?.['@id']),
      `${label} BlogPosting.mainEntityOfPage 不是绝对 URL`,
    )
    assert(
      isAbsoluteUrl(posting.image),
      `${label} BlogPosting.image 不是绝对 URL`,
    )
    assert(posting.inLanguage === 'zh-CN', `${label} BlogPosting.inLanguage 错误`)
    assert(posting.license === LICENSE_URL, `${label} BlogPosting.license 错误`)
  }

  const breadcrumbs = nodesOfType(nodes, 'BreadcrumbList')
  assert(
    breadcrumbs.length === 1,
    `${label} 应只有一个 BreadcrumbList，实际 ${breadcrumbs.length}`,
  )
  const items = breadcrumbs[0]?.itemListElement
  assert(Array.isArray(items) && items.length >= 2, `${label} BreadcrumbList 条目不足`)
  if (Array.isArray(items)) {
    for (const [index, item] of items.entries()) {
      assert(
        item?.position === index + 1,
        `${label} BreadcrumbList 第 ${index + 1} 项 position 错误`,
      )
      assert(
        typeof item?.name === 'string' && item.name.length > 0,
        `${label} BreadcrumbList 第 ${index + 1} 项缺少 name`,
      )
      assert(
        isAbsoluteUrl(item?.item),
        `${label} BreadcrumbList 第 ${index + 1} 项 item 不是绝对 URL`,
      )
    }
  }

  const articleTag = html.match(/<article\b[^>]*>/i)?.[0] ?? ''
  assert(Boolean(articleTag), `${label} 缺少 <article>`)
  assert(
    articleTag.includes('data-pagefind-body'),
    `${label} 的 <article> 缺少 data-pagefind-body（Pagefind 不会索引）`,
  )
  assert(
    /<time\b[^>]*datetime="\d{4}-\d{2}-\d{2}"/i.test(html),
    `${label} 缺少机器可读的 <time datetime>`,
  )
  assert(html.includes('作者：袁海粟'), `${label} 缺少服务端渲染的作者信息`)

  const bodyMatch = /<div class="post-body"[^>]*>([\s\S]*)/i.exec(html)
  const bodyText = stripTags(bodyMatch?.[1] ?? '')
  assert(
    bodyText.length >= 10,
    `${label} 的正文未在服务端输出（无 JS 时不可读）`,
  )

  const commentsTag = /<section\b[^>]*id="comments"[^>]*>/i.exec(html)?.[0] ?? ''
  assert(Boolean(commentsTag), `${label} 缺少评论容器`)
  assert(
    getAttribute(commentsTag, 'data-giscus-repo') === 'yuanhaisu/blog',
    `${label} 的 Giscus repo 配置缺失`,
  )
  assert(
    Boolean(getAttribute(commentsTag, 'data-giscus-repo-id')),
    `${label} 的 Giscus repoId 配置缺失`,
  )
  assert(
    getAttribute(commentsTag, 'data-giscus-category') === 'Announcements',
    `${label} 的 Giscus category 配置缺失`,
  )
  assert(
    Boolean(getAttribute(commentsTag, 'data-giscus-category-id')),
    `${label} 的 Giscus categoryId 配置缺失`,
  )
}
