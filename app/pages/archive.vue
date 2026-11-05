<script setup lang="ts">
const route = useRoute()

const { data: posts } = await useAsyncData('archive-posts', () =>
  fetchPublishedPostsByDate(),
)

const groups = computed(() => groupPostsByMonth(posts.value ?? []))

usePageSeo({
  title: `归档 · ${SITE.name}`,
  description: `按时间浏览${SITE.name}的全部已发布文章。`,
  path: route.path,
  ogTitle: '归档',
})
</script>

<template>
  <div class="archive">
    <header class="taxonomy-header">
      <p class="eyebrow">按时间浏览</p>
      <h1>归档</h1>
      <p class="taxonomy-count">共 {{ posts?.length ?? 0 }} 篇已发布文章</p>
    </header>

    <section
      v-for="yearGroup in groups"
      :key="yearGroup.year"
      class="archive-year"
    >
      <h2>{{ yearGroup.year }} 年</h2>

      <section
        v-for="monthGroup in yearGroup.months"
        :key="monthGroup.month"
        class="archive-month"
        :aria-labelledby="`archive-${yearGroup.year}-${monthGroup.month}`"
      >
        <h3 :id="`archive-${yearGroup.year}-${monthGroup.month}`">
          {{ yearGroup.year }} 年 {{ monthGroup.month }} 月
        </h3>

        <ul class="post-list">
          <li v-for="post in monthGroup.posts" :key="post.path" class="post-item">
            <NuxtLink :to="post.path" class="post-link">
              <span class="post-title">{{ post.title }}</span>
              <time :datetime="post.date">{{ post.date }}</time>
              <span class="post-description">{{ post.description }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </section>
  </div>
</template>
