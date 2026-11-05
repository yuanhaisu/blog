<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const runtimeConfig = useRuntimeConfig()

// 评论仅作为次要入口：主入口是 GitHub Discussions，国内读者引导到知乎/公众号。
const config = computed(() => ({
  repo: runtimeConfig.public.giscusRepo || GISCUS_DEFAULTS.repo,
  repoId: runtimeConfig.public.giscusRepoId || GISCUS_DEFAULTS.repoId,
  category: runtimeConfig.public.giscusCategory || GISCUS_DEFAULTS.category,
  categoryId:
    runtimeConfig.public.giscusCategoryId || GISCUS_DEFAULTS.categoryId,
}))

const discussionsUrl = computed(
  () => `https://github.com/${config.value.repo}/discussions`,
)

const profiles = useProfiles()
const domesticProfiles = computed(() =>
  profiles.value.filter((profile) => profile.domestic),
)

const section = ref<HTMLElement | null>(null)
const mountPoint = ref<HTMLElement | null>(null)
const hydrated = ref(false)
const state = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle')
const theme = ref<GiscusTheme>('light')

let giscusScript: HTMLScriptElement | null = null
let themeQuery: MediaQueryList | null = null
let themeObserver: MutationObserver | null = null

function documentTheme(): GiscusTheme {
  const attribute = document.documentElement.dataset.theme
  if (attribute === 'dark' || attribute === 'light') {
    return attribute
  }

  try {
    const stored = window.localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') {
      return stored
    }
  } catch {
    // Storage may be blocked; fall back to the system preference.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function notifyGiscusTheme(next: GiscusTheme) {
  const iframe = section.value?.querySelector<HTMLIFrameElement>(
    'iframe.giscus-frame',
  )
  iframe?.contentWindow?.postMessage(
    { giscus: { setConfig: { theme: next } } },
    'https://giscus.app',
  )
}

function applyTheme(next: GiscusTheme) {
  if (next === theme.value) return
  theme.value = next

  // 脚本尚未执行完时更新属性；iframe 已存在时通过 Giscus 的 postMessage 同步。
  giscusScript?.setAttribute('data-theme', next)
  notifyGiscusTheme(next)
}

// 只有进入视口或用户主动交互后才把外部脚本插入页面，避免首屏加载 Giscus。
function loadComments() {
  if (state.value !== 'idle' || !mountPoint.value) return

  state.value = 'loading'

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.async = true
  script.crossOrigin = 'anonymous'
  script.setAttribute('data-repo', config.value.repo)
  script.setAttribute('data-repo-id', config.value.repoId)
  script.setAttribute('data-category', config.value.category)
  script.setAttribute('data-category-id', config.value.categoryId)
  script.setAttribute('data-mapping', 'pathname')
  script.setAttribute('data-strict', '1')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'bottom')
  script.setAttribute('data-theme', theme.value)
  script.setAttribute('data-lang', 'zh-CN')
  script.setAttribute('data-loading', 'lazy')
  script.addEventListener('load', () => {
    state.value = 'loaded'
  })
  script.addEventListener('error', () => {
    state.value = 'error'
  })

  giscusScript = script
  mountPoint.value.appendChild(script)
}

onMounted(() => {
  hydrated.value = true

  // 站点主题以 <html data-theme> 为准（由主题初始化脚本和 ThemeToggle
  // 维护）；localStorage 与系统偏好只是它缺失时的兜底。
  theme.value = documentTheme()
  themeQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const onThemeChange = () => {
    applyTheme(documentTheme())
  }
  themeQuery.addEventListener('change', onThemeChange)

  themeObserver = new MutationObserver(onThemeChange)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })

  let observer: IntersectionObserver | null = null

  if ('IntersectionObserver' in window && section.value) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadComments()
          observer?.disconnect()
        }
      },
      // 提前一点加载，滚动到评论区时内容通常已就绪。
      { rootMargin: '200px' },
    )

    observer.observe(section.value)
  }

  onBeforeUnmount(() => {
    observer?.disconnect()
    themeObserver?.disconnect()
    themeQuery?.removeEventListener('change', onThemeChange)
  })
})
</script>

<template>
  <section
    id="comments"
    ref="section"
    class="post-comments"
    aria-labelledby="comments-heading"
    :data-giscus-repo="config.repo"
    :data-giscus-repo-id="config.repoId"
    :data-giscus-category="config.category"
    :data-giscus-category-id="config.categoryId"
    :data-giscus-state="state"
    :data-giscus-theme="theme"
  >
    <h2 id="comments-heading">评论</h2>
    <p class="post-comments-intro">
      评论由 Giscus 提供，内容保存在 GitHub Discussions，需要 GitHub
      账号参与。本站不建立评论数据库，也不保存评论副本。
    </p>

    <aside
      class="post-comments-domestic"
      aria-labelledby="comments-domestic-heading"
    >
      <h3 id="comments-domestic-heading">国内读者讨论入口</h3>
      <p>
        不方便使用 GitHub？欢迎到知乎或微信公众号继续讨论同一个话题。
      </p>
      <ul class="post-comments-domestic-links">
        <SiteProfileLinks :profiles="domesticProfiles" />
      </ul>
      <p>
        <NuxtLink to="/about">在关于页查看作者的全部公开入口</NuxtLink>
      </p>
    </aside>

    <p class="post-comments-direct">
      也可以直接前往
      <a :href="discussionsUrl" rel="noopener noreferrer">GitHub Discussions</a>
      查看或参与讨论。
    </p>

    <div v-if="hydrated" class="post-comments-loader">
      <button
        v-if="state === 'idle'"
        type="button"
        class="post-comments-load"
        @click="loadComments"
      >
        加载评论
      </button>
      <p v-else-if="state === 'loading'" role="status">
        评论加载中…
      </p>
      <p v-else-if="state === 'error'" class="post-comments-error" role="status">
        评论加载失败。可以前往
        <a :href="discussionsUrl" rel="noopener noreferrer">
          GitHub Discussions
        </a>
        查看或参与讨论。
      </p>
    </div>

    <div ref="mountPoint" class="giscus-container" />

    <noscript>
      <p class="post-comments-fallback">
        评论需要启用 JavaScript 才能加载。
      </p>
      <p class="post-comments-fallback">
        也可以直接前往
        <a :href="discussionsUrl">GitHub Discussions</a>
        查看或参与讨论。
      </p>
    </noscript>
  </section>
</template>
