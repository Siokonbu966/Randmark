/// <reference types="vite/client" />

// TypeScript に「.vue ファイルはこの型である」と教える宣言
// (Vite 8 の vite/client に含まれなくなったため自前で用意する)
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
