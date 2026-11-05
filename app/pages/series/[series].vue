<script setup lang="ts">
const route = useRoute()
const seriesSlug = String(route.params.series ?? '')

const [{ data: posts }, { data: series }] = await Promise.all([
  useAsyncData(`series-posts:${seriesSlug}`, () =>
    fetchPublishedPostsBySeries(seriesSlug),
  ),
  useAsyncData(`series-meta:${seriesSlug}`, () =>
    queryCollection('series').path(`/series/${seriesSlug}`).first(),
  ),
])

if (!posts.value || posts.value.length === 0) {
  throw createError({
    statusCode: 404,
    statusMessage: '专题不存在',
    fatal: true,
  })
}

const heading = computed(() => series.value?.title ?? seriesSlug)

usePageSeo({
  title: `专题：${heading.value} · ${SITE.name}`,
  description:
    series.value?.description ??
    `专题「${heading.value}」下的全部已发布文章，按阅读顺序排列。`,
  path: route.path,
  ogTitle: `专题：${heading.value}`,
})
</script>

<template>
  <div class="taxonomy">
    <header class="taxonomy-header">
      <p class="eyebrow">专题</p>
      <h1>{{ heading }}</h1>
      <p v-if="series?.description" class="taxonomy-description">
        {{ series.description }}
      </p>
      <p class="taxonomy-count">共 {{ posts?.length ?? 0 }} 篇已发布文章</p>
    </header>

    <ul class="post-list">
      <li v-for="post in posts" :key="post.path" class="post-item">
        <NuxtLink :to="post.path" class="post-link">
          <span class="post-title">{{ post.title }}</span>
          <time :datetime="post.date">{{ post.date }}</time>
          <span class="post-description">{{ post.description }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
