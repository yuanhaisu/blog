<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number
    statusMessage?: string
  }
}>()

const isNotFound = computed(() => props.error?.statusCode === 404)
const heading = computed(() =>
  isNotFound.value ? '页面不存在' : '页面出错了',
)
const year = new Date().getFullYear()

useHead({
  title: computed(() =>
    isNotFound.value
      ? `404 · ${heading.value} · ${SITE.name}`
      : `${heading.value} · ${SITE.name}`,
  ),
  htmlAttrs: { lang: 'zh-CN' },
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<template>
  <div class="page-shell error-page">
    <header class="site-header">
      <a class="skip-link" href="#main-content">跳到主要内容</a>
      <a class="site-brand" href="/">一人交付笔记</a>
      <div class="site-header-meta">
        <ThemeToggle />
      </div>
    </header>

    <main id="main-content" class="site-main" tabindex="-1">
      <p class="eyebrow">{{ isNotFound ? '404' : '错误' }}</p>
      <h1>{{ heading }}</h1>
      <p class="error-lede">
        <template v-if="isNotFound">
          你访问的页面不存在，或已经被移动。可以从下面的入口继续浏览。
        </template>
        <template v-else>
          页面暂时无法显示。可以返回首页，或浏览全部文章。
        </template>
      </p>

      <nav class="error-actions" aria-label="错误页面导航">
        <a class="error-action" href="/">返回首页</a>
        <a class="error-action" href="/archive">浏览全部文章</a>
      </nav>
    </main>

    <footer class="site-footer">
      <p>© {{ year }} 袁海粟（Yuan Haisu）</p>
      <p>一人交付实验 · 中文 canonical</p>
    </footer>
  </div>
</template>
