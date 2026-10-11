export type ThemePreference = 'auto' | 'light' | 'dark'
export type SearchSourceFilter = 'all' | 'kakao' | 'google'
export type Language = 'ko' | 'en'

export interface MappedPropertyItem {
  name: string
  type: string
}

export interface FormatMappingConfig {
  name: string
  type: string
  ebookValue?: string
  paperValue?: string
}

export interface StatusMappingConfig {
  name: string
  type: string
  defaultValue?: string
}

export interface NotionPropertyMapping {
  title: string
  author?: MappedPropertyItem | string
  publisher?: MappedPropertyItem | string
  publishDate?: MappedPropertyItem | string
  isbn?: MappedPropertyItem | string
  coverFilesMedia?: MappedPropertyItem | string
  format?: FormatMappingConfig | MappedPropertyItem | string
  status?: StatusMappingConfig | MappedPropertyItem | string
}

export interface TemplateSelection {
  type: 'none' | 'default' | 'template_id'
  template_id?: string
  name?: string
}

export interface AppConfig {
  kakaoApiKey?: string
  googleApiKey?: string
  notionApiKey: string
  notionDataSourceId?: string
  notionDatabaseId?: string
  properties: NotionPropertyMapping
  template?: TemplateSelection
  theme?: ThemePreference
  defaultSource?: SearchSourceFilter
  lang?: Language
  insertBodyImage?: boolean
}
