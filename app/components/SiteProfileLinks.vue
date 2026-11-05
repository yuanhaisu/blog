<script setup lang="ts">
interface ProfileLink {
  kind: string
  label: string
  href: string | null
  detail: string
  domestic: boolean
}

withDefaults(
  defineProps<{
    profiles: ProfileLink[]
    showDetail?: boolean
  }>(),
  { showDetail: false },
)
</script>

<template>
  <li v-for="profile in profiles" :key="profile.kind">
    <a
      v-if="profile.href"
      :href="profile.href"
      rel="me noopener noreferrer"
      target="_blank"
    >
      {{ profile.label }}<template v-if="showDetail">：{{ profile.detail }}</template>
    </a>
    <span v-else>
      {{ profile.label
      }}<template v-if="showDetail">：{{ profile.detail }}</template
      ><template v-else>（账号入口准备中）</template>
    </span>
  </li>
</template>
