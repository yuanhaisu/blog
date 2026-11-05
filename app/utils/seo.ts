/**
 * URL and schema.org helpers shared by page metadata.
 *
 * Everything that leaves the site must be an absolute URL on the canonical
 * origin (`https://yuanhaisu.com`); relative paths in head tags or JSON-LD are
 * ambiguous for crawlers and AI agents.
 */
export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE.url}/`).href
}

/**
 * schema.org `inLanguage` uses BCP 47 language tags. v1 content is Chinese
 * canonical, so `zh` posts map to `zh-CN`.
 */
export function schemaLanguage(lang?: string): string {
  return lang === 'en' ? 'en' : 'zh-CN'
}

/**
 * Frontmatter keeps the human-readable license label ("CC BY 4.0"). JSON-LD
 * consumers need a resolvable license URL, so map the known label.
 */
export function licenseUrl(license: string): string {
  if (/^https?:\/\//i.test(license)) {
    return license
  }

  if (/^cc[- ]by[- ]4\.0$/i.test(license.trim())) {
    return 'https://creativecommons.org/licenses/by/4.0/'
  }

  return license
}

export interface ArticleSchemaInput {
  title: string
  description: string
  date: string
  updated?: string
  lang?: string
  license?: string
}

/**
 * BlogPosting node for an article page.
 *
 * `author` and `publisher` are references to the site-wide Person `@id`, so the
 * page never emits a second Person node. `dateModified` falls back to
 * `datePublished` when the article has no `updated` value.
 */
export function buildBlogPostingJsonLd(
  post: ArticleSchemaInput,
  canonicalUrl: string,
  imageUrl: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonicalUrl}#blogposting`,
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { '@type': 'Person', '@id': PERSON_ID },
    publisher: { '@type': 'Person', '@id': PERSON_ID },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    image: imageUrl,
    inLanguage: schemaLanguage(post.lang),
    license: licenseUrl(post.license ?? 'CC BY 4.0'),
  }
}

export interface BreadcrumbEntry {
  name: string
  url: string
}

/**
 * BreadcrumbList node with sequential positions. The last entry is the current
 * page.
 */
export function buildBreadcrumbListJsonLd(entries: BreadcrumbEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.url,
    })),
  }
}
