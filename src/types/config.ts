export type ThemePreference = 'auto' | 'light' | 'dark'
export type SearchSourceFilter = 'all' | 'kakao' | 'google'

export interface MappedPropertyItem {
  name: string
  type: string
}

export interface NotionPropertyMapping {
  title: string
  author?: MappedPropertyItem | string
  publisher?: MappedPropertyItem | string
  publishDate?: MappedPropertyItem | string
  isbn?: MappedPropertyItem | string
  coverFilesMedia?: MappedPropertyItem | string
}

export interface AppConfig {
  kakaoApiKey?: string
  googleApiKey?: string
  notionApiKey: string
  notionDatabaseId: string
  properties: NotionPropertyMapping
  theme?: ThemePreference
  defaultSource?: SearchSourceFilter
}
