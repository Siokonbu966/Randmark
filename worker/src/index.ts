interface Env {
  ASSETS: Fetcher
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const HTML_TIMEOUT_MS = 5000
const IMAGE_TIMEOUT_MS = 8000
const CACHE_TTL_SECONDS = 60 * 60 * 24

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true
  }
  if (host === '0.0.0.0' || host === '::1' || host === '[::1]') {
    return true
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const a = Number(ipv4[1])
    const b = Number(ipv4[2])
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
  }
  return false
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  ms: number,
): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(input, { ...init, signal: controller.signal, redirect: 'follow' })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function resolveUrl(candidate: string, base: URL): string | null {
  try {
    const resolved = new URL(candidate, base)
    if (resolved.protocol === 'http:') resolved.protocol = 'https:'
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null
    return resolved.href
  } catch {
    return null
  }
}

async function resolvePreviewImage(target: URL): Promise<string | null> {
  const res = await fetchWithTimeout(
    target.href,
    { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*' } },
    HTML_TIMEOUT_MS,
  )
  if (!res || !res.ok) return null

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.startsWith('image/')) return target.href
  if (!contentType.includes('text/html') && !contentType.includes('xml')) return null

  const found: Record<string, string> = {}
  const rewriter = new HTMLRewriter()
    .on('meta', {
      element(el) {
        const key = (el.getAttribute('property') ?? el.getAttribute('name') ?? '')
          .trim()
          .toLowerCase()
        const content = el.getAttribute('content')
        if (key && content && !found[key]) found[key] = content
      },
    })
    .on('link', {
      element(el) {
        const rel = (el.getAttribute('rel') ?? '').trim().toLowerCase()
        const href = el.getAttribute('href')
        if (rel && href && !found[`link:${rel}`]) found[`link:${rel}`] = href
      },
    })
    .on('base', {
      element(el) {
        const href = el.getAttribute('href')
        if (href && !found['base']) found['base'] = href
      },
    })

  await rewriter.transform(res).text()

  const base = found['base'] ? (resolveUrl(found['base'], target) ?? target.href) : target.href
  const baseUrl = new URL(base)

  const candidates = [
    found['og:image'],
    found['og:image:url'],
    found['og:image:secure_url'],
    found['twitter:image'],
    found['twitter:image:src'],
    found['link:icon'],
    found['link:shortcut icon'],
    found['link:apple-touch-icon'],
    found['link:apple-touch-icon-precomposed'],
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const absolute = resolveUrl(candidate, baseUrl)
    if (absolute) return absolute
  }
  return null
}

async function proxyImage(imageUrl: string): Promise<Response | null> {
  const res = await fetchWithTimeout(
    imageUrl,
    { headers: { 'User-Agent': USER_AGENT, Accept: 'image/*,*/*' } },
    IMAGE_TIMEOUT_MS,
  )
  if (!res || !res.ok) return null

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) return null

  return new Response(res.body, {
    status: 200,
    headers: { 'Content-Type': contentType },
  })
}

function faviconUrl(hostname: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`
}

function withCommonHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`)
  headers.set('Access-Control-Allow-Origin', '*')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function handleImage(target: string | null, ctx: ExecutionContext): Promise<Response> {
  if (!target) {
    return new Response('missing url parameter', { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return new Response('invalid url', { status: 400 })
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new Response('unsupported protocol', { status: 400 })
  }
  if (isBlockedHost(parsed.hostname)) {
    return new Response('host not allowed', { status: 400 })
  }

  const cache = caches.default
  const cacheKey = new Request(
    `https://randmark.internal/preview?url=${encodeURIComponent(parsed.href)}`,
    { method: 'GET' },
  )

  const cached = await cache.match(cacheKey)
  if (cached) return cached

  let response: Response | null = null
  const imageUrl = await resolvePreviewImage(parsed)
  if (imageUrl) {
    response = await proxyImage(imageUrl)
  }
  if (!response) {
    response = Response.redirect(faviconUrl(parsed.hostname), 302)
  }

  const finalResponse = withCommonHeaders(response)
  ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()))
  return finalResponse
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/image') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
          },
        })
      }
      return handleImage(url.searchParams.get('url'), ctx)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
