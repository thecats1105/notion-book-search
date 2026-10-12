import { searchGoogleBooks } from '@/lib/google'
import { searchKakaoBooks } from '@/lib/kakao'
import type { BookItem, SearchSourceFilter } from '@/types/book'

export interface SearchBooksParams {
  query: string
  page?: number
  source?: SearchSourceFilter
  kakaoApiKey?: string
  googleApiKey?: string
}

export interface SearchBooksCallbacks {
  onPartialResult?: (items: BookItem[], source: 'kakao' | 'google') => void
}

export interface SearchBooksResult {
  items: BookItem[]
  totalCount: number
  error?: string
}

export async function searchBooks(
  {
    query,
    page = 1,
    source = 'all',
    kakaoApiKey,
    googleApiKey
  }: SearchBooksParams,
  callbacks?: SearchBooksCallbacks
): Promise<SearchBooksResult> {
  const cleanQuery = query?.trim()
  const cleanPage = Math.max(1, page || 1)
  const cleanKakaoKey = kakaoApiKey?.trim()
  const cleanGoogleKey = googleApiKey?.trim()

  if (!cleanQuery) {
    return { items: [], totalCount: 0, error: 'Query is empty' }
  }

  if (source === 'kakao') {
    if (!cleanKakaoKey) {
      return {
        items: [],
        totalCount: 0,
        error: 'Kakao API key is required for Kakao search'
      }
    }
    const res = await searchKakaoBooks(cleanQuery, cleanKakaoKey, cleanPage, 16)
    callbacks?.onPartialResult?.(res.items, 'kakao')
    return res
  }

  if (source === 'google') {
    const res = await searchGoogleBooks(
      cleanQuery,
      cleanGoogleKey,
      cleanPage,
      16
    )
    callbacks?.onPartialResult?.(res.items, 'google')
    return res
  }

  // When source is 'all':
  // Query both Kakao and Google concurrently.
  // As soon as Kakao finishes (~50ms), stream Kakao results immediately via onPartialResult!
  // When Google finishes, stream Google results via onPartialResult!
  const seenIsbns = new Set<string>()
  const merged: BookItem[] = []

  const kakaoPromise = (async () => {
    if (!cleanKakaoKey) return { items: [] as BookItem[], totalCount: 0 }
    const res = await searchKakaoBooks(cleanQuery, cleanKakaoKey, cleanPage, 12)
    if (res.items.length > 0) {
      for (const item of res.items) {
        if (item.isbn) seenIsbns.add(item.isbn)
        merged.push(item)
      }
      callbacks?.onPartialResult?.(res.items, 'kakao')
    }
    return res
  })()

  const googlePromise = (async () => {
    const res = await searchGoogleBooks(
      cleanQuery,
      cleanGoogleKey,
      cleanPage,
      12
    )
    if (res.items.length > 0) {
      const uniqueGoogle: BookItem[] = []
      for (const item of res.items) {
        if (!item.isbn || !seenIsbns.has(item.isbn)) {
          if (item.isbn) seenIsbns.add(item.isbn)
          uniqueGoogle.push(item)
          merged.push(item)
        }
      }
      if (uniqueGoogle.length > 0) {
        callbacks?.onPartialResult?.(uniqueGoogle, 'google')
      }
    }
    return res
  })()

  const [kakaoResult, googleResult] = await Promise.allSettled([
    kakaoPromise,
    googlePromise
  ])

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

  return { items: merged, totalCount, error }
}
