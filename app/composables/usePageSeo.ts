type OgType = 'website' | 'article'

interface PageSeoOptions {
  /** Full document title, including the site name when appropriate. */
  title: string
  description: string
  /** Route path used to build the canonical URL. */
  path: string
  type?: OgType
  /** Relative path or absolute URL; defaults to the site avatar. */
  image?: string
  /** Social-card title when it should differ from the document title. */
  ogTitle?: string
  /** ISO 8601 publication date, article pages only. */
  publishedTime?: string
  /** ISO 8601 modification date, article pages only. */
  modifiedTime?: string
  locale?: string
}

type MetaEntry = {
  key: string
  name?: string
  property?: string
  content: string
}

/**
 * Page-level search and social metadata.
 *
 * Every public page calls this exactly once, which keeps canonical, OpenGraph
 * and Twitter Card tags consistent and prevents duplicate canonical links.
 */
export function usePageSeo(options: PageSeoOptions) {
  const canonicalUrl = absoluteUrl(options.path)
  const imageUrl = absoluteUrl(options.image ?? SITE.defaultImage)
  const ogTitle = options.ogTitle ?? options.title
  const type = options.type ?? 'website'
  const locale = options.locale ?? 'zh_CN'

  const meta: MetaEntry[] = [
    { key: 'description', name: 'description', content: options.description },
    { key: 'og:title', property: 'og:title', content: ogTitle },
    {
      key: 'og:description',
      property: 'og:description',
      content: options.description,
    },
    { key: 'og:type', property: 'og:type', content: type },
    { key: 'og:url', property: 'og:url', content: canonicalUrl },
    { key: 'og:image', property: 'og:image', content: imageUrl },
    { key: 'og:site_name', property: 'og:site_name', content: SITE.name },
    { key: 'og:locale', property: 'og:locale', content: locale },
    { key: 'twitter:card', name: 'twitter:card', content: 'summary' },
    { key: 'twitter:title', name: 'twitter:title', content: ogTitle },
    {
      key: 'twitter:description',
      name: 'twitter:description',
      content: options.description,
    },
    { key: 'twitter:image', name: 'twitter:image', content: imageUrl },
  ]

  if (type === 'article') {
    if (options.publishedTime) {
      meta.push({
        key: 'article:published_time',
        property: 'article:published_time',
        content: options.publishedTime,
      })
    }
    if (options.modifiedTime) {
      meta.push({
        key: 'article:modified_time',
        property: 'article:modified_time',
        content: options.modifiedTime,
      })
    }
  }

  useHead({
    title: options.title,
    link: [{ key: 'canonical', rel: 'canonical', href: canonicalUrl }],
    meta,
  })

  return { canonicalUrl, imageUrl, ogTitle }
}
