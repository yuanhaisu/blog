import { PERSON_ID } from '#shared/site-config.mjs'
import { PERSON } from './site'

/**
 * Canonical schema.org Person node for the site owner.
 *
 * The `@id` is stable so that article-level `BlogPosting.author` and
 * `publisher` nodes can reference the same entity. Only confirmed profile URLs
 * belong in `sameAs`: defaults omit 知乎/微信公众号 until a real URL is
 * supplied through the profile config path.
 */
export function buildPersonJsonLd(profileSameAs: string[] = []) {
  const sameAs = [...new Set([...PERSON.sameAs, ...profileSameAs])]

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: PERSON.name,
    alternateName: [...PERSON.alternateName],
    url: PERSON.url,
    image: PERSON.avatar,
    email: `mailto:${PERSON.email}`,
    jobTitle: PERSON.jobTitle,
    description: PERSON.description,
    knowsAbout: [...PERSON.knowsAbout],
    sameAs,
  }
}
