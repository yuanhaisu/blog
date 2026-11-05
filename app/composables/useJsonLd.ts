interface JsonLdEntry {
  /**
   * Stable unhead key. Keeps client-side navigation from leaving stale or
   * duplicated structured-data blocks behind.
   */
  key: string
  data: Record<string, unknown>
}

/**
 * Serialize JSON-LD for inline `<script>` content. Escaping `<` prevents the
 * data from ever closing the script element.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/**
 * Emit one `<script type="application/ld+json">` per entry. Entries are keyed so
 * each entity appears exactly once per page.
 */
export function useJsonLd(entries: JsonLdEntry[]) {
  useHead({
    script: entries.map(({ key, data }) => ({
      key,
      type: 'application/ld+json',
      innerHTML: serializeJsonLd(data),
      tagPriority: 'high' as const,
    })),
  })
}
