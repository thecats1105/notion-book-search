import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Eye,
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
import { cleanNotionId } from '@/lib/notion'
import type {
  AppConfig,
  NotionPropertyMapping,
  SearchSourceFilter,
  ThemePreference
} from '@/types/config'
import type { NotionSchemaResult } from '@/types/notion'

const STORAGE_KEY = 'notion_book_search_generator_config_v1'

export function UrlGenerator() {
  // Notion states
  const [notionToken, setNotionToken] = React.useState('')
  const [databaseId, setDatabaseId] = React.useState('')
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
  const [rememberLocal, setRememberLocal] = React.useState(true)

  // Output states
  const [generatedUrl, setGeneratedUrl] = React.useState('')
  const [hasCopied, setHasCopied] = React.useState(false)
  const [liveConfig, setLiveConfig] = React.useState<AppConfig | null>(null)
  const [origin, setOrigin] = React.useState('')

  // Load saved state on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.notionToken) setNotionToken(parsed.notionToken)
          if (parsed.databaseId) setDatabaseId(parsed.databaseId)
          if (parsed.kakaoKey) setKakaoKey(parsed.kakaoKey)
          if (parsed.googleKey) setGoogleKey(parsed.googleKey)
          if (parsed.themePref) setThemePref(parsed.themePref)
          if (parsed.defaultSource) setDefaultSource(parsed.defaultSource)
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
          }
        }
      } catch {
        // Ignore localStorage error
      }
    }
  }, [])

  // Auto-fetch schema
  const fetchDatabaseSchema = async () => {
    const cleanToken = notionToken.trim()
    const cleanDb = cleanNotionId(databaseId)

    if (!cleanToken || !cleanDb) return

    setIsFetchingSchema(true)
    setSchemaResult(null)

    try {
      const res = await fetch('/api/notion/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionToken: cleanToken,
          databaseId: cleanDb
        })
      })

      const data = (await res.json()) as NotionSchemaResult
      setSchemaResult(data)

      if (data.success && data.properties) {
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
          query: 'Clean Code',
          source: 'kakao',
          kakaoApiKey: kakaoKey.trim()
        })
      })
      const data = await res.json()
      if (res.ok && data.items?.length > 0) {
        setKakaoTestStatus({
          success: true,
          message: `Connected successfully! Found ${data.items.length} books.`
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
          message: `Connected successfully! Found ${data.items.length} books.`
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
    if (!notionToken.trim() || !databaseId.trim() || !titleProp.trim()) {
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
      coverFilesMedia: filesProp ? getPropertyConfig(filesProp) : undefined
    }

    const configPayload: AppConfig = {
      notionApiKey: notionToken.trim(),
      notionDatabaseId: cleanNotionId(databaseId.trim()),
      properties,
      kakaoApiKey: kakaoKey.trim() || undefined,
      googleApiKey: googleKey.trim() || undefined,
      theme: themePref,
      defaultSource
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
            notionToken: notionToken.trim(),
            databaseId: databaseId.trim(),
            kakaoKey: kakaoKey.trim(),
            googleKey: googleKey.trim(),
            themePref,
            defaultSource,
            properties
          })
        )
      } catch {
        // ignore
      }
    }
  }, [
    notionToken,
    databaseId,
    titleProp,
    authorProp,
    publisherProp,
    dateProp,
    isbnProp,
    filesProp,
    kakaoKey,
    googleKey,
    themePref,
    defaultSource,
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
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Notion Book Library Widget Setup</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Notion Book Search Generator
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto">
          Configure your Notion database and book search API keys. Generate a
          secure, private embed URL with high-definition book covers.
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
                <CardTitle className="text-lg">
                  Step 1: Notion Integration Setup
                </CardTitle>
                <CardDescription>
                  Connect your Notion workspace integration and target bookshelf
                  database
                </CardDescription>
              </div>
            </div>
            {schemaResult?.success && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="w-3 h-3" /> Connected
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
                Notion Internal Integration Secret Token{' '}
                <span className="text-rose-500">*</span>
              </label>
              <a
                href="https://www.notion.so/profile/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
              >
                Create Integration <ExternalLink className="w-3 h-3" />
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
              Must start with{' '}
              <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                secret_
              </code>
              . Remember to invite this integration to your database in Notion
              via "..." &rarr; "Connect to".
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="notion-db-input"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Notion Database ID or URL <span className="text-rose-500">*</span>
            </label>
            <Input
              id="notion-db-input"
              type="text"
              placeholder="e.g. 1a2b3c4d5e6f... or full Notion database URL"
              value={databaseId}
              onChange={e => setDatabaseId(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              onClick={fetchDatabaseSchema}
              disabled={
                isFetchingSchema || !notionToken.trim() || !databaseId.trim()
              }
              className="gap-2"
            >
              {isFetchingSchema ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing & Loading Schema...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Test Connection & Fetch Properties
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
                    <span>Database: {schemaResult.databaseTitle}</span>
                  </div>
                  <p className="text-[11px]">
                    Successfully loaded{' '}
                    {Object.keys(schemaResult.properties).length} properties.
                    Check Step 2 below to map columns.
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
              <CardTitle className="text-lg">
                Step 2: Database Column Mapping
              </CardTitle>
              <CardDescription>
                Map book attributes to your Notion database properties
              </CardDescription>
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
                Book Title Column (Title type){' '}
                <span className="text-rose-500">*</span>
              </label>
              {propList.length > 0 ? (
                <select
                  id="title-prop-select"
                  value={titleProp}
                  onChange={e => setTitleProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select Title column</option>
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
                Author / Writer Column
              </label>
              {propList.length > 0 ? (
                <select
                  id="author-prop-select"
                  value={authorProp}
                  onChange={e => setAuthorProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">(None / Don't save)</option>
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
                  placeholder="e.g. 지은이, 저자, Author"
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
                Publisher Column
              </label>
              {propList.length > 0 ? (
                <select
                  id="pub-prop-select"
                  value={publisherProp}
                  onChange={e => setPublisherProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">(None / Don't save)</option>
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
                Publish Date Column
              </label>
              {propList.length > 0 ? (
                <select
                  id="date-prop-select"
                  value={dateProp}
                  onChange={e => setDateProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">(None / Don't save)</option>
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
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
              >
                ISBN Column{' '}
                <Badge variant="secondary" className="text-[10px]">
                  Used for Duplicate Check
                </Badge>
              </label>
              {propList.length > 0 ? (
                <select
                  id="isbn-prop-select"
                  value={isbnProp}
                  onChange={e => setIsbnProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">(None / Don't save)</option>
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

            {/* Optional Files & Media Cover */}
            <div className="space-y-1">
              <label
                htmlFor="files-prop-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Additional Cover File Column (Files & Media)
              </label>
              {propList.length > 0 ? (
                <select
                  id="files-prop-select"
                  value={filesProp}
                  onChange={e => setFilesProp(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">(None / Page Cover only)</option>
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
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            * High-resolution book covers are always automatically assigned to
            the Notion <strong>Page Cover</strong>.
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
              <CardTitle className="text-lg">
                Step 3: Book Search API Keys
              </CardTitle>
              <CardDescription>
                Configure Kakao (Daum) and Google Books search keys
              </CardDescription>
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
                <span>Kakao REST API Key (Domestic Books)</span>
                <Badge variant="kakao" className="text-[10px]">
                  Recommended
                </Badge>
              </label>
              <a
                href="https://developers.kakao.com/console/app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
              >
                Get Kakao Key <ExternalLink className="w-3 h-3" />
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
                  'Test'
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
                <span>Google Books API Key (International Books)</span>
                <Badge variant="google" className="text-[10px]">
                  Global Coverage
                </Badge>
              </label>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
              >
                Get Google Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <Input
                id="google-key-input"
                type="password"
                placeholder="Google Books API Key (Optional but recommended)"
                value={googleKey}
                onChange={e => setGoogleKey(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={testGoogleApi}
                disabled={isTestingGoogle}
              >
                {isTestingGoogle ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Test'
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
          <CardTitle className="text-lg">Step 4: Widget Preferences</CardTitle>
          <CardDescription>
            Customize the look and behavior of the embedded widget
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label
                htmlFor="theme-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Default Theme
              </label>
              <select
                id="theme-select"
                value={themePref}
                onChange={e => setThemePref(e.target.value as ThemePreference)}
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="auto">Auto (Match System / Browser)</option>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="default-source-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Default Search Tab
              </label>
              <select
                id="default-source-select"
                value={defaultSource}
                onChange={e =>
                  setDefaultSource(e.target.value as SearchSourceFilter)
                }
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="all">All (Kakao + Google Combined)</option>
                <option value="kakao">Kakao Books Only</option>
                <option value="google">Google Books Only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
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
              Remember these settings in this browser (Stored locally in
              localStorage for future updates)
            </label>
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
              <CardTitle className="text-lg">
                Step 5: Your Notion Embed URL
              </CardTitle>
              <CardDescription>
                Copy this URL and embed it directly into your Notion bookshelf
                page
              </CardDescription>
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
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy URL
                    </>
                  )}
                </Button>
              </div>

              {/* Instructions on embedding in Notion */}
              <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
                <h4 className="font-semibold text-indigo-900 dark:text-indigo-200">
                  How to embed in your Notion page:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  <li>
                    In your Notion page, type{' '}
                    <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded font-mono">
                      /embed
                    </code>{' '}
                    and press Enter
                  </li>
                  <li>
                    Paste the copied URL into the embed link field and click{' '}
                    <strong>Embed link</strong>
                  </li>
                  <li>
                    Adjust the widget width or height freely. The search widget
                    adapts to any layout!
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              Please enter your Notion Integration Secret, Database ID, and
              Title column above to generate your embed link.
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
                <CardTitle className="text-lg">
                  Live Interactive Preview
                </CardTitle>
                <CardDescription>
                  Test searching books and duplicate checking right here before
                  adding to Notion
                </CardDescription>
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
