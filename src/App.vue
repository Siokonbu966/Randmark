<script setup lang="ts">
import { ref } from 'vue'
import { parseBookmarkFile, pickRandom, type Bookmark } from './bookmark'

const results = ref<Bookmark[]>([])
const fileInput = ref<HTMLInputElement>()
const fileName = ref('')

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] // 選択されたファイル（なければundefined）
  fileName.value = file?.name ?? ''
  if (!file) return

  const bookmarks = await parseBookmarkFile(file)
  results.value = pickRandom(bookmarks, 10)
}

function previewUrl(url: string): string {
  const base = import.meta.env.VITE_PREVIEW_API ?? ''
  return `${base}/api/image?url=${encodeURIComponent(url)}`
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function fallbackUrl(url: string): string {
  const host = hostOf(url)
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
}

function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth > 0 && img.naturalWidth <= 256) {
    img.classList.add('is-icon')
  }
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  const url = img.dataset.original
  if (!url || img.dataset.fallback === '1') {
    img.style.display = 'none'
    return
  }
  img.dataset.fallback = '1'
  img.src = fallbackUrl(url)
}
</script>

<template>
  <div class="main">
    <div>
      <h1>Randmark</h1>
    </div>
    <div>
      <button class="getFileButton" @click="fileInput?.click()">import</button>
      <span class="fileName">{{ fileName }}</span>
      <input ref="fileInput" type="file" accept=".html" @change="onFileChange" />
    </div>
    <ul class="results">
      <li v-for="b in results" :key="b.url" class="card">
        <a :href="b.url" target="_blank" rel="noopener">
          <img
            class="card-thumb"
            :src="previewUrl(b.url)"
            :data-original="b.url"
            alt=""
            loading="lazy"
            @load="onImgLoad"
            @error="onImgError"
          />
          <span class="card-body">
            <span class="card-title">{{ b.title }}</span>
            <span class="card-host">{{ hostOf(b.url) }}</span>
          </span>
        </a>
      </li>
    </ul>
  </div>
</template>
