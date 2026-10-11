import type { AppConfig } from '@/types/config'

export function toUrlSafeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromUrlSafeBase64(encoded: string): string {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

export function encodeConfig(config: AppConfig): string {
  const json = JSON.stringify(config)
  return toUrlSafeBase64(json)
}

export function decodeConfig(hashPayload: string): AppConfig | null {
  if (!hashPayload) return null
  try {
    let clean = hashPayload.trim()
    if (clean.startsWith('#')) {
      clean = clean.slice(1)
    }
    if (clean.startsWith('config=')) {
      clean = clean.slice('config='.length)
    }

    const json = fromUrlSafeBase64(clean)
    const parsed = JSON.parse(json) as AppConfig

    if (!parsed?.notionApiKey || !parsed.notionDatabaseId) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}
