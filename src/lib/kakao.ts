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

export function detectKakaoBookFormat(
  rawIsbn: string | undefined | null,
  title: string | undefined | null,
  contents?: string | null
): BookFormat {
  const fullText = `${title || ''} ${contents || ''}`.toLowerCase()

  // 1. Check title/contents for explicit eBook markers
  if (
    /\[ebook\]|\(ebook\)|\[전자책\]|\(전자책\)|\bebook\b|\[e-book\]|\(e-book\)|\be북\b/i.test(
      fullText
    )
  ) {
    return 'ebook'
  }

  // 2. Inspect ISBN string tokens
  if (rawIsbn) {
    const tokens = rawIsbn.trim().split(/\s+/)
    for (const token of tokens) {
      const clean = token.replace(/[^0-9a-zA-Z]/g, '')

      // 5-digit Korean supplementary code (부가기호)
      // Digit 2 denotes publication format: '5' represents Electronic Publication (eBook)
      if (clean.length === 5 && /^\d{5}$/.test(clean)) {
        if (clean[1] === '5') {
          return 'ebook'
        }
      }

      // Explicit EB or ebook tokens in ISBN
      if (/^eb/i.test(clean) || /ebook/i.test(clean)) {
        return 'ebook'
      }
    }
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
      const format = detectKakaoBookFormat(doc.isbn, doc.title, doc.contents)
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
