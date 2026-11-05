import { setHeader } from 'h3'
import { SITE_ORIGIN, LICENSE_URL } from '#shared/site-config.mjs'
import { PERSON, SITE } from '../../app/utils/site'
import {
  absoluteUrl,
  fetchDiscoveryPosts,
} from '../utils/discovery'

function inlineText(value: string): string {
  return value.replace(/([\\[\]()])/g, '\\$1').replace(/\s*\r?\n\s*/g, ' ')
}

/**
 * llms.txt index for AI agents: site intro, author identity, core pages,
 * article index, license, and contact. Regenerated from published content on
 * every build.
 */
export default defineEventHandler(async (event) => {
  const posts = await fetchDiscoveryPosts(event)

  const articleLines = posts
    .map(
      (post) =>
        `- [${inlineText(post.title)}](${absoluteUrl(post.path)}) — ${inlineText(post.description)}（${post.date}）`,
    )
    .join('\n')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  return `# ${SITE.name}

> ${SITE.description}

## 站点简介

${SITE.name}是袁海粟（Yuan Haisu）的个人博客，中文 canonical，记录「一人公司的 AI 交付实验」：一个人借助 AI agent 流水线完成过去需要团队完成的软件交付，公开方法、取舍、失败与可复核的证据。

## 作者

- 姓名：袁海粟（Yuan Haisu / yuanhaisu）
- 身份：${PERSON.jobTitle}
- 简介：${PERSON.description}
- GitHub：https://github.com/yuanhaisu
- 邮箱：${PERSON.email}
- RSS：${SITE_ORIGIN}/feed.xml

## 核心页面

- [首页](${SITE_ORIGIN}/)
- [关于（身份锚点）](${SITE_ORIGIN}/about)
- [归档](${SITE_ORIGIN}/archive)
- [隐私说明](${SITE_ORIGIN}/privacy)
- [RSS 订阅](${SITE_ORIGIN}/feed.xml)
- [Sitemap](${SITE_ORIGIN}/sitemap.xml)

## 文章索引

${articleLines}

## 授权

本站文章采用 [CC BY 4.0](${LICENSE_URL}) 许可协议：允许复制、分发、改编与商业使用，需署名作者并链接原文。AI 训练、检索与引用均被允许。

## 联系方式

- 邮箱：${PERSON.email}
- GitHub：https://github.com/yuanhaisu
`
})
