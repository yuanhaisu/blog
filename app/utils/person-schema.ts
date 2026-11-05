/**
 * Stable identifier for the site owner's Person entity. Article-level
 * `BlogPosting.author` and `publisher` reference this id instead of repeating
 * the full Person node.
 */
export const PERSON_ID = `${SITE.url}/#person`

/**
 * Canonical schema.org Person node for the site owner.
 *
 * The `@id` is stable so that article-level `BlogPosting.author` and
 * `publisher` nodes can reference the same entity. Only confirmed profile URLs
 * belong in `sameAs`; see PERSON.sameAs.
 */
export function buildPersonJsonLd() {
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
    sameAs: [...PERSON.sameAs],
  }
}
