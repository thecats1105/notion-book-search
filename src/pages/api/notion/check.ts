import type { APIRoute } from 'astro'
import { checkNotionBookExists } from '@/lib/notion'
import type { MappedPropertyItem } from '@/types/config'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as {
      notionToken?: string
      databaseId?: string
      isbnProperty?: MappedPropertyItem | string
      isbn?: string
    }

    const token = body.notionToken?.trim()
    const databaseId = body.databaseId?.trim()
    const isbn = body.isbn?.trim()

    if (!token || !databaseId || !isbn || !body.isbnProperty) {
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const result = await checkNotionBookExists(
      token,
      databaseId,
      body.isbnProperty,
      isbn
    )
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ exists: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
