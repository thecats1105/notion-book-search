import type { APIRoute } from 'astro'
import { searchGoogleBooks } from '@/lib/google'
import { searchKakaoBooks } from '@/lib/kakao'
import type { BookItem } from '@/types/book'

export const prerender = false

interface SearchRequestBody {
  query: string
  page?: number
  source?: 'all' | 'kakao' | 'google'
  kakaoApiKey?: string
  googleApiKey?: string
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as SearchRequestBody
    const query = body.query?.trim()
    const page = Math.max(1, body.page || 1)
    const source = body.source || 'all'
    const kakaoApiKey = body.kakaoApiKey?.trim()
    const googleApiKey = body.googleApiKey?.trim()

    if (!query) {
      return new Response(
        JSON.stringify({ items: [], totalCount: 0, error: 'Query is empty' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (source === 'kakao') {
      if (!kakaoApiKey) {
        return new Response(
          JSON.stringify({
            items: [],
            totalCount: 0,
            error: 'Kakao API key is required for Kakao search'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      const res = await searchKakaoBooks(query, kakaoApiKey, page, 16)
      return new Response(JSON.stringify(res), {
        status: res.error && res.items.length === 0 ? 400 : 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (source === 'google') {
      const res = await searchGoogleBooks(query, googleApiKey, page, 16)
      return new Response(JSON.stringify(res), {
        status: res.error && res.items.length === 0 ? 400 : 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Default 'all': query both in parallel
    const promises: [
      Promise<{ items: BookItem[]; totalCount: number; error?: string }>,
      Promise<{ items: BookItem[]; totalCount: number; error?: string }>
    ] = [
      kakaoApiKey
        ? searchKakaoBooks(query, kakaoApiKey, page, 12)
        : Promise.resolve({ items: [], totalCount: 0 }),
      searchGoogleBooks(query, googleApiKey, page, 12)
    ]

    const [kakaoResult, googleResult] = await Promise.allSettled(promises)

    const kakaoItems =
      kakaoResult.status === 'fulfilled' ? kakaoResult.value.items : []
    const googleItems =
      googleResult.status === 'fulfilled' ? googleResult.value.items : []

    // Build deduplicated list: Kakao domestic books prioritized
    const seenIsbns = new Set<string>()
    const merged: BookItem[] = []

    for (const item of kakaoItems) {
      if (item.isbn) seenIsbns.add(item.isbn)
      merged.push(item)
    }

    for (const item of googleItems) {
      if (item.isbn && seenIsbns.has(item.isbn)) {
        continue // Skip duplicate ISBN
      }
      if (item.isbn) seenIsbns.add(item.isbn)
      merged.push(item)
    }

    const totalCount =
      (kakaoResult.status === 'fulfilled' ? kakaoResult.value.totalCount : 0) +
      (googleResult.status === 'fulfilled' ? googleResult.value.totalCount : 0)

    let error: string | undefined
    if (merged.length === 0) {
      if (kakaoResult.status === 'fulfilled' && kakaoResult.value.error) {
        error = kakaoResult.value.error
      } else if (
        googleResult.status === 'fulfilled' &&
        googleResult.value.error
      ) {
        error = googleResult.value.error
      }
    }

    return new Response(JSON.stringify({ items: merged, totalCount, error }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ items: [], totalCount: 0, error: message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
