import type { APIRoute } from 'astro'
import { saveBookToNotion } from '@/lib/notion'
import type { BookItem } from '@/types/book'
import type { NotionPropertyMapping } from '@/types/config'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as {
      notionToken?: string
      dataSourceId?: string
      databaseId?: string
      propertyMapping?: NotionPropertyMapping
      book?: BookItem
    }

    const token = body.notionToken?.trim()
    const targetId = body.dataSourceId?.trim() || body.databaseId?.trim()
    const propertyMapping = body.propertyMapping
    const book = body.book

    if (!token || !targetId || !propertyMapping || !book) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Missing required payload: token, dataSourceId/databaseId, propertyMapping, or book'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = await saveBookToNotion(
      token,
      targetId,
      propertyMapping,
      book
    )
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
