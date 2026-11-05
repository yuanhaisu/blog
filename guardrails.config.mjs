/**
 * Content guardrail configuration.
 *
 * `clientNames` blocks real client / internal project names from public posts.
 * `internalDomains` adds domains beyond the built-in `.internal`, `.corp`,
 * `.local`, `.intranet`, `.lan` and private IP patterns.
 * `childDataPatterns` adds RegExp patterns for children's personal data.
 */
export default {
  clientNames: ['kindergarten'],
  internalDomains: [],
  childDataPatterns: [],
}
