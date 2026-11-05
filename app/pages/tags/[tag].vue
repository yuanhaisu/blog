<script setup lang="ts">
const route = useRoute()
const tag = String(route.params.tag ?? '')

const { data: posts } = await useAsyncData(`tag:${tag}`, () =>
  fetchPublishedPostsByTag(tag),
)

if (!posts.value || posts.value.length === 0) {
  throw createError({
    statusCode: 404,
    statusMessage: '标签不存在',
    fatal: true,
  })
}

usePageSeo({
  title: `标签：${tag} · ${SITE.name}`,
  description: `标签「${tag}」下的全部已发布文章。`,
  path: route.path,
  ogTitle: `标签：${tag}`,
})
</script>

<template>
  <div class="taxonomy">
    <header class="taxonomy-header">
      <p class="eyebrow">标签</p>
      <h1>{{ tag }}</h1>
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
