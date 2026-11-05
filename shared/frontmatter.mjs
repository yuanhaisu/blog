import yaml from 'js-yaml'

const FRONTMATTER_BLOCK = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

/**
 * Parse a Markdown file with YAML frontmatter.
 *
 * Returns either `{ error }` or `{ data, body, bodyStartLine }`. The data is
 * parsed with the JSON schema so unquoted ISO dates stay strings, matching
 * Nuxt Content's frontmatter parser.
 */
export function parseFrontmatter(raw) {
  const match = FRONTMATTER_BLOCK.exec(raw)
  if (!match) {
    return { error: '缺少 frontmatter（文件必须以 --- 开始，并以 --- 结束）' }
  }

  let data
  try {
    data = yaml.load(match[1], { schema: yaml.JSON_SCHEMA })
  } catch (error) {
    const line = error?.mark?.line !== undefined ? error.mark.line + 1 : '?'
    const reason = error?.reason ?? 'YAML 语法错误'
    return { error: `frontmatter YAML 解析失败（第 ${line} 行）：${reason}` }
  }

  if (data !== undefined && data !== null && (typeof data !== 'object' || Array.isArray(data))) {
    return { error: 'frontmatter 必须是键值对（YAML 映射）' }
  }

  const body = raw.slice(match[0].length)
  const bodyStartLine = raw.slice(0, match[0].length).split('\n').length

  return {
    data: data ?? {},
    body,
    bodyStartLine,
  }
}
