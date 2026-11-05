<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue'

const props = defineProps<{ contentKey: string }>()

const COPY_LABEL = '复制代码'
const COPIED_LABEL = '已复制'
const FAILED_LABEL = '复制失败'

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    document.execCommand('copy')
  } finally {
    textarea.remove()
  }

  return Promise.resolve()
}

function enhance(root: HTMLElement): void {
  for (const pre of root.querySelectorAll('pre')) {
    if (pre.querySelector('.code-copy-button')) {
      continue
    }

    const code = pre.querySelector('code')
    if (!code) {
      continue
    }

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'code-copy-button'
    button.textContent = COPY_LABEL
    button.setAttribute('aria-label', COPY_LABEL)

    button.addEventListener('click', async () => {
      try {
        await copyText(code.textContent ?? '')
        button.textContent = COPIED_LABEL
        button.setAttribute('aria-label', COPIED_LABEL)
        window.setTimeout(() => {
          button.textContent = COPY_LABEL
          button.setAttribute('aria-label', COPY_LABEL)
        }, 2000)
      } catch {
        button.textContent = FAILED_LABEL
        button.setAttribute('aria-label', FAILED_LABEL)
      }
    })

    pre.appendChild(button)
  }
}

async function enhanceArticle(): Promise<void> {
  await nextTick()
  const root = document.querySelector('.post-body')
  if (root instanceof HTMLElement) {
    enhance(root)
  }
}

onMounted(enhanceArticle)
watch(() => props.contentKey, enhanceArticle)
</script>

<template>
  <span hidden aria-hidden="true" />
</template>
