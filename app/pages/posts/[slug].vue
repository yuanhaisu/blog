<script setup lang="ts">
const route = useRoute()

const { data: post } = await useAsyncData(`post:${route.path}`, () =>
  queryPublishedPosts().path(route.path).first(),
)

if (!post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '文章不存在',
    fatal: true,
  })
}

const readingMinutes = computed(() =>
  estimateReadingMinutes(post.value?.body),
)

interface TocLink {
  id?: string
  depth: number
  text: string
  children?: TocLink[]
}

function flattenToc(links: TocLink[], out: TocLink[] = []): TocLink[] {
  for (const link of links) {
    out.push(link)
    if (link.children?.length) {
      flattenToc(link.children, out)
    }
  }
  return out
}

const tocLinks = computed<TocLink[]>(() => {
  const body = post.value?.body as
    | { toc?: { links?: TocLink[] } }
    | undefined

  return flattenToc(body?.toc?.links ?? []).filter(
    (link) => link.id && (link.depth === 2 || link.depth === 3),
  )
})

const { data: orderedPosts } = await useAsyncData('published-posts-ordered', () =>
  queryPublishedPosts().order('date', 'ASC').all(),
)

const currentIndex = computed(() =>
  (orderedPosts.value ?? []).findIndex((entry) => entry.path === post.value?.path),
)

const previousPost = computed(() => {
  const posts = orderedPosts.value ?? []
  return currentIndex.value > 0 ? posts[currentIndex.value - 1] : undefined
})

const nextPost = computed(() => {
  const posts = orderedPosts.value ?? []
  return currentIndex.value >= 0 ? posts[currentIndex.value + 1] : undefined
})

const relatedPosts = computed(() => {
  const tags = new Set(post.value?.tags ?? [])

  return (orderedPosts.value ?? [])
    .filter((entry) => entry.path !== post.value?.path)
    .map((entry) => ({
      entry,
      sharedTags: entry.tags.filter((tag) => tags.has(tag)).length,
    }))
    .filter(({ sharedTags }) => sharedTags > 0)
    .sort(
      (a, b) =>
        b.sharedTags - a.sharedTags || b.entry.date.localeCompare(a.entry.date),
    )
    .slice(0, 3)
    .map(({ entry }) => entry)
})

const seriesSlug = post.value.series
const { data: seriesMeta } = await useAsyncData(
  `post-series:${seriesSlug ?? ''}`,
  () =>
    seriesSlug
      ? queryCollection('series').path(`/series/${seriesSlug}`).first()
      : Promise.resolve(null),
)

const { canonicalUrl } = usePageSeo({
  title: `${post.value.title} · ${SITE.name}`,
  description: post.value.description,
  path: route.path,
  type: 'article',
  ogTitle: post.value.title,
  publishedTime: post.value.date,
  modifiedTime: post.value.updated ?? post.value.date,
  locale: post.value.lang === 'en' ? 'en_US' : 'zh_CN',
})

useJsonLd([
  {
    key: 'article-blogposting',
    data: buildBlogPostingJsonLd(
      post.value,
      canonicalUrl,
      absoluteUrl(SITE.defaultImage),
    ),
  },
  {
    key: 'article-breadcrumb',
    data: buildBreadcrumbListJsonLd([
      { name: '首页', url: absoluteUrl('/') },
      { name: '归档', url: absoluteUrl('/archive') },
      { name: post.value.title, url: canonicalUrl },
    ]),
  },
])
</script>

<template>
  <article v-if="post" class="post" data-pagefind-body>
    <header class="post-header">
      <p class="eyebrow">一人交付笔记</p>
      <h1 data-pagefind-meta="title">{{ post.title }}</h1>
      <p class="post-meta">
        <span>作者：袁海粟</span>
        <time :datetime="post.date">{{ post.date }}</time>
        <time v-if="post.updated" :datetime="post.updated">
          更新于 {{ post.updated }}
        </time>
        <span>阅读约 {{ readingMinutes }} 分钟</span>
      </p>
      <p class="post-deck">{{ post.description }}</p>
    </header>

    <nav v-if="post.series" class="post-taxonomy" aria-label="文章专题">
      <span class="post-taxonomy-label">专题：</span>
      <NuxtLink
        v-if="seriesMeta"
        :to="`/series/${encodeURIComponent(post.series)}`"
      >
        {{ seriesMeta.title ?? post.series }}
      </NuxtLink>
      <span v-else>{{ post.series }}</span>
    </nav>

    <nav v-if="post.tags?.length" class="post-taxonomy" aria-label="文章标签">
      <span class="post-taxonomy-label">标签：</span>
      <ul class="tag-list">
        <li v-for="tag in post.tags" :key="tag">
          <NuxtLink :to="`/tags/${encodeURIComponent(tag)}`">{{ tag }}</NuxtLink>
        </li>
      </ul>
    </nav>

    <nav v-if="tocLinks.length" class="post-toc" aria-labelledby="toc-heading">
      <h2 id="toc-heading">目录</h2>
      <ol>
        <li
          v-for="link in tocLinks"
          :key="link.id"
          :class="`post-toc-depth-${link.depth}`"
        >
          <a :href="`#${link.id}`">{{ link.text }}</a>
        </li>
      </ol>
    </nav>

    <div class="post-body">
      <ContentRenderer :value="post" />
    </div>

    <CodeCopyEnhancer :content-key="post.path" />

    <nav
      v-if="previousPost || nextPost"
      class="post-pagination"
      aria-label="文章导航"
    >
      <NuxtLink v-if="previousPost" :to="previousPost.path" rel="prev">
        上一篇：{{ previousPost.title }}
      </NuxtLink>
      <NuxtLink v-if="nextPost" :to="nextPost.path" rel="next">
        下一篇：{{ nextPost.title }}
      </NuxtLink>
    </nav>

    <footer class="post-footer">
      <section class="post-license" aria-labelledby="license-heading">
        <h2 id="license-heading">授权与转载</h2>
        <p>
          本文采用
          <a href="https://creativecommons.org/licenses/by/4.0/" rel="license">
            CC BY 4.0
          </a>
          许可协议，转载请注明作者与原文链接。
        </p>
        <p>
          原文链接：<a :href="canonicalUrl">{{ canonicalUrl }}</a>
        </p>
        <p>
          袁海粟（Yuan Haisu）是本文作者，记录一个人借助 AI agent
          流水线完成软件交付的真实实验。
        </p>
      </section>

      <nav
        v-if="relatedPosts.length"
        class="post-related"
        aria-labelledby="related-heading"
      >
        <h2 id="related-heading">相关文章</h2>
        <ul>
          <li v-for="related in relatedPosts" :key="related.path">
            <NuxtLink :to="related.path">{{ related.title }}</NuxtLink>
          </li>
        </ul>
      </nav>
    </footer>
  </article>
</template>
