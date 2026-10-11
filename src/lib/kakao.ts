import type { BookFormat, BookItem, KakaoSearchResponse } from '@/types/book'

export function extractHighResKakaoThumbnail(
  rawUrl: string | undefined | null
): string {
  if (!rawUrl) return ''
  try {
    const url = new URL(rawUrl)
    const fname = url.searchParams.get('fname')
    if (fname) {
      const decoded = decodeURIComponent(fname)
      if (decoded.startsWith('http://')) {
        return decoded.replace(/^http:\/\//, 'https://')
      }
      if (decoded.startsWith('https://')) {
        return decoded
      }
    }
  } catch {
    // If URL parsing fails, fallback to rawUrl
  }
  return rawUrl.replace(/^http:\/\//, 'https://')
}

export function extractIsbn13(isbnStr: string | undefined | null): string {
  if (!isbnStr) return ''
  const trimmed = isbnStr.trim()
  const parts = trimmed.split(/\s+/)
  const found13 = parts.find(part => part.length === 13)
  if (found13) return found13
  return parts[0] || ''
}

export function detectKakaoBookFormat(doc: {
  isbn: string
  title?: string
  contents?: string
  sale_price?: number
  price?: number
}): BookFormat {
  const rawIsbn = doc.isbn || ''
  const fullText = `${doc.title || ''} ${doc.contents || ''}`.toLowerCase()

  // 1. Explicit text markers in Title or Contents
  if (
    /\[ebook\]|\(ebook\)|\[전자책\]|\(전자책\)|\bebook\b|\[e-book\]|\(e-book\)|\be북\b/i.test(
      fullText
    )
  ) {
    return 'ebook'
  }

  // 2. Korean ISBN supplementary code (부가기호, 5 digits)
  // Second digit '5' indicates Electronic Publication / eBook
  const tokens = rawIsbn.trim().split(/\s+/)
  for (const token of tokens) {
    const clean = token.replace(/[^0-9a-zA-Z]/g, '')
    if (clean.length === 5 && /^\d{5}$/.test(clean)) {
      if (clean[1] === '5') {
        return 'ebook'
      }
    }
    if (/^eb/i.test(clean) || /ebook/i.test(clean)) {
      return 'ebook'
    }
  }

  // 3. Kakao Daum specific signature:
  // When a 10-digit ISBN does not exist (as is standard for Korean digital/eBook publications),
  // Kakao formats the ISBN with a leading space (" 979...").
  if (
    rawIsbn.startsWith(' ') &&
    tokens.length === 1 &&
    tokens[0].length === 13
  ) {
    return 'ebook'
  }

  // 4. In Kakao, eBook entries have sale_price === -1 (no discount price) without a 10-digit ISBN
  if (
    tokens.length === 1 &&
    doc.sale_price === -1 &&
    doc.price !== undefined &&
    doc.price >= 0
  ) {
    return 'ebook'
  }

  return 'paper'
}

export async function searchKakaoBooks(
  query: string,
  apiKey: string,
  page = 1,
  size = 16
): Promise<{ items: BookItem[]; totalCount: number; error?: string }> {
  if (!apiKey) {
    return { items: [], totalCount: 0, error: 'Kakao API key is required' }
  }

  const endpoint = new URL('https://dapi.kakao.com/v3/search/book')
  endpoint.searchParams.set('query', query)
  endpoint.searchParams.set('page', String(page))
  endpoint.searchParams.set('size', String(size))

  try {
    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        Authorization: `KakaoAK ${apiKey.trim()}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        items: [],
        totalCount: 0,
        error: `Kakao API responded with ${response.status}: ${errorText}`
      }
    }

    const data = (await response.json()) as KakaoSearchResponse
    const items: BookItem[] = (data.documents || []).map((doc, idx) => {
      const isbn = extractIsbn13(doc.isbn)
      const format = detectKakaoBookFormat(doc)
      const thumbnail = extractHighResKakaoThumbnail(doc.thumbnail)
      const publishedDate = doc.datetime ? doc.datetime.slice(0, 10) : ''

      return {
        id: `kakao-${isbn || `idx-${page}-${idx}`}-${format}`,
        source: 'kakao',
        format,
        title: doc.title,
        authors: doc.authors || [],
        publisher: doc.publisher || '',
        publishedDate,
        isbn,
        rawIsbn: doc.isbn || '',
        thumbnail,
        originalThumbnail: doc.thumbnail
          ? doc.thumbnail.replace(/^http:\/\//, 'https://')
          : '',
        description: doc.contents || '',
        url: doc.url || ''
      }
    })

    return {
      items,
      totalCount: data.meta?.total_count || items.length
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      items: [],
      totalCount: 0,
      error: `Failed to fetch Kakao books: ${message}`
    }
  }
}
