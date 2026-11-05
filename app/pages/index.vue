<script setup lang="ts">
const route = useRoute()

const { data: posts } = await useAsyncData('home-posts', () =>
  queryPublishedPosts().order('date', 'DESC').all(),
)

usePageSeo({
  title: SITE.name,
  description: SITE.description,
  path: route.path,
  ogTitle: SITE.name,
})
</script>

<template>
  <div class="home">
    <section class="hero">
      <p class="eyebrow">袁海粟（Yuan Haisu）的个人博客</p>
      <h1>一人交付笔记</h1>
      <p class="positioning">
        记录一个人借助 AI agent 流水线完成软件交付的真实实验。
      </p>
      <p class="intro">
        十一年的后端与分布式系统经验，四年半的数据分析团队管理，以及把 AI
        模型服务、LLM 工具编排和一人 + 多 agent 流水线真正落到项目里的过程。
        这里写下方法、取舍、失败与可复核的证据。
      </p>
    </section>

    <section class="latest" aria-labelledby="latest-heading">
      <h2 id="latest-heading">最新文章</h2>
      <ul class="post-list">
        <li v-for="post in posts" :key="post.path" class="post-item">
          <NuxtLink :to="post.path" class="post-link">
            <span class="post-title">{{ post.title }}</span>
            <time :datetime="post.date">{{ post.date }}</time>
            <span class="post-description">{{ post.description }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
