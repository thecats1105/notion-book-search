import { describe, expect, it } from 'bun:test'
import { searchBooks } from '@/lib/search'

describe('searchBooks helper', () => {
  it('should return empty items when query is empty', async () => {
    const res = await searchBooks({ query: '   ' })
    expect(res.items).toEqual([])
    expect(res.totalCount).toBe(0)
    expect(res.error).toBe('Query is empty')
  })

  it('should return error when kakao source is requested without kakaoApiKey', async () => {
    const res = await searchBooks({ query: '테스트', source: 'kakao' })
    expect(res.items).toEqual([])
    expect(res.totalCount).toBe(0)
    expect(res.error).toBe('Kakao API key is required for Kakao search')
  })
})
