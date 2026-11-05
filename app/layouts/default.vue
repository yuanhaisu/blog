<script setup lang="ts">
const route = useRoute()
const year = new Date().getFullYear()

function isCurrent(path: string) {
  return route.path === path
}
</script>

<template>
  <div class="page-shell">
    <header class="site-header">
      <a class="skip-link" href="#main-content">跳到主要内容</a>
      <NuxtLink to="/" class="site-brand">一人交付笔记</NuxtLink>
      <div class="site-header-meta">
        <p class="site-byline">袁海粟（Yuan Haisu）的个人博客</p>
        <nav class="site-nav" aria-label="主导航">
          <NuxtLink
            to="/"
            :aria-current="isCurrent('/') ? 'page' : undefined"
          >
            首页
          </NuxtLink>
          <NuxtLink
            to="/archive"
            :aria-current="isCurrent('/archive') ? 'page' : undefined"
          >
            归档
          </NuxtLink>
          <NuxtLink
            to="/about"
            :aria-current="isCurrent('/about') ? 'page' : undefined"
          >
            关于
          </NuxtLink>
        </nav>
        <ThemeToggle />
      </div>
    </header>

    <main id="main-content" class="site-main" tabindex="-1">
      <slot />
    </main>

    <footer class="site-footer">
      <p>© {{ year }} 袁海粟（Yuan Haisu）</p>
      <p>一人交付实验 · 中文 canonical</p>
      <p><NuxtLink to="/privacy">隐私说明</NuxtLink></p>
    </footer>

    <SitePersonJsonLd />
    <SiteAnalytics />
  </div>
</template>
