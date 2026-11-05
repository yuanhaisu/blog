<script setup lang="ts">
const person = buildPersonJsonLd()

useHead({
  script: [
    {
      key: 'person-jsonld',
      type: 'application/ld+json',
      innerHTML: serializeJsonLd(person),
      tagPriority: 'high',
    },
  ],
})
</script>

<template>
  <span hidden aria-hidden="true" data-jsonld="person" />
</template>
