import {
  confirmedProfileSameAs,
  resolveProfiles,
} from '#shared/site-config.mjs'

/**
 * Public profile entry points. Confirmed URLs can be supplied at build time
 * through `NUXT_PUBLIC_ZHIHU_URL` / `NUXT_PUBLIC_WECHAT_MP_URL`; without them
 * the entries stay explicit placeholders.
 */
export function useProfiles() {
  const runtimeConfig = useRuntimeConfig()

  return computed(() =>
    resolveProfiles({
      zhihu: runtimeConfig.public.zhihuUrl,
      wechat: runtimeConfig.public.wechatUrl,
    }),
  )
}

/**
 * Confirmed non-GitHub profile URLs for `Person.sameAs`. Empty until a real
 * 知乎/微信公众号 URL is configured.
 */
export function useConfirmedProfileSameAs() {
  const profiles = useProfiles()

  return computed(() => confirmedProfileSameAs(profiles.value))
}
