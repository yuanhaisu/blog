type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null

  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/**
 * Keep the document theme attribute, the toggle state and the persisted
 * preference in sync. The inline head script applies the initial theme before
 * first paint; this composable only handles interaction and system changes.
 */
export function useTheme() {
  const isDark = useState('theme-is-dark', () => false)
  const hasExplicitChoice = useState('theme-has-explicit-choice', () => false)
  let mediaQuery: MediaQueryList | null = null

  function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme
    isDark.value = theme === 'dark'
  }

  function onSystemChange(event: MediaQueryListEvent) {
    if (!hasExplicitChoice.value) {
      applyTheme(event.matches ? 'dark' : 'light')
    }
  }

  onMounted(() => {
    const stored = readStoredTheme()
    hasExplicitChoice.value = stored !== null
    applyTheme(stored ?? systemTheme())

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', onSystemChange)
  })

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', onSystemChange)
  })

  function toggle() {
    const next: Theme = isDark.value ? 'light' : 'dark'

    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private modes may reject writes; the current page still switches.
    }

    hasExplicitChoice.value = true
    applyTheme(next)
  }

  return { isDark, toggle }
}
