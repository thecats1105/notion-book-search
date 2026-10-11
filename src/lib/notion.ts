import type { BookItem } from '@/types/book'
import type { NotionPropertyMapping } from '@/types/config'
import type {
  NotionCheckResult,
  NotionDataSourceItem,
  NotionPropertySummary,
  NotionSaveResult,
  NotionSchemaResult
} from '@/types/notion'

const NOTION_DATA_SOURCE_VERSION = '2025-09-03'
const NOTION_LEGACY_VERSION = '2022-06-28'

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

interface RawNotionPropertyItem {
  id: string
  name: string
  type: string
}

interface RawDataSourceResponse {
  object: string
  id: string
  name?: string
  title?: Array<{ plain_text?: string }>
  properties: Record<string, RawNotionPropertyItem>
}

interface RawDatabaseResponse {
  id: string
  title?: Array<{ plain_text?: string }>
  data_sources?: Array<{ id: string; name: string }>
  properties?: Record<string, RawNotionPropertyItem>
}

export async function fetchNotionDatabaseSchema(
  token: string,
  rawId: string
): Promise<NotionSchemaResult> {
  const cleanId = cleanNotionId(rawId)
  if (!token || !cleanId) {
    return {
      success: false,
      databaseTitle: '',
      properties: {},
      error: 'Notion integration token and Data Source/Database ID are required'
    }
  }

  // 1. First, attempt to retrieve as a Data Source (Notion API 2025-09-03+)
  try {
    const dsRes = await fetch(
      `https://api.notion.com/v1/data_sources/${cleanId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Notion-Version': NOTION_DATA_SOURCE_VERSION
        }
      }
    )

    if (dsRes.ok) {
      const dsData = (await dsRes.json()) as RawDataSourceResponse
      const title =
        dsData.name ||
        (dsData.title || []).map(t => t.plain_text || '').join('') ||
        'Notion Data Source'

      const properties: Record<string, NotionPropertySummary> = {}
      for (const [propName, propVal] of Object.entries(
        dsData.properties || {}
      )) {
        properties[propName] = {
          id: propVal.id,
          name: propVal.name || propName,
          type: propVal.type
        }
      }

      return {
        success: true,
        dataSourceId: dsData.id || cleanId,
        databaseTitle: title,
        properties
      }
    }
  } catch {
    // Continue to database resolution below
  }

  // 2. If not a direct data source, check if it is a Database container
  try {
    const dbRes = await fetch(
      `https://api.notion.com/v1/databases/${cleanId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Notion-Version': NOTION_DATA_SOURCE_VERSION
        }
      }
    )

    if (dbRes.ok) {
      const dbData = (await dbRes.json()) as RawDatabaseResponse
      const availableDataSources: NotionDataSourceItem[] =
        dbData.data_sources || []
      const dbTitle =
        (dbData.title || []).map(t => t.plain_text || '').join('') ||
        'Notion Database'

      // If data_sources exist, fetch properties for the first data source
      if (availableDataSources.length > 0) {
        const firstDsId = availableDataSources[0].id
        const subDsRes = await fetch(
          `https://api.notion.com/v1/data_sources/${firstDsId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token.trim()}`,
              'Notion-Version': NOTION_DATA_SOURCE_VERSION
            }
          }
        )

        if (subDsRes.ok) {
          const subDsData = (await subDsRes.json()) as RawDataSourceResponse
          const properties: Record<string, NotionPropertySummary> = {}
          for (const [propName, propVal] of Object.entries(
            subDsData.properties || {}
          )) {
            properties[propName] = {
              id: propVal.id,
              name: propVal.name || propName,
              type: propVal.type
            }
          }

          return {
            success: true,
            dataSourceId: firstDsId,
            databaseTitle: dbTitle,
            properties,
            availableDataSources
          }
        }
      }
    }
  } catch {
    // Continue to legacy database fallback
  }

  // 3. Fallback to legacy database API (2022-06-28)
  try {
    const legacyRes = await fetch(
      `https://api.notion.com/v1/databases/${cleanId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Notion-Version': NOTION_LEGACY_VERSION
        }
      }
    )

    if (legacyRes.ok) {
      const legacyData = (await legacyRes.json()) as RawDatabaseResponse
      const dbTitle =
        (legacyData.title || []).map(t => t.plain_text || '').join('') ||
        'Notion Database'
      const properties: Record<string, NotionPropertySummary> = {}

      for (const [propName, propVal] of Object.entries(
        legacyData.properties || {}
      )) {
        properties[propName] = {
          id: propVal.id,
          name: propVal.name || propName,
          type: propVal.type
        }
      }

      return {
        success: true,
        dataSourceId: cleanId,
        databaseTitle: dbTitle,
        properties
      }
    }

    const errorText = await legacyRes.text()
    return {
      success: false,
      databaseTitle: '',
      properties: {},
      error: `Notion API error (${legacyRes.status}): ${errorText}`
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
  targetId: string,
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
  const cleanId = cleanNotionId(targetId)

  if (!token || !cleanId || !propName.trim()) {
    return { exists: false }
  }

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

  const bodyStr = JSON.stringify({
    filter,
    page_size: 1
  })

  // 1. Try querying data_source endpoint (2025-09-03)
  try {
    const dsRes = await fetch(
      `https://api.notion.com/v1/data_sources/${cleanId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Notion-Version': NOTION_DATA_SOURCE_VERSION,
          'Content-Type': 'application/json'
        },
        body: bodyStr
      }
    )

    if (dsRes.ok) {
      const data = (await dsRes.json()) as RawNotionQueryResult
      if (data.results && data.results.length > 0) {
        const found = data.results[0]
        let pageTitle = ''
        for (const val of Object.values(found.properties || {})) {
          if (val.title && Array.isArray(val.title)) {
            pageTitle = val.title.map(t => t.plain_text || '').join('')
            break
          }
        }
        return { exists: true, pageUrl: found.url, pageTitle }
      }
      return { exists: false }
    }
  } catch {
    // Fallback to database endpoint below
  }

  // 2. Fallback to database query endpoint
  try {
    const dbRes = await fetch(
      `https://api.notion.com/v1/databases/${cleanId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Notion-Version': NOTION_LEGACY_VERSION,
          'Content-Type': 'application/json'
        },
        body: bodyStr
      }
    )

    if (!dbRes.ok) {
      const errText = await dbRes.text()
      return {
        exists: false,
        error: `Query failed (${dbRes.status}): ${errText}`
      }
    }

    const data = (await dbRes.json()) as RawNotionQueryResult
    if (data.results && data.results.length > 0) {
      const found = data.results[0]
      let pageTitle = ''
      for (const val of Object.values(found.properties || {})) {
        if (val.title && Array.isArray(val.title)) {
          pageTitle = val.title.map(t => t.plain_text || '').join('')
          break
        }
      }
      return { exists: true, pageUrl: found.url, pageTitle }
    }

    return { exists: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { exists: false, error: message }
  }
}

export async function saveBookToNotion(
  token: string,
  targetId: string,
  propertyMapping: NotionPropertyMapping,
  book: BookItem
): Promise<NotionSaveResult> {
  const cleanId = cleanNotionId(targetId)
  if (!token || !cleanId || !propertyMapping.title) {
    return {
      success: false,
      error:
        'Notion token, Data Source/Database ID, and Title property mapping are required'
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

  const coverPayload = book.thumbnail
    ? { type: 'external' as const, external: { url: book.thumbnail } }
    : undefined

  // 1. First attempt: create page with parent: { data_source_id: cleanId } (2025-09-03)
  try {
    const dsRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'Notion-Version': NOTION_DATA_SOURCE_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { data_source_id: cleanId },
        properties: propertiesPayload,
        cover: coverPayload
      })
    })

    if (dsRes.ok) {
      const data = (await dsRes.json()) as { id: string; url: string }
      return { success: true, pageId: data.id, pageUrl: data.url }
    }
  } catch {
    // Fallback to database_id below
  }

  // 2. Fallback attempt: create page with parent: { database_id: cleanId } (2022-06-28)
  try {
    const dbRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'Notion-Version': NOTION_LEGACY_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: cleanId },
        properties: propertiesPayload,
        cover: coverPayload
      })
    })

    if (dbRes.ok) {
      const data = (await dbRes.json()) as { id: string; url: string }
      return { success: true, pageId: data.id, pageUrl: data.url }
    }

    const errorText = await dbRes.text()
    return {
      success: false,
      error: `Failed to create Notion page (${dbRes.status}): ${errorText}`
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}
