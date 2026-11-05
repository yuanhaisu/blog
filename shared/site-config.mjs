/**
 * Canonical site origin, entity identifiers and public profile entry points.
 *
 * This is the single source of truth for the app, server routes and build
 * scripts. Never re-declare the canonical origin or JSON-LD `@id` values in
 * another module: duplicated values drift and break entity identity.
 */
export const SITE_ORIGIN = 'https://yuanhaisu.com'

export const PERSON_ID = `${SITE_ORIGIN}/#person`
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`

export const LICENSE_LABEL = 'CC BY 4.0'
export const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'

/**
 * Environment variables that can supply a confirmed public profile URL.
 * These live in Nuxt runtime config (`NUXT_PUBLIC_*`) so a build can provide
 * real URLs without editing source. Until a URL is supplied the profile is
 * rendered as an explicit placeholder and never added to `sameAs`.
 */
export const PROFILE_ENV_KEYS = {
  zhihu: 'NUXT_PUBLIC_ZHIHU_URL',
  wechat: 'NUXT_PUBLIC_WECHAT_MP_URL',
}

/**
 * Confirmed public profile definitions.
 *
 * `kind` identifies the profile programmatically; `domestic` replaces
 * label-based filtering for the Chinese platforms. `href: null` means the
 * account is planned but its URL has not been confirmed: the UI must render a
 * clearly marked placeholder and JSON-LD must keep it out of `sameAs`.
 */
export const PROFILE_DEFINITIONS = [
  {
    kind: 'github',
    label: 'GitHub',
    href: 'https://github.com/yuanhaisu',
    detail: 'github.com/yuanhaisu',
    domestic: false,
  },
  {
    kind: 'zhihu',
    label: '知乎',
    href: null,
    detail: '账号准备中（主页链接待补充）',
    domestic: true,
  },
  {
    kind: 'wechat',
    label: '微信公众号',
    href: null,
    detail: '账号准备中（入口待补充）',
    domestic: true,
  },
]

function isHttpUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function displayDetail(href, fallback) {
  try {
    const url = new URL(href)
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
  } catch {
    return fallback
  }
}

/**
 * Resolve profile definitions with optional confirmed URLs (for example from
 * Nuxt runtime config). Unconfirmed values stay `null`, so templates keep
 * showing the placeholder and `sameAs` stays limited to verified links.
 */
export function resolveProfiles(overrides = {}) {
  return PROFILE_DEFINITIONS.map((profile) => {
    const candidate = overrides[profile.kind] ?? profile.href
    const href = isHttpUrl(candidate) ? candidate : profile.href

    return {
      ...profile,
      href,
      detail: href ? displayDetail(href, profile.detail) : profile.detail,
    }
  })
}

/**
 * Confirmed non-GitHub profile URLs suitable for `Person.sameAs`.
 */
export function confirmedProfileSameAs(profiles) {
  return profiles
    .filter((profile) => profile.kind !== 'github' && isHttpUrl(profile.href))
    .map((profile) => profile.href)
}
