<script setup lang="ts">
defineProps<{
  post: {
    path: string
    title: string
    date: string
    description: string
  }
}>()
</script>

<template>
  <li class="post-item">
    <NuxtLink :to="post.path" class="post-link">
      <span class="post-title">{{ post.title }}</span>
      <time :datetime="post.date">{{ post.date }}</time>
      <span class="post-description">{{ post.description }}</span>
    </NuxtLink>
  </li>
</template>
