export type NotionPropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by'
  | 'status'
  | string

export interface NotionSelectOption {
  id: string
  name: string
  color?: string
}

export interface NotionPropertySummary {
  id: string
  name: string
  type: NotionPropertyType
  options?: NotionSelectOption[]
}

export interface NotionDataSourceItem {
  id: string
  name: string
}

export interface NotionTemplateSummary {
  id: string
  name: string
  isDefault: boolean
}

export interface NotionSchemaResult {
  success: boolean
  dataSourceId?: string
  databaseTitle: string
  properties: Record<string, NotionPropertySummary>
  availableDataSources?: NotionDataSourceItem[]
  templates?: NotionTemplateSummary[]
  error?: string
}

export interface NotionCheckResult {
  exists: boolean
  pageUrl?: string
  pageTitle?: string
  error?: string
}

export interface NotionSaveResult {
  success: boolean
  pageId?: string
  pageUrl?: string
  error?: string
}
