<script setup lang="ts">
interface PagefindResultData {
  url: string
  excerpt: string
  meta?: { title?: string }
}

interface PagefindResult {
  data: () => Promise<PagefindResultData>
}

interface PagefindApi {
  options: (options: { excerptLength?: number }) => Promise<void> | void
  search: (query: string) => Promise<{ results: PagefindResult[] }>
}

interface SearchResult {
  url: string
  title: string
  excerpt: string
}

type SearchStatus =
  | 'idle'
  | 'loading'
  | 'results'
  | 'empty'
  | 'empty-query'
  | 'error'

const route = useRoute()
const router = useRouter()

const query = ref('')
const searchedQuery = ref('')
const results = ref<SearchResult[]>([])
const status = ref<SearchStatus>('idle')

let pagefindLoader: Promise<PagefindApi> | null = null
let latestRun = 0

useHead({
  title: `搜索 · ${SITE.name}`,
  meta: [
    {
      name: 'description',
      content: '在「一人交付笔记」中搜索文章。搜索在浏览器本地完成，不需要服务器。',
    },
  ],
  // Defense in depth: the build only indexes `/posts/**`, and this keeps the
  // search page out of the index even if the glob ever changes.
  htmlAttrs: { 'data-pagefind-ignore': '' },
})

function loadPagefind(): Promise<PagefindApi> {
  if (!pagefindLoader) {
    // The index is generated after `nuxt generate`, so it is not part of the
    // client bundle. The variable specifier plus @vite-ignore keeps Vite from
    // trying to resolve it at build time.
    const pagefindUrl = '/pagefind/pagefind.js'
    pagefindLoader = import(/* @vite-ignore */ pagefindUrl) as Promise<PagefindApi>
  }

  return pagefindLoader
}

/** Pagefind returns directory URLs with a trailing slash; the site does not. */
function normalizeResultUrl(url: string): string {
  return url.length > 1 ? url.replace(/\/+$/, '') : url
}

function resultTitle(data: PagefindResultData): string {
  return (
    data.meta?.title?.replace(/\s*·\s*一人交付笔记\s*$/, '') ?? data.url
  )
}

/**
 * Pagefind treats multi-term queries as OR. Chinese segmentation then splits a
 * query into single characters, so a query like「跨站追踪」would match every
 * article containing「站」。Quoting the whole query makes Pagefind require the
 * phrase, which is the precision Chinese readers expect from site search.
 */
function toPagefindQuery(term: string): string {
  return `"${term.replace(/"/g, ' ').replace(/\s+/g, ' ').trim()}"`
}

async function runSearch(rawTerm: string): Promise<void> {
  const term = rawTerm.trim()
  const run = ++latestRun

  searchedQuery.value = term
  results.value = []

  if (!term) {
    status.value = 'empty-query'
    return
  }

  status.value = 'loading'

  try {
    const pagefind = await loadPagefind()
    await pagefind.options({ excerptLength: 40 })
    const search = await pagefind.search(toPagefindQuery(term))
    const entries = await Promise.all(
      search.results.map((result) => result.data()),
    )

    if (run !== latestRun) return

    results.value = entries.map((entry) => ({
      url: normalizeResultUrl(entry.url),
      title: resultTitle(entry),
      excerpt: entry.excerpt,
    }))
    status.value = results.value.length > 0 ? 'results' : 'empty'
  } catch (error) {
    if (run !== latestRun) return
    console.error('站内搜索加载失败', error)
    status.value = 'error'
  }
}

function submitSearch(): void {
  const term = query.value.trim()
  router.replace({ query: term ? { q: term } : {} })
  void runSearch(term)
}

onMounted(() => {
  const initial = typeof route.query.q === 'string' ? route.query.q : ''

  if (initial.trim()) {
    query.value = initial
    void runSearch(initial)
  }
})
</script>

<template>
  <section class="search-page">
    <header class="search-header">
      <p class="eyebrow">站内搜索</p>
      <h1>搜索文章</h1>
      <form class="search-form" role="search" @submit.prevent="submitSearch">
        <label for="search-input" class="visually-hidden">搜索文章</label>
        <input
          id="search-input"
          v-model="query"
          type="search"
          name="q"
          autocomplete="off"
          placeholder="输入关键词，例如：一人交付、分布式系统"
        />
        <button type="submit">搜索</button>
      </form>
    </header>

    <p v-if="status === 'idle'" class="search-hint">
      输入关键词开始搜索。搜索在浏览器本地完成，不会把查询发送到服务器。
    </p>
    <p v-else-if="status === 'loading'" class="search-hint" role="status">
      正在搜索…
    </p>
    <p v-else-if="status === 'empty-query'" class="search-hint" role="status">
      请输入关键词后再搜索。
    </p>
    <template v-else-if="status === 'results'">
      <p class="search-count" role="status">
        找到 {{ results.length }} 篇相关文章
      </p>
      <ol class="search-results" aria-label="搜索结果">
        <li
          v-for="result in results"
          :key="result.url"
          class="search-result"
        >
          <NuxtLink :to="result.url" class="search-result-title">
            {{ result.title }}
          </NuxtLink>
          <!-- Pagefind excerpts are generated from the site's own indexed
               content and only add <mark> tags; the article text is escaped. -->
          <p class="search-result-excerpt" v-html="result.excerpt" />
        </li>
      </ol>
    </template>
    <div v-else-if="status === 'empty'" class="search-empty" role="status">
      <p>没有找到与「{{ searchedQuery }}」匹配的文章。</p>
      <p>
        可以换一个关键词，或者浏览<NuxtLink to="/archive">文章归档</NuxtLink>与<NuxtLink to="/">首页</NuxtLink>。
      </p>
    </div>
    <p v-else-if="status === 'error'" class="search-hint" role="alert">
      搜索暂时不可用，请刷新页面后重试。也可以直接浏览<NuxtLink to="/archive">文章归档</NuxtLink>。
    </p>
  </section>
</template>
