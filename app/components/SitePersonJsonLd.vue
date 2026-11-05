<script setup lang="ts">
const person = buildPersonJsonLd()
// Escape `<` so the serialized data can never close the script element.
const serialized = JSON.stringify(person).replace(/</g, '\\u003c')

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: serialized,
      tagPriority: 'high',
    },
  ],
})
</script>

<template>
  <span hidden aria-hidden="true" data-jsonld="person" />
</template>
