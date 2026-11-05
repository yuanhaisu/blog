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

    <div class="post-body">
      <ContentRenderer :value="post" />
    </div>
  </article>
</template>
