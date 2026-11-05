<script setup lang="ts">
const website = buildWebsiteJsonLd()

useJsonLd([{ key: 'website-jsonld', data: website }])
</script>

<template>
  <span hidden aria-hidden="true" data-jsonld="website" />
</template>
