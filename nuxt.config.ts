export default defineNuxtConfig({
  modules: ['@nuxt/content', './modules/content-guardrails'],
  compatibilityDate: '2026-11-05',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
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
