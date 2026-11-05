<script setup lang="ts">
const profileSameAs = useConfirmedProfileSameAs()
const person = buildPersonJsonLd(profileSameAs.value)

useJsonLd([{ key: 'person-jsonld', data: person }])
</script>

<template>
  <span hidden aria-hidden="true" data-jsonld="person" />
</template>
