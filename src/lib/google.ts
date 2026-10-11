import type { BookItem, GoogleSearchResponse } from '@/types/book'

export function enhanceGoogleBooksThumbnail(
  rawUrl: string | undefined | null
): string {
  if (!rawUrl) return ''
  let url = rawUrl.replace(/^http:\/\//, 'https://')
  // Remove edge curl distortion for cleaner cover
  url = url.replace(/&edge=curl/g, '')
  return url
}

export async function searchGoogleBooks(
  query: string,
  apiKey?: string,
  page = 1,
  maxResults = 15
): Promise<{ items: BookItem[]; totalCount: number; error?: string }> {
  const endpoint = new URL('https://www.googleapis.com/books/v1/volumes')
  endpoint.searchParams.set('q', query)
  endpoint.searchParams.set('maxResults', String(maxResults))
  endpoint.searchParams.set(
    'startIndex',
    String(Math.max(0, (page - 1) * maxResults))
  )

  if (apiKey?.trim()) {
    endpoint.searchParams.set('key', apiKey.trim())
  }

  try {
    const response = await fetch(endpoint.toString(), {
      method: 'GET'
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        items: [],
        totalCount: 0,
        error: `Google Books API responded with ${response.status}: ${errorText}`
      }
    }

    const data = (await response.json()) as GoogleSearchResponse
    const rawItems = data.items || []

    const items: BookItem[] = rawItems.map(item => {
      const vol = item.volumeInfo || {}
      const isbns = vol.industryIdentifiers || []
      const isbn13 = isbns.find(id => id.type === 'ISBN_13')?.identifier
      const isbn10 = isbns.find(id => id.type === 'ISBN_10')?.identifier
      const isbn = isbn13 || isbn10 || ''

      const rawThumbnail =
        vol.imageLinks?.thumbnail ||
        vol.imageLinks?.smallThumbnail ||
        vol.imageLinks?.medium ||
        vol.imageLinks?.large ||
        ''
      const thumbnail = enhanceGoogleBooksThumbnail(rawThumbnail)

      return {
        id: `google-${item.id}`,
        source: 'google',
        title: vol.title || 'Untitled',
        authors: vol.authors || [],
        publisher: vol.publisher || '',
        publishedDate: vol.publishedDate || '',
        isbn,
        thumbnail,
        originalThumbnail: rawThumbnail
          ? rawThumbnail.replace(/^http:\/\//, 'https://')
          : '',
        description: vol.description || '',
        url: vol.infoLink || vol.canonicalVolumeLink || ''
      }
    })

    return {
      items,
      totalCount: data.totalItems || items.length
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      items: [],
      totalCount: 0,
      error: `Failed to fetch Google books: ${message}`
    }
  }
}
