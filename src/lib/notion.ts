import type { BookItem } from '@/types/book'
import type { NotionPropertyMapping } from '@/types/config'
import type {
  NotionCheckResult,
  NotionPropertySummary,
  NotionSaveResult,
  NotionSchemaResult
} from '@/types/notion'

const NOTION_API_VERSION = '2022-06-28'

export function cleanNotionId(rawId: string): string {
  if (!rawId) return ''
  const trimmed = rawId.trim()
  // Extract 32-character hex if full URL or dirty string
  const urlMatch = trimmed.match(/([a-f0-9]{32})/i)
  if (urlMatch) {
    const h = urlMatch[1]
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  }
  const clean = trimmed.replace(/-/g, '')
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`
  }
  return trimmed
}

interface RawNotionDatabaseProperty {
  id: string
  name: string
  type: string
}

interface RawNotionDatabaseResponse {
  id: string
  title: Array<{ plain_text?: string }>
  properties: Record<string, RawNotionDatabaseProperty>
}

export async function fetchNotionDatabaseSchema(
  token: string,
  databaseId: string
): Promise<NotionSchemaResult> {
  const cleanId = cleanNotionId(databaseId)
  if (!token || !cleanId) {
    return {
      success: false,
      databaseTitle: '',
      properties: {},
      error: 'Notion integration token and Database ID are required'
    }
  }

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${cleanId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Notion-Version': NOTION_API_VERSION
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        databaseTitle: '',
        properties: {},
        error: `Notion API error (${response.status}): ${errorText}`
      }
    }

    const data = (await response.json()) as RawNotionDatabaseResponse
    const databaseTitle =
      (data.title || []).map(t => t.plain_text || '').join('') ||
      'Untitled Database'
    const properties: Record<string, NotionPropertySummary> = {}

    for (const [propName, propVal] of Object.entries(data.properties || {})) {
      properties[propName] = {
        id: propVal.id,
        name: propVal.name || propName,
        type: propVal.type
      }
    }

    return {
      success: true,
      databaseTitle,
      properties
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      databaseTitle: '',
      properties: {},
      error: `Failed to connect to Notion: ${message}`
    }
  }
}

interface RawNotionQueryResult {
  results: Array<{
    id: string
    url: string
    properties: Record<
      string,
      {
        title?: Array<{ plain_text?: string }>
      }
    >
  }>
}

export async function checkNotionBookExists(
  token: string,
  databaseId: string,
  isbnProperty: { name: string; type?: string } | string | undefined,
  isbn: string
): Promise<NotionCheckResult> {
  if (!isbn || !isbnProperty) {
    return { exists: false }
  }

  const propName =
    typeof isbnProperty === 'string' ? isbnProperty : isbnProperty.name
  const propType =
    typeof isbnProperty === 'object' ? isbnProperty.type : 'rich_text'
  const cleanId = cleanNotionId(databaseId)

  if (!token || !cleanId || !propName.trim()) {
    return { exists: false }
  }

  try {
    const filter =
      propType === 'number'
        ? {
            property: propName,
            number: {
              equals: Number(isbn.replace(/\D/g, '')) || 0
            }
          }
        : {
            property: propName,
            rich_text: {
              equals: isbn.trim()
            }
          }

    const response = await fetch(
      `https://api.notion.com/v1/databases/${cleanId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter,
          page_size: 1
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        exists: false,
        error: `Check query failed (${response.status}): ${errorText}`
      }
    }

    const data = (await response.json()) as RawNotionQueryResult
    if (data.results && data.results.length > 0) {
      const foundPage = data.results[0]
      let pageTitle = ''
      for (const val of Object.values(foundPage.properties || {})) {
        if (val.title && Array.isArray(val.title)) {
          pageTitle = val.title.map(t => t.plain_text || '').join('')
          break
        }
      }
      return {
        exists: true,
        pageUrl: foundPage.url,
        pageTitle
      }
    }

    return { exists: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { exists: false, error: message }
  }
}

export async function saveBookToNotion(
  token: string,
  databaseId: string,
  propertyMapping: NotionPropertyMapping,
  book: BookItem
): Promise<NotionSaveResult> {
  const cleanId = cleanNotionId(databaseId)
  if (!token || !cleanId || !propertyMapping.title) {
    return {
      success: false,
      error:
        'Notion token, database ID, and Title property mapping are required'
    }
  }

  const propertiesPayload: Record<string, unknown> = {
    [propertyMapping.title]: {
      title: [{ text: { content: book.title.slice(0, 2000) } }]
    }
  }

  // Handle Author
  if (propertyMapping.author) {
    const authorName =
      typeof propertyMapping.author === 'string'
        ? propertyMapping.author
        : propertyMapping.author.name
    const authorType =
      typeof propertyMapping.author === 'object'
        ? propertyMapping.author.type
        : 'rich_text'

    if (authorType === 'multi_select') {
      propertiesPayload[authorName] = {
        multi_select: book.authors
          .map(a => ({ name: a.replace(/,/g, '').slice(0, 100) }))
          .filter(a => a.name.length > 0)
      }
    } else {
      propertiesPayload[authorName] = {
        rich_text: [
          { text: { content: book.authors.join(', ').slice(0, 2000) } }
        ]
      }
    }
  }

  // Handle Publisher
  if (propertyMapping.publisher && book.publisher) {
    const pubName =
      typeof propertyMapping.publisher === 'string'
        ? propertyMapping.publisher
        : propertyMapping.publisher.name
    const pubType =
      typeof propertyMapping.publisher === 'object'
        ? propertyMapping.publisher.type
        : 'rich_text'

    if (pubType === 'select') {
      propertiesPayload[pubName] = {
        select: { name: book.publisher.replace(/,/g, '').slice(0, 100) }
      }
    } else {
      propertiesPayload[pubName] = {
        rich_text: [{ text: { content: book.publisher.slice(0, 2000) } }]
      }
    }
  }

  // Handle Publish Date
  if (propertyMapping.publishDate && book.publishedDate) {
    const dateName =
      typeof propertyMapping.publishDate === 'string'
        ? propertyMapping.publishDate
        : propertyMapping.publishDate.name
    const dateType =
      typeof propertyMapping.publishDate === 'object'
        ? propertyMapping.publishDate.type
        : 'date'

    if (dateType === 'date') {
      let validDate = book.publishedDate.trim()
      // Normalize YYYY to YYYY-01-01 if required by Notion
      if (/^\d{4}$/.test(validDate)) {
        validDate = `${validDate}-01-01`
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(validDate)) {
        propertiesPayload[dateName] = {
          date: { start: validDate }
        }
      }
    } else {
      propertiesPayload[dateName] = {
        rich_text: [{ text: { content: book.publishedDate.slice(0, 2000) } }]
      }
    }
  }

  // Handle ISBN
  if (propertyMapping.isbn && book.isbn) {
    const isbnName =
      typeof propertyMapping.isbn === 'string'
        ? propertyMapping.isbn
        : propertyMapping.isbn.name
    const isbnType =
      typeof propertyMapping.isbn === 'object'
        ? propertyMapping.isbn.type
        : 'rich_text'

    if (isbnType === 'number') {
      const numVal = Number(book.isbn.replace(/\D/g, ''))
      if (!Number.isNaN(numVal)) {
        propertiesPayload[isbnName] = { number: numVal }
      }
    } else {
      propertiesPayload[isbnName] = {
        rich_text: [{ text: { content: book.isbn.slice(0, 2000) } }]
      }
    }
  }

  // Handle Cover in Files property
  if (propertyMapping.coverFilesMedia && book.thumbnail) {
    const filesName =
      typeof propertyMapping.coverFilesMedia === 'string'
        ? propertyMapping.coverFilesMedia
        : propertyMapping.coverFilesMedia.name
    propertiesPayload[filesName] = {
      files: [
        {
          name: `cover-${book.isbn || 'book'}.jpg`,
          type: 'external',
          external: { url: book.thumbnail }
        }
      ]
    }
  }

  const payload: Record<string, unknown> = {
    parent: { database_id: cleanId },
    properties: propertiesPayload
  }

  if (book.thumbnail) {
    payload.cover = {
      type: 'external',
      external: { url: book.thumbnail }
    }
  }

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Failed to create Notion page (${response.status}): ${errorText}`
      }
    }

    const data = (await response.json()) as { id: string; url: string }
    return {
      success: true,
      pageId: data.id,
      pageUrl: data.url
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
