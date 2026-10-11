import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Eye,
  Globe,
  Key,
  Loader2,
  RefreshCw,
  Sliders,
  Sparkles
} from 'lucide-react'
import * as React from 'react'
import { EmbedWidget } from '@/components/EmbedWidget'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { encodeConfig } from '@/lib/config-codec'
import { type Language, translations } from '@/lib/i18n'
import { cleanNotionId } from '@/lib/notion'
import type {
  AppConfig,
  NotionPropertyMapping,
  SearchSourceFilter,
  TemplateSelection,
  ThemePreference
} from '@/types/config'
import type { NotionSchemaResult } from '@/types/notion'

const STORAGE_KEY = 'notion_book_search_generator_config_v1'

export function UrlGenerator() {
  const [lang, setLang] = React.useState<Language>('ko')
  const t = translations[lang]

  // Notion states
  const [notionToken, setNotionToken] = React.useState('')
  const [dataSourceId, setDataSourceId] = React.useState('')
  const [isFetchingSchema, setIsFetchingSchema] = React.useState(false)
  const [schemaResult, setSchemaResult] =
    React.useState<NotionSchemaResult | null>(null)

  // Property mapping states
  const [titleProp, setTitleProp] = React.useState('')
  const [authorProp, setAuthorProp] = React.useState('')
  const [publisherProp, setPublisherProp] = React.useState('')
  const [dateProp, setDateProp] = React.useState('')
  const [isbnProp, setIsbnProp] = React.useState('')
  const [filesProp, setFilesProp] = React.useState('')
  const [formatProp, setFormatProp] = React.useState('')
  const [ebookOptionVal, setEbookOptionVal] = React.useState('전자책')
  const [paperOptionVal, setPaperOptionVal] = React.useState('종이책')
  const [statusProp, setStatusProp] = React.useState('')
  const [statusDefaultVal, setStatusDefaultVal] = React.useState('')
  const [templateSelection, setTemplateSelection] =
    React.useState<TemplateSelection>({ type: 'default' })

  // Search API keys
  const [kakaoKey, setKakaoKey] = React.useState('')
  const [googleKey, setGoogleKey] = React.useState('')

  // API test states
  const [isTestingKakao, setIsTestingKakao] = React.useState(false)
  const [kakaoTestStatus, setKakaoTestStatus] = React.useState<{
    success?: boolean
    message?: string
  } | null>(null)
  const [isTestingGoogle, setIsTestingGoogle] = React.useState(false)
  const [googleTestStatus, setGoogleTestStatus] = React.useState<{
    success?: boolean
    message?: string
  } | null>(null)

  // Preferences
  const [themePref, setThemePref] = React.useState<ThemePreference>('auto')
  const [defaultSource, setDefaultSource] =
    React.useState<SearchSourceFilter>('all')
  const [insertBodyImage, setInsertBodyImage] = React.useState(true)
  const [rememberLocal, setRememberLocal] = React.useState(true)

  // Output states
  const [generatedUrl, setGeneratedUrl] = React.useState('')
  const [hasCopied, setHasCopied] = React.useState(false)
  const [liveConfig, setLiveConfig] = React.useState<AppConfig | null>(null)
  const [origin, setOrigin] = React.useState('')

  const toggleLanguage = () => {
    setLang(prev => (prev === 'ko' ? 'en' : 'ko'))
  }

  // Load saved state on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.lang) setLang(parsed.lang)
          if (parsed.notionToken) setNotionToken(parsed.notionToken)
          if (parsed.dataSourceId || parsed.databaseId) {
            setDataSourceId(parsed.dataSourceId || parsed.databaseId)
          }
          if (parsed.kakaoKey) setKakaoKey(parsed.kakaoKey)
          if (parsed.googleKey) setGoogleKey(parsed.googleKey)
          if (parsed.themePref) setThemePref(parsed.themePref)
          if (parsed.defaultSource) setDefaultSource(parsed.defaultSource)

          if (typeof parsed.insertBodyImage === 'boolean') {
            setInsertBodyImage(parsed.insertBodyImage)
          }
          if (parsed.template) setTemplateSelection(parsed.template)
          if (parsed.properties) {
            setTitleProp(parsed.properties.title || '')
            setAuthorProp(
              parsed.properties.author?.name || parsed.properties.author || ''
            )
            setPublisherProp(
              parsed.properties.publisher?.name ||
                parsed.properties.publisher ||
                ''
            )
            setDateProp(
              parsed.properties.publishDate?.name ||
                parsed.properties.publishDate ||
                ''
            )
            setIsbnProp(
              parsed.properties.isbn?.name || parsed.properties.isbn || ''
            )
            setFilesProp(
              parsed.properties.coverFilesMedia?.name ||
                parsed.properties.coverFilesMedia ||
                ''
            )
            setFormatProp(
              parsed.properties.format?.name || parsed.properties.format || ''
            )
            if (typeof parsed.properties.format === 'object') {
              if (parsed.properties.format.ebookValue)
                setEbookOptionVal(parsed.properties.format.ebookValue)
              if (parsed.properties.format.paperValue)
                setPaperOptionVal(parsed.properties.format.paperValue)
            }
          }
        }
      } catch {
        // Ignore localStorage error
      }
    }
  }, [])

  // Auto-fetch schema & templates
  const fetchDatabaseSchema = async (targetIdToFetch?: string) => {
    const cleanToken = notionToken.trim()
    const cleanId = cleanNotionId(targetIdToFetch || dataSourceId)

    if (!cleanToken || !cleanId) return

    setIsFetchingSchema(true)
    setSchemaResult(null)

    try {
      const res = await fetch('/api/notion/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionToken: cleanToken,
          dataSourceId: cleanId
        })
      })

      const data = (await res.json()) as NotionSchemaResult
      setSchemaResult(data)

      if (data.success) {
        if (data.dataSourceId && data.dataSourceId !== dataSourceId) {
          setDataSourceId(data.dataSourceId)
        }

        if (data.properties) {
          const props = Object.values(data.properties)

          // Auto-match Title
          const titleMatch = props.find(p => p.type === 'title')
          if (titleMatch && !titleProp) setTitleProp(titleMatch.name)

          // Auto-match Author
          const authorMatch = props.find(
            p =>
              /저자|지은이|author|creator/i.test(p.name) &&
              (p.type === 'rich_text' || p.type === 'multi_select')
          )
          if (authorMatch && !authorProp) setAuthorProp(authorMatch.name)

          // Auto-match Publisher
          const pubMatch = props.find(
            p =>
              /출판사|출판|publisher/i.test(p.name) &&
              (p.type === 'rich_text' || p.type === 'select')
          )
          if (pubMatch && !publisherProp) setPublisherProp(pubMatch.name)

          // Auto-match Date
          const dateMatch = props.find(
            p =>
              /출간일|발행일|날짜|date|published/i.test(p.name) &&
              (p.type === 'date' || p.type === 'rich_text')
          )
          if (dateMatch && !dateProp) setDateProp(dateMatch.name)

          // Auto-match ISBN
          const isbnMatch = props.find(
            p =>
              /isbn/i.test(p.name) &&
              (p.type === 'rich_text' || p.type === 'number')
          )
          if (isbnMatch && !isbnProp) setIsbnProp(isbnMatch.name)

          // Auto-match Files
          const filesMatch = props.find(p => p.type === 'files')
          if (filesMatch && !filesProp) setFilesProp(filesMatch.name)

          // Auto-match Format
          const formatMatch = props.find(
            p =>
              /형태|구분|종류|분류|format|type/i.test(p.name) &&
              (p.type === 'select' || p.type === 'rich_text')
          )
          if (formatMatch && !formatProp) {
            setFormatProp(formatMatch.name)
            if (formatMatch.options && formatMatch.options.length > 0) {
              const eb = formatMatch.options.find(o =>
                /ebook|전자/i.test(o.name)
              )
              if (eb) setEbookOptionVal(eb.name)
              const pb = formatMatch.options.find(o =>
                /종이|단행본|paper/i.test(o.name)
              )
              if (pb) setPaperOptionVal(pb.name)
            }
          }
        }

        // If default template exists, select it
        if (data.templates && data.templates.length > 0) {
          const def = data.templates.find(t => t.isDefault)
          if (def) {
            setTemplateSelection({
              type: 'template_id',
              template_id: def.id,
              name: def.name
            })
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setSchemaResult({
        success: false,
        databaseTitle: '',
        properties: {},
        error: `Connection failed: ${msg}`
      })
    } finally {
      setIsFetchingSchema(false)
    }
  }

  // Test Kakao API
  const testKakaoApi = async () => {
    if (!kakaoKey.trim()) return
    setIsTestingKakao(true)
    setKakaoTestStatus(null)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '클린 코드',
          source: 'kakao',
          kakaoApiKey: kakaoKey.trim()
        })
      })
      const data = await res.json()
      if (res.ok && data.items?.length > 0) {
        setKakaoTestStatus({
          success: true,
          message:
            lang === 'ko'
              ? `연결 성공! ${data.items.length}권의 도서가 검색되었습니다.`
              : `Connected successfully! Found ${data.items.length} books.`
        })
      } else {
        setKakaoTestStatus({
          success: false,
          message: data.error || 'Failed to fetch results from Kakao'
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setKakaoTestStatus({ success: false, message: msg })
    } finally {
      setIsTestingKakao(false)
    }
  }

  // Test Google Books API
  const testGoogleApi = async () => {
    if (!googleKey.trim()) return
    setIsTestingGoogle(true)
    setGoogleTestStatus(null)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Refactoring',
          source: 'google',
          googleApiKey: googleKey.trim()
        })
      })
      const data = await res.json()
      if (res.ok && data.items?.length > 0) {
        setGoogleTestStatus({
          success: true,
          message:
            lang === 'ko'
              ? `연결 성공! ${data.items.length}권의 도서가 검색되었습니다.`
              : `Connected successfully! Found ${data.items.length} books.`
        })
      } else {
        setGoogleTestStatus({
          success: false,
          message: data.error || 'Failed to fetch results from Google'
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setGoogleTestStatus({ success: false, message: msg })
    } finally {
      setIsTestingGoogle(false)
    }
  }

  // Generate URL & Live Config
  React.useEffect(() => {
    const getPropertyConfig = (
      propName: string
    ): { name: string; type: string } | undefined => {
      if (!propName || !schemaResult?.properties) return undefined
      const match = schemaResult.properties[propName]
      return match
        ? { name: match.name, type: match.type }
        : { name: propName, type: 'rich_text' }
    }

    if (!notionToken.trim() || !dataSourceId.trim() || !titleProp.trim()) {
      setGeneratedUrl('')
      setLiveConfig(null)
      return
    }

    const properties: NotionPropertyMapping = {
      title: titleProp.trim(),
      author: authorProp ? getPropertyConfig(authorProp) : undefined,
      publisher: publisherProp ? getPropertyConfig(publisherProp) : undefined,
      publishDate: dateProp ? getPropertyConfig(dateProp) : undefined,
      isbn: isbnProp ? getPropertyConfig(isbnProp) : undefined,
      coverFilesMedia: filesProp ? getPropertyConfig(filesProp) : undefined,
      format: formatProp
        ? {
            name: formatProp,
            type: getPropertyConfig(formatProp)?.type || 'select',
            ebookValue: ebookOptionVal.trim() || '전자책',
            paperValue: paperOptionVal.trim() || '종이책'
          }
        : undefined,
      status: statusProp
        ? {
            name: statusProp,
            type: getPropertyConfig(statusProp)?.type || 'select',
            defaultValue: statusDefaultVal.trim() || undefined
          }
        : undefined
    }

    const cleanId = cleanNotionId(dataSourceId.trim())
    const configPayload: AppConfig = {
      notionApiKey: notionToken.trim(),
      notionDataSourceId: cleanId,
      notionDatabaseId: cleanId,
      properties,
      template: templateSelection,
      kakaoApiKey: kakaoKey.trim() || undefined,
      googleApiKey: googleKey.trim() || undefined,
      theme: themePref,
      defaultSource,
      lang,
      insertBodyImage
    }

    setLiveConfig(configPayload)

    const encoded = encodeConfig(configPayload)
    const baseUrl =
      origin || (typeof window !== 'undefined' ? window.location.origin : '')
    setGeneratedUrl(`${baseUrl}/embed#config=${encoded}`)

    // Save to localStorage if enabled
    if (rememberLocal && typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            lang,
            notionToken: notionToken.trim(),
            dataSourceId: dataSourceId.trim(),
            kakaoKey: kakaoKey.trim(),
            googleKey: googleKey.trim(),
            themePref,
            defaultSource,
            insertBodyImage,
            template: templateSelection,
            properties
          })
        )
      } catch {
        // ignore
      }
    }
  }, [
    lang,
    notionToken,
    dataSourceId,
    titleProp,
    authorProp,
    publisherProp,
    dateProp,
    isbnProp,
    filesProp,
    formatProp,
    ebookOptionVal,
    paperOptionVal,
    statusProp,
    statusDefaultVal,
    templateSelection,
    kakaoKey,
    googleKey,
    themePref,
    defaultSource,
    insertBodyImage,
    rememberLocal,
    origin,
    schemaResult
  ])

  const copyEmbedUrl = () => {
    if (!generatedUrl) return
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(generatedUrl)
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), 2500)
    }
  }

  const propList = schemaResult?.properties
    ? Object.values(schemaResult.properties)
    : []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Intro Header */}
      <div className="text-center space-y-2 relative">
        <div className="absolute right-0 top-0">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="gap-1.5 text-xs font-semibold"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === 'ko' ? 'English' : '한국어'}
          </Button>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.appSubtitle}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          {t.appTitle}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto">
          {t.appDescription}
        </p>
      </div>

      {/* Step 1: Notion Connection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{t.step1Title}</CardTitle>
                <CardDescription>{t.step1Desc}</CardDescription>
              </div>
            </div>
            {schemaResult?.success && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="w-3 h-3" /> {t.notionConnectedBadge}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="notion-token-input"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.notionTokenLabel} <span className="text-rose-500">*</span>
              </label>
              <a
                href="https://www.notion.so/profile/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
              >
                {t.createIntegrationLink} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <Input
              id="notion-token-input"
              type="password"
              placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={notionToken}
              onChange={e => setNotionToken(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.notionTokenHelp}
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="notion-data-source-input"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              {t.dataSourceIdLabel} <span className="text-rose-500">*</span>
            </label>
            <Input
              id="notion-data-source-input"
              type="text"
              placeholder="Data Source ID (e.g. bc1211ca-e3f1...) or Database URL"
              value={dataSourceId}
              onChange={e => setDataSourceId(e.target.value)}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.dataSourceIdHelp}
            </p>
          </div>

          {/* Multiple Data Sources Switcher */}
          {schemaResult?.availableDataSources &&
            schemaResult.availableDataSources.length > 1 && (
              <div className="space-y-1.5 p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <label
                  htmlFor="select-sub-data-source"
                  className="text-xs font-semibold text-indigo-900 dark:text-indigo-200"
                >
                  {t.multipleDataSourcesTitle}
                </label>
                <select
                  id="select-sub-data-source"
                  value={schemaResult.dataSourceId || ''}
                  onChange={e => {
                    setDataSourceId(e.target.value)
                    fetchDatabaseSchema(e.target.value)
                  }}
                  className="w-full h-9 px-2.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {schemaResult.availableDataSources.map(ds => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              onClick={() => fetchDatabaseSchema()}
              disabled={
                isFetchingSchema || !notionToken.trim() || !dataSourceId.trim()
              }
              className="gap-2"
            >
              {isFetchingSchema ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.testingNotionButton}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {t.testNotionButton}
                </>
              )}
            </Button>
          </div>

          {/* Schema result feedback */}
          {schemaResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs ${
                schemaResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              }`}
            >
              {schemaResult.success ? (
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {lang === 'ko' ? '서재 데이터베이스' : 'Database'}:{' '}
                      {schemaResult.databaseTitle}
                    </span>
                  </div>
                  <p className="text-[11px]">
                    Data Source ID:{' '}
                    <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                      {schemaResult.dataSourceId}
                    </code>
                  </p>
                  <p className="text-[11px]">
                    {lang === 'ko'
                      ? `총 ${Object.keys(schemaResult.properties).length}개의 속성 컬럼과 ${(schemaResult.templates || []).length}개의 템플릿을 불러왔습니다.`
                      : `Loaded ${Object.keys(schemaResult.properties).length} properties and ${(schemaResult.templates || []).length} templates.`}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{schemaResult.error}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Database Column Mapping */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{t.step2Title}</CardTitle>
              <CardDescription>{t.step2Desc}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1">
              <label
                htmlFor="title-prop-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.colTitle} <span className="text-rose-500">*</span>
              </label>
              {propList.length > 0 ? (
                <select
                  id="title-prop-select"
                  value={titleProp}
                  onChange={e => setTitleProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">
                    {lang === 'ko'
                      ? '제목 컬럼을 선택하세요'
                      : 'Select Title column'}
                  </option>
                  {propList
                    .filter(p => p.type === 'title')
                    .map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                </select>
              ) : (
                <Input
                  id="title-prop-select"
                  type="text"
                  placeholder="e.g. 제목, Name, Title"
                  value={titleProp}
                  onChange={e => setTitleProp(e.target.value)}
                />
              )}
            </div>

            {/* Author */}
            <div className="space-y-1">
              <label
                htmlFor="author-prop-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.colAuthor}
              </label>
              {propList.length > 0 ? (
                <select
                  id="author-prop-select"
                  value={authorProp}
                  onChange={e => setAuthorProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">{t.noneOption}</option>
                  {propList
                    .filter(
                      p => p.type === 'rich_text' || p.type === 'multi_select'
                    )
                    .map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                </select>
              ) : (
                <Input
                  id="author-prop-select"
                  type="text"
                  placeholder="e.g. 저자, 지은이, Author"
                  value={authorProp}
                  onChange={e => setAuthorProp(e.target.value)}
                />
              )}
            </div>

            {/* Publisher */}
            <div className="space-y-1">
              <label
                htmlFor="pub-prop-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.colPublisher}
              </label>
              {propList.length > 0 ? (
                <select
                  id="pub-prop-select"
                  value={publisherProp}
                  onChange={e => setPublisherProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">{t.noneOption}</option>
                  {propList
                    .filter(p => p.type === 'rich_text' || p.type === 'select')
                    .map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                </select>
              ) : (
                <Input
                  id="pub-prop-select"
                  type="text"
                  placeholder="e.g. 출판사, Publisher"
                  value={publisherProp}
                  onChange={e => setPublisherProp(e.target.value)}
                />
              )}
            </div>

            {/* Publish Date */}
            <div className="space-y-1">
              <label
                htmlFor="date-prop-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.colDate}
              </label>
              {propList.length > 0 ? (
                <select
                  id="date-prop-select"
                  value={dateProp}
                  onChange={e => setDateProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">{t.noneOption}</option>
                  {propList
                    .filter(p => p.type === 'date' || p.type === 'rich_text')
                    .map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                </select>
              ) : (
                <Input
                  id="date-prop-select"
                  type="text"
                  placeholder="e.g. 출간일, 발행일, Date"
                  value={dateProp}
                  onChange={e => setDateProp(e.target.value)}
                />
              )}
            </div>

            {/* ISBN (Used for Duplicate Detection) */}
            <div className="space-y-1">
              <label
                htmlFor="isbn-prop-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.colIsbn}
              </label>
              {propList.length > 0 ? (
                <select
                  id="isbn-prop-select"
                  value={isbnProp}
                  onChange={e => setIsbnProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">{t.noneOption}</option>
                  {propList
                    .filter(p => p.type === 'rich_text' || p.type === 'number')
                    .map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                </select>
              ) : (
                <Input
                  id="isbn-prop-select"
                  type="text"
                  placeholder="e.g. ISBN"
                  value={isbnProp}
                  onChange={e => setIsbnProp(e.target.value)}
                />
              )}
            </div>

            {/* Files & Media Cover */}
            <div className="space-y-1">
              <label
                htmlFor="files-prop-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.colFiles}
              </label>
              {propList.length > 0 ? (
                <select
                  id="files-prop-select"
                  value={filesProp}
                  onChange={e => setFilesProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">{t.noneOption}</option>
                  {propList
                    .filter(p => p.type === 'files')
                    .map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                </select>
              ) : (
                <Input
                  id="files-prop-select"
                  type="text"
                  placeholder="e.g. 표지, Cover (Optional)"
                  value={filesProp}
                  onChange={e => setFilesProp(e.target.value)}
                />
              )}
            </div>

            {/* Book Format (eBook / Paper Book) */}
            <div className="space-y-1">
              <label
                htmlFor="format-prop-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.colFormat}
              </label>
              {propList.length > 0 ? (
                <select
                  id="format-prop-select"
                  value={formatProp}
                  onChange={e => setFormatProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">{t.noneOption}</option>
                  {propList
                    .filter(p => p.type === 'select' || p.type === 'rich_text')
                    .map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                </select>
              ) : (
                <Input
                  id="format-prop-select"
                  type="text"
                  placeholder="e.g. 형태, 구분, Format (Optional)"
                  value={formatProp}
                  onChange={e => setFormatProp(e.target.value)}
                />
              )}
            </div>

            {/* Book Format Options Mapping if selected */}
            {formatProp &&
              (() => {
                const formatProperty = schemaResult?.properties[formatProp]
                const dbOpts = formatProperty?.options || []
                const optNames = dbOpts.map(o => o.name)
                const isCustomEbook =
                  optNames.length > 0 && !optNames.includes(ebookOptionVal)
                const isCustomPaper =
                  optNames.length > 0 && !optNames.includes(paperOptionVal)

                return (
                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-indigo-50/60 dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                    {/* Visual badges of options defined in Notion */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="font-semibold text-indigo-950 dark:text-indigo-200">
                        {t.registeredOptionsNotice}
                      </span>
                      {dbOpts.length > 0 ? (
                        dbOpts.map(opt => (
                          <span
                            key={opt.id}
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-xs text-slate-800 dark:text-slate-200"
                          >
                            {opt.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {lang === 'ko'
                            ? '(노션 속성에 등록된 선택지가 없습니다)'
                            : '(No options found in this Notion property)'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* eBook Option Dropdown */}
                      <div className="space-y-1">
                        <label
                          htmlFor="ebook-val-select"
                          className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          {t.colFormatEbookValue}
                        </label>
                        {dbOpts.length > 0 ? (
                          <select
                            id="ebook-val-select"
                            value={
                              isCustomEbook ? '__custom__' : ebookOptionVal
                            }
                            onChange={e => {
                              const val = e.target.value
                              if (val !== '__custom__') setEbookOptionVal(val)
                            }}
                            className="w-full h-9 px-2.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                          >
                            {dbOpts.map(opt => (
                              <option key={opt.id} value={opt.name}>
                                {opt.name}
                              </option>
                            ))}
                            <option value="__custom__">
                              {lang === 'ko'
                                ? '직접 입력...'
                                : 'Custom value...'}
                            </option>
                          </select>
                        ) : (
                          <Input
                            id="ebook-val-select"
                            type="text"
                            placeholder="e.g. 전자책 또는 eBook"
                            value={ebookOptionVal}
                            onChange={e => setEbookOptionVal(e.target.value)}
                            className="h-9 text-xs"
                          />
                        )}
                        {isCustomEbook && dbOpts.length > 0 && (
                          <Input
                            type="text"
                            placeholder={t.customValuePlaceholder}
                            value={ebookOptionVal}
                            onChange={e => setEbookOptionVal(e.target.value)}
                            className="h-8 text-xs mt-1"
                          />
                        )}
                      </div>

                      {/* Paper Option Dropdown */}
                      <div className="space-y-1">
                        <label
                          htmlFor="paper-val-select"
                          className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          {t.colFormatPaperValue}
                        </label>
                        {dbOpts.length > 0 ? (
                          <select
                            id="paper-val-select"
                            value={
                              isCustomPaper ? '__custom__' : paperOptionVal
                            }
                            onChange={e => {
                              const val = e.target.value
                              if (val !== '__custom__') setPaperOptionVal(val)
                            }}
                            className="w-full h-9 px-2.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                          >
                            {dbOpts.map(opt => (
                              <option key={opt.id} value={opt.name}>
                                {opt.name}
                              </option>
                            ))}
                            <option value="__custom__">
                              {lang === 'ko'
                                ? '직접 입력...'
                                : 'Custom value...'}
                            </option>
                          </select>
                        ) : (
                          <Input
                            id="paper-val-select"
                            type="text"
                            placeholder="e.g. 종이책 또는 단행본"
                            value={paperOptionVal}
                            onChange={e => setPaperOptionVal(e.target.value)}
                            className="h-9 text-xs"
                          />
                        )}
                        {isCustomPaper && dbOpts.length > 0 && (
                          <Input
                            type="text"
                            placeholder={t.customValuePlaceholder}
                            value={paperOptionVal}
                            onChange={e => setPaperOptionVal(e.target.value)}
                            className="h-8 text-xs mt-1"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

            {/* Status (상태) Column Mapping */}
            <div className="space-y-1">
              <label
                htmlFor="status-prop-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.colStatus}
              </label>
              {propList.length > 0 ? (
                <select
                  id="status-prop-select"
                  value={statusProp}
                  onChange={e => {
                    const nextProp = e.target.value
                    setStatusProp(nextProp)
                    const match = schemaResult?.properties[nextProp]
                    if (match?.options && match.options.length > 0) {
                      const owned = match.options.find(o =>
                        /소장|보유|owned/i.test(o.name)
                      )
                      setStatusDefaultVal(
                        owned ? owned.name : match.options[0].name
                      )
                    }
                  }}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">{t.noneOption}</option>
                  {propList
                    .filter(p => p.type === 'select' || p.type === 'status')
                    .map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                </select>
              ) : (
                <Input
                  id="status-prop-select"
                  type="text"
                  placeholder="e.g. 상태, Status (Optional)"
                  value={statusProp}
                  onChange={e => setStatusProp(e.target.value)}
                />
              )}
            </div>

            {/* Default Status Value Selector if statusProp selected */}
            {statusProp && (
              <div className="space-y-1">
                <label
                  htmlFor="status-default-val-select"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {t.colStatusDefaultValue}
                </label>
                {schemaResult?.properties[statusProp]?.options &&
                schemaResult.properties[statusProp].options?.length > 0 ? (
                  <select
                    id="status-default-val-select"
                    value={statusDefaultVal}
                    onChange={e => setStatusDefaultVal(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    {schemaResult.properties[statusProp].options?.map(opt => (
                      <option key={opt.id} value={opt.name}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="status-default-val-select"
                    type="text"
                    placeholder="e.g. 소장, 위시리스트"
                    value={statusDefaultVal}
                    onChange={e => setStatusDefaultVal(e.target.value)}
                  />
                )}
              </div>
            )}

            {/* Template Selection */}
            <div className="space-y-1">
              <label
                htmlFor="template-prop-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.colTemplate}
              </label>
              <select
                id="template-prop-select"
                value={
                  templateSelection.type === 'template_id'
                    ? templateSelection.template_id
                    : templateSelection.type
                }
                onChange={e => {
                  const val = e.target.value
                  if (val === 'none') {
                    setTemplateSelection({ type: 'none' })
                  } else if (val === 'default') {
                    setTemplateSelection({ type: 'default' })
                  } else {
                    const found = schemaResult?.templates?.find(
                      t => t.id === val
                    )
                    setTemplateSelection({
                      type: 'template_id',
                      template_id: val,
                      name: found?.name
                    })
                  }
                }}
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="none">{t.templateNone}</option>
                <option value="default">{t.templateDefault}</option>
                {schemaResult?.templates?.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t.coverNotice}
          </p>
        </CardContent>
      </Card>

      {/* Step 3: Search API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{t.step3Title}</CardTitle>
              <CardDescription>{t.step3Desc}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Kakao */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="kakao-key-input"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <span>{t.kakaoKeyLabel}</span>
                <Badge variant="kakao" className="text-[10px]">
                  {t.kakaoKeyBadge}
                </Badge>
              </label>
              <a
                href="https://developers.kakao.com/console/app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
              >
                {t.getKakaoKeyLink} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <Input
                id="kakao-key-input"
                type="password"
                placeholder="Kakao REST API Key"
                value={kakaoKey}
                onChange={e => setKakaoKey(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={testKakaoApi}
                disabled={isTestingKakao || !kakaoKey.trim()}
              >
                {isTestingKakao ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t.testButton
                )}
              </Button>
            </div>
            {kakaoTestStatus && (
              <p
                className={`text-xs ${
                  kakaoTestStatus.success
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {kakaoTestStatus.message}
              </p>
            )}
          </div>

          {/* Google Books */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="google-key-input"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <span>{t.googleKeyLabel}</span>
                <Badge variant="google" className="text-[10px]">
                  {t.googleKeyBadge}
                </Badge>
              </label>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
              >
                {t.getGoogleKeyLink} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <Input
                id="google-key-input"
                type="password"
                placeholder="Google Books API Key"
                value={googleKey}
                onChange={e => setGoogleKey(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={testGoogleApi}
                disabled={isTestingGoogle || !googleKey.trim()}
              >
                {isTestingGoogle ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t.testButton
                )}
              </Button>
            </div>
            {googleTestStatus && (
              <p
                className={`text-xs ${
                  googleTestStatus.success
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {googleTestStatus.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.step4Title}</CardTitle>
          <CardDescription>{t.step4Desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label
                htmlFor="theme-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.defaultThemeLabel}
              </label>
              <select
                id="theme-select"
                value={themePref}
                onChange={e => setThemePref(e.target.value as ThemePreference)}
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="auto">{t.themeAuto}</option>
                <option value="light">{t.themeLight}</option>
                <option value="dark">{t.themeDark}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="default-source-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t.defaultTabLabel}
              </label>
              <select
                id="default-source-select"
                value={defaultSource}
                onChange={e =>
                  setDefaultSource(e.target.value as SearchSourceFilter)
                }
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="all">{t.tabAllLabel}</option>
                <option value="kakao">{t.tabKakaoLabel}</option>
                <option value="google">{t.tabGoogleLabel}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="insert-body-image"
                checked={insertBodyImage}
                onChange={e => setInsertBodyImage(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="insert-body-image"
                className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {t.insertBodyImageLabel}
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberLocal}
                onChange={e => setRememberLocal(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="remember"
                className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {t.rememberSettings}
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 5: Generated Embed URL */}
      <Card className="border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{t.step5Title}</CardTitle>
              <CardDescription>{t.step5Desc}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {generatedUrl ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  id="generated-embed-url"
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="font-mono text-xs bg-slate-50 dark:bg-slate-950"
                />
                <Button onClick={copyEmbedUrl} className="shrink-0 gap-1.5">
                  {hasCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      {t.copiedButton}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      {t.copyUrlButton}
                    </>
                  )}
                </Button>
              </div>

              {/* Instructions on embedding in Notion */}
              <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
                <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">
                  {t.embedInstructionsTitle}
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  <li>{t.embedStep1}</li>
                  <li>{t.embedStep2}</li>
                  <li>{t.embedStep3}</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              {t.incompleteConfigNotice}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 6: Live Widget Preview */}
      {liveConfig && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              <div>
                <CardTitle className="text-lg">{t.step6Title}</CardTitle>
                <CardDescription>{t.step6Desc}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 border-t border-slate-200 dark:border-slate-800 overflow-hidden rounded-b-xl">
            <div className="max-h-[600px] overflow-y-auto">
              <EmbedWidget initialConfig={liveConfig} standalone={false} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
