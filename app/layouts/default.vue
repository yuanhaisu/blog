<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <div class="page-shell">
    <header class="site-header">
      <NuxtLink to="/" class="site-brand">一人交付笔记</NuxtLink>
      <div class="site-header-meta">
        <p class="site-byline">袁海粟（Yuan Haisu）的个人博客</p>
        <nav class="site-nav" aria-label="主导航">
          <NuxtLink to="/search">搜索</NuxtLink>
          <NuxtLink to="/archive">归档</NuxtLink>
          <NuxtLink to="/about">关于</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="site-main">
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
