import { describe, expect, it } from 'bun:test'
import {
  decodeConfig,
  encodeConfig,
  fromUrlSafeBase64,
  toUrlSafeBase64
} from '@/lib/config-codec'
import type { AppConfig } from '@/types/config'

describe('config-codec', () => {
  it('should encode and decode string safely with Korean characters', () => {
    const raw = '테스트 도서 제목 및 키: 12345!'
    const encoded = toUrlSafeBase64(raw)
    const decoded = fromUrlSafeBase64(encoded)
    expect(decoded).toBe(raw)
  })

  it('should roundtrip full AppConfig correctly with notionDataSourceId', () => {
    const config: AppConfig = {
      kakaoApiKey: 'kakao_key_123',
      googleApiKey: 'google_key_456',
      notionApiKey: 'secret_abc123',
      notionDataSourceId: '12345678-1234-1234-1234-123456789abc',
      notionDatabaseId: '12345678-1234-1234-1234-123456789abc',
      properties: {
        title: '제목',
        author: { name: '지은이', type: 'rich_text' },
        publisher: { name: '출판사', type: 'select' },
        publishDate: { name: '출간일', type: 'date' },
        isbn: { name: 'ISBN', type: 'rich_text' }
      },
      theme: 'dark',
      defaultSource: 'all'
    }

    const encoded = encodeConfig(config)
    expect(typeof encoded).toBe('string')
    expect(encoded.length).toBeGreaterThan(0)

    const decoded = decodeConfig(encoded)
    expect(decoded).toEqual(config)

    // Test with #config= prefix
    const decodedWithPrefix = decodeConfig(`#config=${encoded}`)
    expect(decodedWithPrefix).toEqual(config)
  })

  it('should return null for invalid config strings', () => {
    expect(decodeConfig('')).toBeNull()
    expect(decodeConfig('invalid-payload')).toBeNull()
    expect(
      decodeConfig(toUrlSafeBase64(JSON.stringify({ notAConfig: true })))
    ).toBeNull()
  })
})
