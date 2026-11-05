export default defineNuxtConfig({
  modules: ['@nuxt/content', './modules/content-guardrails'],
  compatibilityDate: '2026-11-05',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // 站点 ID 不是密钥；生产构建用 NUXT_PUBLIC_* 环境变量覆盖。
      cloudflareAnalyticsToken: '',
      baiduAnalyticsId: '',
      // Giscus 配置不是密钥；repoId / categoryId 由站点所有者在部署环境提供。
      giscusRepo: '',
      giscusRepoId: '',
      giscusCategory: '',
      giscusCategoryId: '',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
    },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      // Discovery artifacts are generated from content on every build.
      routes: ['/sitemap.xml', '/feed.xml', '/robots.txt', '/llms.txt'],
    },
  },
})
