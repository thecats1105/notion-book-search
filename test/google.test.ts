import { describe, expect, it } from 'bun:test'
import { enhanceGoogleBooksThumbnail } from '@/lib/google'

describe('google helpers', () => {
  it('should enhance thumbnail by replacing http with https and removing curl edge', () => {
    const rawUrl =
      'http://books.google.com/books/content?id=xyz&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api'
    const enhanced = enhanceGoogleBooksThumbnail(rawUrl)
    expect(enhanced).toBe(
      'https://books.google.com/books/content?id=xyz&printsec=frontcover&img=1&zoom=1&source=gbs_api'
    )
  })

  it('should return empty string for empty url', () => {
    expect(enhanceGoogleBooksThumbnail('')).toBe('')
  })
})
