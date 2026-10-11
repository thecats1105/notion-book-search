import { describe, expect, it } from 'bun:test'
import {
  detectKakaoBookFormat,
  extractHighResKakaoThumbnail,
  extractIsbn13
} from '@/lib/kakao'

describe('kakao helpers', () => {
  it('should extract and decode high-res thumbnail from fname parameter', () => {
    const rawUrl =
      'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F7218507%3Ftimestamp%3D20260910122456'
    const highRes = extractHighResKakaoThumbnail(rawUrl)
    expect(highRes).toBe(
      'https://t1.daumcdn.net/lbook/image/7218507?timestamp=20260910122456'
    )
  })

  it('should fallback to raw url with https if fname is absent', () => {
    const rawUrl = 'http://example.com/cover.jpg'
    const highRes = extractHighResKakaoThumbnail(rawUrl)
    expect(highRes).toBe('https://example.com/cover.jpg')
  })

  it('should return empty string for null or empty url', () => {
    expect(extractHighResKakaoThumbnail('')).toBe('')
    expect(extractHighResKakaoThumbnail(null)).toBe('')
  })

  it('should extract 13-digit ISBN correctly', () => {
    expect(extractIsbn13('8901047123 9788901047126')).toBe('9788901047126')
    expect(extractIsbn13('9788901047126')).toBe('9788901047126')
    expect(extractIsbn13('8901047123')).toBe('8901047123')
    expect(extractIsbn13(' 9791138446013')).toBe('9791138446013')
    expect(extractIsbn13('')).toBe('')
  })

  it('should detect ebook and paper book formats correctly', () => {
    // Normal paper book with 10-digit and 13-digit ISBN
    expect(
      detectKakaoBookFormat({
        isbn: '1138491063 9791138491068',
        title: 'TS 전생 미소녀 네토라 레이코는 빼앗기고 싶어 2',
        sale_price: 7650,
        price: 8500
      })
    ).toBe('paper')

    // eBook with leading whitespace in Kakao ISBN (no 10-digit ISBN)
    expect(
      detectKakaoBookFormat({
        isbn: ' 9791138446013',
        title: 'TS 전생 미소녀 네토라 레이코는 빼앗기고 싶어 2',
        sale_price: -1,
        price: 5500
      })
    ).toBe('ebook')

    // eBook with 5-digit code where 2nd digit is 5
    expect(
      detectKakaoBookFormat({
        isbn: '9788901047126 05810',
        title: '클린 코드',
        sale_price: -1,
        price: 15000
      })
    ).toBe('ebook')

    // eBook with title tag
    expect(
      detectKakaoBookFormat({
        isbn: '9791175880023',
        title: '[eBook] 게임 개발자 TS미소녀 1권'
      })
    ).toBe('ebook')

    // eBook with EB token
    expect(
      detectKakaoBookFormat({
        isbn: '9788901047126 EB01',
        title: '어떤 책'
      })
    ).toBe('ebook')
  })
})
