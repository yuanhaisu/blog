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
    },
  },
})
