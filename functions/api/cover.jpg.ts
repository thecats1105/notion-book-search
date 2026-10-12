export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400'
    }
  })
}

export async function onRequestGet(context: { request: Request }) {
  const url = new URL(context.request.url)
  const targetUrl = url.searchParams.get('url')

  if (!targetUrl) {
    return new Response('Missing url parameter', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NotionBookSearch/1.0)'
      }
    })

    if (!upstreamRes.ok) {
      return new Response(`Upstream error: ${upstreamRes.status}`, {
        status: upstreamRes.status,
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg'
    const body = await upstreamRes.arrayBuffer()

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(msg, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  }
}
