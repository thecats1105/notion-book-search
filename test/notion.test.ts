import { describe, expect, it } from 'bun:test'
import { cleanNotionId } from '@/lib/notion'

describe('notion helpers', () => {
  it('should format 32-character hex id to standard UUID format', () => {
    const rawId = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d'
    const cleaned = cleanNotionId(rawId)
    expect(cleaned).toBe('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d')
  })

  it('should extract database id from full Notion database URL', () => {
    const fullUrl =
      'https://www.notion.so/myworkspace/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d?v=98765'
    const cleaned = cleanNotionId(fullUrl)
    expect(cleaned).toBe('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d')
  })

  it('should preserve already formatted UUID', () => {
    const uuid = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d'
    expect(cleanNotionId(uuid)).toBe(uuid)
  })
})
