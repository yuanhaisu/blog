<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <div class="page-shell">
    <header class="site-header">
      <NuxtLink to="/" class="site-brand">一人交付笔记</NuxtLink>
      <p class="site-byline">袁海粟（Yuan Haisu）的个人博客</p>
    </header>

    <main class="site-main">
      <slot />
    </main>

    <footer class="site-footer">
      <p>© {{ year }} 袁海粟（Yuan Haisu）</p>
      <p>一人交付实验 · 中文 canonical</p>
      <p><NuxtLink to="/privacy">隐私说明</NuxtLink></p>
    </footer>

    <SiteAnalytics />
  </div>
</template>
