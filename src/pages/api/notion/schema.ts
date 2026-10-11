import type { APIRoute } from 'astro'
import { fetchNotionDatabaseSchema } from '@/lib/notion'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as {
      notionToken?: string
      databaseId?: string
    }
    const token = body.notionToken?.trim()
    const databaseId = body.databaseId?.trim()

    if (!token || !databaseId) {
      return new Response(
        JSON.stringify({
          success: false,
          databaseTitle: '',
          properties: {},
          error: 'Both Notion integration token and database ID are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = await fetchNotionDatabaseSchema(token, databaseId)
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({
        success: false,
        databaseTitle: '',
        properties: {},
        error: message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
