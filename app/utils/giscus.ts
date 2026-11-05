// Giscus 配置不是密钥，会出现在公开页面的 HTML 与脚本属性中。
// repo 与 category 有可用的默认值；repoId / categoryId 必须由站点所有者在
// https://giscus.app 配置后通过 NUXT_PUBLIC_GISCUS_* 环境变量提供。
export const GISCUS_DEFAULTS = {
  repo: 'yuanhaisu/blog',
  repoId: 'REPLACE_WITH_GISCUS_REPO_ID',
  category: 'Announcements',
  categoryId: 'REPLACE_WITH_GISCUS_CATEGORY_ID',
} as const

export type GiscusTheme = 'light' | 'dark'
