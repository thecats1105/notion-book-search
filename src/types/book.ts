export type BookSource = 'kakao' | 'google'
export type BookFormat = 'paper' | 'ebook'

export interface BookItem {
  id: string
  source: BookSource
  format: BookFormat
  title: string
  authors: string[]
  publisher: string
  publishedDate: string
  isbn: string
  rawIsbn?: string
  thumbnail: string
  originalThumbnail?: string
  description: string
  url?: string
}

export interface KakaoBookRaw {
  title: string
  contents: string
  url: string
  isbn: string
  datetime: string
  authors: string[]
  publisher: string
  translators: string[]
  price: number
  sale_price: number
  thumbnail: string
  status: string
}

export interface KakaoSearchResponse {
  meta: {
    total_count: number
    pageable_count: number
    is_end: boolean
  }
  documents: KakaoBookRaw[]
}

export interface GoogleBookVolumeInfo {
  title?: string
  subtitle?: string
  authors?: string[]
  publisher?: string
  publishedDate?: string
  description?: string
  industryIdentifiers?: Array<{
    type: string
    identifier: string
  }>
  imageLinks?: {
    smallThumbnail?: string
    thumbnail?: string
    small?: string
    medium?: string
    large?: string
    extraLarge?: string
  }
  canonicalVolumeLink?: string
  infoLink?: string
}

export interface GoogleBookItemRaw {
  id: string
  volumeInfo?: GoogleBookVolumeInfo
  saleInfo?: {
    isEbook?: boolean
  }
}

export interface GoogleSearchResponse {
  totalItems: number
  items?: GoogleBookItemRaw[]
}

export interface SearchResult {
  items: BookItem[]
  totalCount: number
  error?: string
}
