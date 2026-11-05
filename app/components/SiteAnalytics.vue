<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()

const cloudflareToken =
  runtimeConfig.public.cloudflareAnalyticsToken ||
  PLACEHOLDER_CLOUDFLARE_ANALYTICS_TOKEN
const baiduSiteId =
  runtimeConfig.public.baiduAnalyticsId || PLACEHOLDER_BAIDU_ANALYTICS_SITE_ID

// 百度统计官方异步加载片段：先执行轻量内联脚本，再动态插入 async 脚本。
const baiduSnippet = `var _hmt = _hmt || [];
(function () {
  var hm = document.createElement('script');
  hm.src = 'https://hm.baidu.com/hm.js?${baiduSiteId}';
  hm.async = true;
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(hm, s);
})();`

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
    {
      id: 'baidu-tongji',
      innerHTML: baiduSnippet,
      tagPosition: 'bodyClose',
      tagPriority: 'low',
    },
  ],
})
</script>

<template>
  <span hidden aria-hidden="true" data-analytics="cloudflare-web-analytics,baidu-tongji" />
</template>
