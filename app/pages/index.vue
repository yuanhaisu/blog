<script setup lang="ts">
const route = useRoute()

const [{ data: posts }, { data: featuredPosts }] = await Promise.all([
  useAsyncData('home-posts', () =>
    queryPublishedPosts().order('date', 'DESC').all(),
  ),
  useAsyncData('home-featured-posts', () => fetchFeaturedPosts()),
])

const profiles = useProfiles()
const wechatProfile = computed(() =>
  profiles.value.find((profile) => profile.kind === 'wechat'),
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

    <section
      v-if="featuredPosts?.length"
      class="featured"
      aria-labelledby="featured-heading"
    >
      <h2 id="featured-heading">精选文章</h2>
      <ul class="post-list">
        <PostListItem
          v-for="post in featuredPosts"
          :key="post.path"
          :post="post"
        />
      </ul>
    </section>

    <section class="latest" aria-labelledby="latest-heading">
      <h2 id="latest-heading">最新文章</h2>
      <ul class="post-list">
        <PostListItem v-for="post in posts" :key="post.path" :post="post" />
      </ul>
    </section>

    <section class="subscribe" aria-labelledby="subscribe-heading">
      <h2 id="subscribe-heading">订阅</h2>
      <p>通过 RSS 获取更新，或在微信公众号查看精选内容。</p>
      <ul class="subscribe-list">
        <li><NuxtLink to="/feed.xml">RSS 订阅</NuxtLink></li>
        <li v-if="wechatProfile?.href">
          <a :href="wechatProfile.href" rel="noopener">微信公众号</a>
        </li>
        <li v-else>
          <span>微信公众号：{{ wechatProfile?.detail }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
