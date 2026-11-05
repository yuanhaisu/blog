/**
 * Apply a stored or system theme before first paint so a cold load never
 * flashes the wrong palette. Without JavaScript, the CSS media query still
 * follows `prefers-color-scheme`.
 */
const themeInitScript = `(function(){try{var stored=localStorage.getItem('theme');var dark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=stored==='light'||stored==='dark'?stored:(dark?'dark':'light');document.documentElement.setAttribute('data-theme',theme);}catch(e){}})();`

export default defineNuxtConfig({
  modules: ['@nuxt/content', './modules/content-guardrails'],
  compatibilityDate: '2026-11-05',
  devtools: { enabled: false },
  // Static hosting needs a real, server-rendered 404.html; without this Nuxt
  // emits an empty SPA shell that leaves no-JS visitors with a blank page.
  experimental: {
    prerenderErrorPages: true,
  },
  // High-contrast Shiki themes keep syntax colours above WCAG AA on the
  // light code surface and the dark one (github-light/github-dark have a few
  // tokens below 4.5:1).
  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-light-high-contrast',
            dark: 'github-dark-high-contrast',
          },
        },
      },
    },
  },
  css: ['~/assets/css/fonts.css', '~/assets/css/main.css'],
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
      meta: [{ name: 'color-scheme', content: 'light dark' }],
      script: [
        {
          key: 'theme-init',
          tagPosition: 'head',
          innerHTML: themeInitScript,
        },
      ],
    },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
    },
  },
})
