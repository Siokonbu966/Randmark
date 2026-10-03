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
</script>

<template>
  <div class="main">
    <div>
      <button class="getFileButton" @click="fileInput?.click()">import</button>
      <span class="fileName">{{ fileName }}</span>
      <input ref="fileInput" type="file" accept=".html" @change="onFileChange" />
    </div>
    <ul>
      <li v-for="b in results" :key="b.url">
        <a :href="b.url" target="_blank">{{ b.title }}</a>
      </li>
    </ul>
  </div>
</template>
