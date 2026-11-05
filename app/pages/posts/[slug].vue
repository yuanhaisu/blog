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

const seriesSlug = post.value.series
const { data: seriesMeta } = await useAsyncData(
  `post-series:${seriesSlug ?? ''}`,
  () =>
    seriesSlug
      ? queryCollection('series').path(`/series/${seriesSlug}`).first()
      : Promise.resolve(null),
)

const canonicalUrl = `${SITE.url}${route.path}`

useHead({
  title: `${post.value.title} · ${SITE.name}`,
  link: [{ rel: 'canonical', href: canonicalUrl }],
})
</script>

<template>
  <article v-if="post" class="post">
    <header class="post-header">
      <p class="eyebrow">一人交付笔记</p>
      <h1>{{ post.title }}</h1>
      <p class="post-meta">
        <span>作者：袁海粟</span>
        <time :datetime="post.date">{{ post.date }}</time>
      </p>
      <p class="post-deck">{{ post.description }}</p>
    </header>

    <nav v-if="post.series" class="post-taxonomy" aria-label="文章专题">
      <span class="post-taxonomy-label">专题：</span>
      <NuxtLink :to="`/series/${encodeURIComponent(post.series)}`">
        {{ seriesMeta?.title ?? post.series }}
      </NuxtLink>
    </nav>

    <nav v-if="post.tags?.length" class="post-taxonomy" aria-label="文章标签">
      <span class="post-taxonomy-label">标签：</span>
      <ul class="tag-list">
        <li v-for="tag in post.tags" :key="tag">
          <NuxtLink :to="`/tags/${encodeURIComponent(tag)}`">{{ tag }}</NuxtLink>
        </li>
      </ul>
    </nav>

    <div class="post-body">
      <ContentRenderer :value="post" />
    </div>
  </article>
</template>
