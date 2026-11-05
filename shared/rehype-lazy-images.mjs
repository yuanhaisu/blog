/**
 * Add native lazy loading and async decoding to images authored in Markdown.
 *
 * Article bodies are long and mostly below the fold; without these attributes
 * the browser fetches every image during initial page load. Authors can still
 * override either attribute with raw HTML when an image is the LCP element.
 */
export default function rehypeLazyImages() {
  return (tree) => {
    visit(tree)
  }
}

function visit(node) {
  if (!node || typeof node !== 'object') {
    return
  }

  if (node.type === 'element' && node.tagName === 'img') {
    node.properties = { ...node.properties }
    if (node.properties.loading === undefined) {
      node.properties.loading = 'lazy'
    }
    if (node.properties.decoding === undefined) {
      node.properties.decoding = 'async'
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      visit(child)
    }
  }
}
