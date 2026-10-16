export interface Bookmark {
  title: string;
  url: string;
}

export async function parseBookmarkFile(file: File): Promise<Bookmark[]> {
  const text = await file.text()
  const doc = new DOMParser().parseFromString(text, 'text/html')

  return Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href]')).map((a) => ({
    title: a.textContent?.trim() || a.href,
    url: a.href,
  }))
}

export function pickRandom<T>(items: T[], n = 10): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, n)
}
