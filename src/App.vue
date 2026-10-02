<script setup lang="ts">
import { ref } from 'vue'
import { parseBookmarkFile, pickRandom, type Bookmark } from './bookmark'

const results = ref<Bookmark[]>([])

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] // 選択されたファイル（なければundefined）
  if (!file) return

  const bookmarks = await parseBookmarkFile(file)
  results.value = pickRandom(bookmarks, 10)
}
</script>

<template>
  <div class="main">
    <input class="getFileButton" type="file" accept=".html" @change="onFileChange" />
    <ul>
      <li v-for="b in results" :key="b.url">
        <a :href="b.url" target="_blank">{{ b.title }}</a>
      </li>
    </ul>
  </div>
</template>
