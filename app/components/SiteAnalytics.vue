<script setup lang="ts">
import { onMounted, ref } from 'vue'

const runtimeConfig = useRuntimeConfig()

const cloudflareToken =
  runtimeConfig.public.cloudflareAnalyticsToken ||
  PLACEHOLDER_CLOUDFLARE_ANALYTICS_TOKEN
const baiduSiteId =
  runtimeConfig.public.baiduAnalyticsId || PLACEHOLDER_BAIDU_ANALYTICS_SITE_ID

// Cloudflare Web Analytics is cookieless and can load immediately.
useHead({
  script: [
    {
      id: 'cloudflare-web-analytics',
      src: 'https://static.cloudflareinsights.com/beacon.min.js',
      defer: true,
      'data-cf-beacon': JSON.stringify({ token: cloudflareToken }),
      tagPosition: 'bodyClose',
      tagPriority: 'low',
    },
  ],
})

const CONSENT_KEY = 'analytics-consent'
const hydrated = ref(false)
const consent = ref<'unknown' | 'granted' | 'denied'>('unknown')
let baiduInjected = false

function readConsent(): 'granted' | 'denied' | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

function persistConsent(value: 'granted' | 'denied') {
  try {
    window.localStorage.setItem(CONSENT_KEY, value)
  } catch {
    // Storage can be blocked; the current page still respects the choice.
  }
}

function loadBaiduAnalytics() {
  if (baiduInjected || typeof document === 'undefined') return
  baiduInjected = true

  const script = document.createElement('script')
  script.id = 'baidu-tongji'
  script.src = `https://hm.baidu.com/hm.js?${baiduSiteId}`
  script.async = true
  document.body.appendChild(script)
}

function grantConsent() {
  consent.value = 'granted'
  persistConsent('granted')
  loadBaiduAnalytics()
}

function denyConsent() {
  consent.value = 'denied'
  persistConsent('denied')
}

onMounted(() => {
  hydrated.value = true
  const stored = readConsent()

  if (stored) {
    consent.value = stored
  }

  if (stored === 'granted') {
    loadBaiduAnalytics()
  }
})
</script>

<template>
  <span hidden aria-hidden="true" data-analytics="cloudflare-web-analytics,baidu-tongji" />
  <span hidden aria-hidden="true" data-baidu-analytics="consent-required" />

  <aside
    v-if="hydrated && consent === 'unknown'"
    class="analytics-consent"
    aria-labelledby="analytics-consent-heading"
  >
    <p id="analytics-consent-heading">
      本站使用 Cloudflare Web Analytics（不使用 Cookie）了解访问情况。是否同时启用百度统计？百度统计会使用 Cookie，只有在你明确同意后才会加载。
    </p>
    <div class="analytics-consent-actions">
      <button type="button" @click="grantConsent">允许百度统计</button>
      <button type="button" @click="denyConsent">仅使用无 Cookie 统计</button>
      <NuxtLink to="/privacy">隐私说明</NuxtLink>
    </div>
  </aside>
</template>
