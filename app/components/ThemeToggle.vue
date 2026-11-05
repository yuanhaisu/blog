<script setup lang="ts">
const { isDark, toggle } = useTheme()

const label = computed(() =>
  isDark.value ? '切换到浅色模式' : '切换到深色模式',
)
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="label"
    :aria-pressed="isDark"
    :title="label"
    @click="toggle"
  >
    <svg
      v-if="isDark"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
    <svg
      v-else
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  </button>
</template>
