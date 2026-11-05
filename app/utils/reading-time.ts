interface MinimarkNode {
  value?: unknown
  children?: MinimarkNode[]
}

function collectText(node: unknown, parts: string[]): void {
  if (!node || typeof node !== 'object') {
    return
  }

  const current = node as MinimarkNode

  if (typeof current.value === 'string') {
    parts.push(current.value)
  }

  if (Array.isArray(current.children)) {
    for (const child of current.children) {
      collectText(child, parts)
    }
  }
}

/**
 * Estimate reading time from the parsed Markdown body.
 *
 * Chinese prose is counted per character (~300 characters per minute) and
 * latin text per word (~180 words per minute), which keeps the estimate
 * useful for mixed technical posts. Code blocks are included because they
 * also take time to read.
 */
export function estimateReadingMinutes(body: unknown): number {
  const parts: string[] = []
  collectText(body, parts)
  const text = parts.join(' ')

  const cjkCount = text.match(/[㐀-鿿豈-﫿]/g)?.length ?? 0
  const latinCount =
    text
      .replace(/[㐀-鿿豈-﫿]/g, ' ')
      .match(/[A-Za-z0-9]+/g)?.length ?? 0

  return Math.max(1, Math.ceil(cjkCount / 300 + latinCount / 180))
}
