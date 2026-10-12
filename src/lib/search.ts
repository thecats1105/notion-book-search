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

export interface SearchBooksResult {
  items: BookItem[]
  totalCount: number
  error?: string
}

export async function searchBooks({
  query,
  page = 1,
  source = 'all',
  kakaoApiKey,
  googleApiKey
}: SearchBooksParams): Promise<SearchBooksResult> {
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
    return searchKakaoBooks(cleanQuery, cleanKakaoKey, cleanPage, 16)
  }

  if (source === 'google') {
    return searchGoogleBooks(cleanQuery, cleanGoogleKey, cleanPage, 16)
  }

  // Default 'all': query both in parallel
  const promises: [
    Promise<{ items: BookItem[]; totalCount: number; error?: string }>,
    Promise<{ items: BookItem[]; totalCount: number; error?: string }>
  ] = [
    cleanKakaoKey
      ? searchKakaoBooks(cleanQuery, cleanKakaoKey, cleanPage, 12)
      : Promise.resolve({ items: [], totalCount: 0 }),
    searchGoogleBooks(cleanQuery, cleanGoogleKey, cleanPage, 12)
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

  return { items: merged, totalCount, error }
}
