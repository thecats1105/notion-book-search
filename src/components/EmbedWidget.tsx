import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Moon,
  Search,
  Smartphone,
  Sun,
  X
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { decodeConfig } from '@/lib/config-codec'
import { type Language, translations } from '@/lib/i18n'
import { checkNotionBookExists, saveBookToNotion } from '@/lib/notion'
import { searchBooks } from '@/lib/search'
import type { BookItem } from '@/types/book'
import type {
  AppConfig,
  TemplateSelection,
  ThemePreference
} from '@/types/config'
import type { NotionCheckResult } from '@/types/notion'

interface EmbedWidgetProps {
  initialConfig?: AppConfig | null
  standalone?: boolean
}

export function EmbedWidget({
  initialConfig,
  standalone = false
}: EmbedWidgetProps) {
  const [config, setConfig] = React.useState<AppConfig | null>(
    initialConfig || null
  )
  const [lang, setLang] = React.useState<Language>('ko')
  const [theme, setTheme] = React.useState<ThemePreference>('auto')
  const [isDarkMode, setIsDarkMode] = React.useState(false)

  const [query, setQuery] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<'all' | 'kakao' | 'google'>(
    'all'
  )
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSearchingGoogle, setIsSearchingGoogle] = React.useState(false)
  const currentSearchId = React.useRef(0)
  const [books, setBooks] = React.useState<BookItem[]>([])
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [hasSearched, setHasSearched] = React.useState(false)

  // Selected book for modal
  const [selectedBook, setSelectedBook] = React.useState<BookItem | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = React.useState(false)
  const [duplicateStatus, setDuplicateStatus] =
    React.useState<NotionCheckResult | null>(null)
  const [selectedTemplate, setSelectedTemplate] =
    React.useState<TemplateSelection>({ type: 'none' })
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveSuccessUrl, setSaveSuccessUrl] = React.useState<string | null>(
    null
  )
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [copiedIsbn, setCopiedIsbn] = React.useState(false)

  const t = translations[lang]

  // Load config from URL hash if not provided via props
  React.useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig)
      if (initialConfig.lang) setLang(initialConfig.lang)
      if (initialConfig.theme) setTheme(initialConfig.theme)
      if (initialConfig.defaultSource) setActiveTab(initialConfig.defaultSource)
      if (initialConfig.template) setSelectedTemplate(initialConfig.template)
      return
    }

    if (typeof window !== 'undefined') {
      const parsed = decodeConfig(window.location.hash)
      if (parsed) {
        setConfig(parsed)
        if (parsed.lang) setLang(parsed.lang)
        if (parsed.theme) setTheme(parsed.theme)
        if (parsed.defaultSource) setActiveTab(parsed.defaultSource)
        if (parsed.template) setSelectedTemplate(parsed.template)
      }
    }
  }, [initialConfig])

  // Setup theme
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const applyTheme = (dark: boolean) => {
      setIsDarkMode(dark)
      if (dark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    if (theme === 'dark') {
      applyTheme(true)
    } else if (theme === 'light') {
      applyTheme(false)
    } else {
      const systemDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
      applyTheme(systemDark)
    }
  }, [theme])

  const toggleTheme = () => {
    const nextDark = !isDarkMode
    setIsDarkMode(nextDark)
    if (nextDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleLanguage = () => {
    setLang(prev => (prev === 'ko' ? 'en' : 'ko'))
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    const searchId = ++currentSearchId.current
    setIsLoading(true)
    setIsSearchingGoogle(activeTab === 'all')
    setErrorMessage(null)
    setHasSearched(true)
    setBooks([])

    try {
      const data = await searchBooks(
        {
          query: trimmed,
          source: activeTab,
          kakaoApiKey: config?.kakaoApiKey,
          googleApiKey: config?.googleApiKey
        },
        {
          onPartialResult: (items, source) => {
            if (searchId !== currentSearchId.current) return

            if (source === 'kakao') {
              // Kakao returned first: display results immediately and hide main spinner
              setBooks(items)
              setIsLoading(false)
            } else if (source === 'google') {
              // Google returned: merge and append new items without duplicates
              setBooks(prev => {
                const seen = new Set(prev.map(b => b.isbn).filter(Boolean))
                const uniqueGoogle = items.filter(
                  b => !b.isbn || !seen.has(b.isbn)
                )
                return [...prev, ...uniqueGoogle]
              })
              setIsLoading(false)
              setIsSearchingGoogle(false)
            }
          }
        }
      )

      if (searchId === currentSearchId.current) {
        setIsSearchingGoogle(false)
        if (data.items.length === 0) {
          setBooks([])
          if (data.error) {
            setErrorMessage(data.error)
          }
        }
      }
    } catch (err) {
      if (searchId === currentSearchId.current) {
        const msg = err instanceof Error ? err.message : String(err)
        setErrorMessage(`Search error: ${msg}`)
        setIsSearchingGoogle(false)
      }
    } finally {
      if (searchId === currentSearchId.current) {
        setIsLoading(false)
        setIsSearchingGoogle(false)
      }
    }
  }

  // Handle book selection & duplicate check
  const handleOpenBook = async (book: BookItem) => {
    setSelectedBook(book)
    setDuplicateStatus(null)
    setSaveSuccessUrl(null)
    setSaveError(null)
    setCopiedIsbn(false)
    if (config?.template) {
      setSelectedTemplate(config.template)
    }

    const targetId = config?.notionDataSourceId || config?.notionDatabaseId
    if (!config?.properties?.isbn || !book.isbn || !targetId) {
      return
    }

    setIsCheckingDuplicate(true)
    try {
      const data = await checkNotionBookExists(
        config.notionApiKey,
        targetId,
        config.properties.isbn,
        book.isbn
      )
      setDuplicateStatus(data)
    } catch {
      // Ignore check failure silently
    } finally {
      setIsCheckingDuplicate(false)
    }
  }

  // Save to Notion
  const handleSaveToNotion = async () => {
    if (!config || !selectedBook) return

    setIsSaving(true)
    setSaveError(null)

    const targetId = config.notionDataSourceId || config.notionDatabaseId
    const origin = typeof window !== 'undefined' ? window.location.origin : ''

    try {
      const data = await saveBookToNotion(
        config.notionApiKey,
        targetId,
        config.properties,
        selectedBook,
        {
          template: selectedTemplate,
          origin,
          insertBodyImage: config.insertBodyImage !== false
        }
      )

      if (data.success) {
        setSaveSuccessUrl(data.pageUrl || '')
        setDuplicateStatus({
          exists: true,
          pageUrl: data.pageUrl,
          pageTitle: selectedBook.title
        })
      } else {
        setSaveError(data.error || 'Failed to save to Notion')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setSaveError(`Save error: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  const copyIsbn = (isbnText: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(isbnText)
      setCopiedIsbn(true)
      setTimeout(() => setCopiedIsbn(false), 2000)
    }
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center text-slate-800 dark:text-slate-200">
        <div className="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-full text-amber-600 dark:text-amber-400 mb-3">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold">
          {lang === 'ko'
            ? '노션 설정이 감지되지 않았습니다'
            : 'No Notion Configuration Detected'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          {lang === 'ko'
            ? 'URL 생성기 화면으로 이동하여 노션 데이터베이스 및 API 키를 설정해주세요.'
            : 'Please open the URL Generator to configure your Notion database and API keys.'}
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            if (typeof window !== 'undefined') window.location.href = '/'
          }}
        >
          {lang === 'ko' ? '설정 생성기 열기' : 'Open URL Generator'}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={`w-full flex flex-col ${
        standalone ? 'min-h-screen' : 'min-h-[500px]'
      } bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors`}
    >
      {/* Top Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight hidden sm:inline">
                {t.appTitle}
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.tabAll}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('kakao')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'kakao'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.tabKakao}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('google')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'google'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.tabGoogle}
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* Language Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                aria-label={t.langToggle}
                className="h-8 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                <Globe className="w-3.5 h-3.5 mr-1" />
                {lang === 'ko' ? '한국어' : 'EN'}
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={t.themeToggle}
                className="text-slate-600 dark:text-slate-400 h-8 w-8"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Search Input Form */}
          <form
            onSubmit={handleSearch}
            className="relative flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder={t.searchPlaceholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 pr-8 h-10 text-sm shadow-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="h-10 px-4"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t.searchButton
              )}
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full p-4 flex-1">
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSearchingGoogle && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-blue-600 dark:text-blue-400" />
            <span>{t.searchingGoogleBackground}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">{t.searchingText}</p>
          </div>
        )}

        {/* Initial Empty State */}
        {!isLoading && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t.initialSearchTitle}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.initialSearchDesc}
            </p>
          </div>
        )}

        {/* No Results State */}
        {!isLoading && hasSearched && books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {t.noResultsTitle}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{t.noResultsDesc}</p>
          </div>
        )}

        {/* Books Grid */}
        {!isLoading && books.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {books.map(book => (
              <button
                type="button"
                key={book.id}
                onClick={() => handleOpenBook(book)}
                className="group relative flex flex-col text-left rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer"
              >
                {/* Book Cover Container with 2:3 ratio */}
                <div className="relative aspect-[2/3] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                  {book.thumbnail ? (
                    <img
                      src={book.thumbnail}
                      alt={book.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={e => {
                        const target = e.currentTarget
                        if (
                          book.originalThumbnail &&
                          target.src !== book.originalThumbnail
                        ) {
                          target.src = book.originalThumbnail
                        } else {
                          target.style.display = 'none'
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-slate-300 dark:text-slate-600">
                      <BookOpen className="w-8 h-8 mb-1" />
                      <span className="text-[10px] text-center line-clamp-2">
                        {t.noCover}
                      </span>
                    </div>
                  )}

                  {/* Provider & Format Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    <Badge
                      variant={book.source === 'kakao' ? 'kakao' : 'google'}
                      className="text-[10px] px-1.5 py-0.2"
                    >
                      {book.source === 'kakao' ? 'Kakao' : 'Google'}
                    </Badge>
                    {book.format === 'ebook' ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-600 text-white shadow-xs">
                        <Smartphone className="w-2.5 h-2.5" />
                        {t.ebook}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-slate-800/80 text-slate-100 backdrop-blur-xs">
                        {t.paperBook}
                      </span>
                    )}
                  </div>
                </div>

                {/* Book Details */}
                <div className="p-2.5 flex flex-col flex-1 w-full">
                  <h4 className="text-xs font-semibold leading-tight line-clamp-2 text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {book.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                    {book.authors.join(', ') || t.unknownAuthor}
                  </p>
                  <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate max-w-[70%]">
                      {book.publisher || '-'}
                    </span>
                    <span>
                      {book.publishedDate ? book.publishedDate.slice(0, 4) : ''}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Book Detail & Save Modal */}
      <Dialog
        open={!!selectedBook}
        onOpenChange={open => !open && setSelectedBook(null)}
      >
        {selectedBook && (
          <div className="flex flex-col max-h-[85vh] overflow-y-auto">
            <DialogClose onClick={() => setSelectedBook(null)} />

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              {/* Cover preview */}
              <div className="w-32 sm:w-36 shrink-0 mx-auto sm:mx-0 aspect-[2/3] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {selectedBook.thumbnail ? (
                  <img
                    src={selectedBook.thumbnail}
                    alt={selectedBook.title}
                    className="w-full h-full object-cover"
                    onError={e => {
                      if (
                        selectedBook.originalThumbnail &&
                        e.currentTarget.src !== selectedBook.originalThumbnail
                      ) {
                        e.currentTarget.src = selectedBook.originalThumbnail
                      }
                    }}
                  />
                ) : (
                  <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                )}
              </div>

              {/* Header Info */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <Badge
                    variant={
                      selectedBook.source === 'kakao' ? 'kakao' : 'google'
                    }
                    className="text-[10px]"
                  >
                    {selectedBook.source === 'kakao'
                      ? 'Kakao Books'
                      : 'Google Books'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      selectedBook.format === 'ebook'
                        ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 font-bold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {selectedBook.format === 'ebook' ? (
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        {t.ebook}
                      </span>
                    ) : (
                      t.paperBook
                    )}
                  </Badge>
                  {selectedBook.url && (
                    <a
                      href={selectedBook.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-indigo-600 inline-flex items-center gap-0.5 ml-auto"
                    >
                      {t.storeLink} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <DialogTitle className="text-base sm:text-lg">
                  {selectedBook.title}
                </DialogTitle>

                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                  {selectedBook.authors.join(', ') || t.unknownAuthor}
                </p>

                <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {t.publisher}:{' '}
                    </span>
                    {selectedBook.publisher || 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {t.publishDate}:{' '}
                    </span>
                    {selectedBook.publishedDate || 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {t.format}:{' '}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBook(prev =>
                          prev
                            ? {
                                ...prev,
                                format:
                                  prev.format === 'ebook' ? 'paper' : 'ebook'
                              }
                            : null
                        )
                      }}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border cursor-pointer hover:opacity-80 transition ${
                        selectedBook.format === 'ebook'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                      title={t.formatChangeNotice}
                    >
                      {selectedBook.format === 'ebook' ? (
                        <>
                          <Smartphone className="w-3 h-3 text-purple-600" />
                          <span>
                            {typeof config?.properties?.format === 'object' &&
                            'ebookValue' in config.properties.format &&
                            config.properties.format.ebookValue
                              ? config.properties.format.ebookValue
                              : t.ebook}
                          </span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3 h-3 text-slate-500" />
                          <span>
                            {typeof config?.properties?.format === 'object' &&
                            'paperValue' in config.properties.format &&
                            config.properties.format.paperValue
                              ? config.properties.format.paperValue
                              : t.paperBook}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                  {selectedBook.isbn && (
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {t.isbn}:{' '}
                      </span>
                      <span>{selectedBook.isbn}</span>
                      <button
                        type="button"
                        onClick={() => copyIsbn(selectedBook.isbn)}
                        className="p-0.5 hover:text-indigo-600 text-slate-400 cursor-pointer"
                        title="Copy ISBN"
                      >
                        {copiedIsbn ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Book Description */}
            {selectedBook.description && (
              <div className="mb-4">
                <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.description}
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-36 overflow-y-auto pr-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {selectedBook.description}
                </p>
              </div>
            )}

            {/* Template Selection */}
            <div className="mb-4 p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <label
                htmlFor="template-select-modal"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"
              >
                <span>{t.templateLabel}</span>
              </label>
              <select
                id="template-select-modal"
                value={
                  selectedTemplate.type === 'template_id'
                    ? selectedTemplate.template_id
                    : selectedTemplate.type
                }
                onChange={e => {
                  const val = e.target.value
                  if (val === 'none') {
                    setSelectedTemplate({ type: 'none' })
                  } else if (val === 'default') {
                    setSelectedTemplate({ type: 'default' })
                  } else {
                    setSelectedTemplate({
                      type: 'template_id',
                      template_id: val
                    })
                  }
                }}
                className="w-full h-8 px-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="none">{t.templateNone}</option>
                <option value="default">{t.templateDefault}</option>
              </select>
            </div>

            {/* Duplicate Check Notification */}
            {selectedBook.isbn && (
              <div className="mb-4">
                {isCheckingDuplicate ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>{t.checkingDuplicate}</span>
                  </div>
                ) : duplicateStatus?.exists ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        {t.alreadyInLibrary}:{' '}
                        <strong>
                          {duplicateStatus.pageTitle || selectedBook.title}
                        </strong>
                      </span>
                    </div>
                    {duplicateStatus.pageUrl && (
                      <a
                        href={duplicateStatus.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-2"
                      >
                        {t.viewInNotion} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>{t.notInLibrary}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {saveError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs">
                {saveError}
              </div>
            )}

            {/* Save Success Message */}
            {saveSuccessUrl && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">{t.saveSuccess}</span>
                </div>
                <a
                  href={saveSuccessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t.viewInNotion} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBook(null)}
                disabled={isSaving}
              >
                {t.closeButton}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveToNotion}
                disabled={isSaving}
                className={
                  duplicateStatus?.exists
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : ''
                }
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    {t.savingToNotion}
                  </>
                ) : duplicateStatus?.exists ? (
                  t.addDuplicateAnyway
                ) : (
                  t.addToNotion
                )}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
