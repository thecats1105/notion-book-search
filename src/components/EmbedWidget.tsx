import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Moon,
  Search,
  Sun,
  X
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { decodeConfig } from '@/lib/config-codec'
import type { BookItem } from '@/types/book'
import type { AppConfig, ThemePreference } from '@/types/config'
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
  const [theme, setTheme] = React.useState<ThemePreference>('auto')
  const [isDarkMode, setIsDarkMode] = React.useState(false)

  const [query, setQuery] = React.useState('')
  const [activeTab, setActiveTab] = React.useState<'all' | 'kakao' | 'google'>(
    'all'
  )
  const [isLoading, setIsLoading] = React.useState(false)
  const [books, setBooks] = React.useState<BookItem[]>([])
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [hasSearched, setHasSearched] = React.useState(false)

  // Selected book for modal
  const [selectedBook, setSelectedBook] = React.useState<BookItem | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = React.useState(false)
  const [duplicateStatus, setDuplicateStatus] =
    React.useState<NotionCheckResult | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveSuccessUrl, setSaveSuccessUrl] = React.useState<string | null>(
    null
  )
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [copiedIsbn, setCopiedIsbn] = React.useState(false)

  // Load config from URL hash if not provided via props
  React.useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig)
      if (initialConfig.theme) setTheme(initialConfig.theme)
      if (initialConfig.defaultSource) setActiveTab(initialConfig.defaultSource)
      return
    }

    if (typeof window !== 'undefined') {
      const parsed = decodeConfig(window.location.hash)
      if (parsed) {
        setConfig(parsed)
        if (parsed.theme) setTheme(parsed.theme)
        if (parsed.defaultSource) setActiveTab(parsed.defaultSource)
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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setIsLoading(true)
    setErrorMessage(null)
    setHasSearched(true)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          source: activeTab,
          kakaoApiKey: config?.kakaoApiKey,
          googleApiKey: config?.googleApiKey
        })
      })

      const data = await res.json()
      if (!res.ok && (!data.items || data.items.length === 0)) {
        setErrorMessage(data.error || 'Failed to search books')
        setBooks([])
      } else {
        setBooks(data.items || [])
        if (data.items?.length === 0 && data.error) {
          setErrorMessage(data.error)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(`Search error: ${msg}`)
      setBooks([])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle book selection & duplicate check
  const handleOpenBook = async (book: BookItem) => {
    setSelectedBook(book)
    setDuplicateStatus(null)
    setSaveSuccessUrl(null)
    setSaveError(null)
    setCopiedIsbn(false)

    if (!config?.properties?.isbn || !book.isbn) {
      return
    }

    setIsCheckingDuplicate(true)
    try {
      const res = await fetch('/api/notion/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionToken: config.notionApiKey,
          dataSourceId: config.notionDataSourceId || config.notionDatabaseId,
          isbnProperty: config.properties.isbn,
          isbn: book.isbn
        })
      })
      const data = (await res.json()) as NotionCheckResult
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

    try {
      const res = await fetch('/api/notion/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionToken: config.notionApiKey,
          dataSourceId: config.notionDataSourceId || config.notionDatabaseId,
          propertyMapping: config.properties,
          book: selectedBook
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSaveSuccessUrl(data.pageUrl || '')
        // Refresh duplicate status to mark as existing
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
        <h2 className="text-lg font-bold">No Notion Configuration Detected</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Please open the URL Generator to configure your Notion database and
          API keys.
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            if (typeof window !== 'undefined') window.location.href = '/'
          }}
        >
          Open URL Generator
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
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight hidden sm:inline">
                Notion Book Search
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
                All
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
                Kakao
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
                Google
              </button>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle dark/light theme"
              className="text-slate-600 dark:text-slate-400"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
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
                placeholder="Search by title, author, or ISBN..."
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
                'Search'
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

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Searching books across providers...</p>
          </div>
        )}

        {/* Initial Empty State */}
        {!isLoading && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Search for your next book
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Type a book title, author, or ISBN above to add it to your Notion
              library
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
              No books found
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Try searching with another keyword or ISBN
            </p>
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
                        No Cover
                      </span>
                    </div>
                  )}

                  {/* Provider Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant={book.source === 'kakao' ? 'kakao' : 'google'}
                      className="text-[10px] px-1.5 py-0.2"
                    >
                      {book.source === 'kakao' ? 'Kakao' : 'Google'}
                    </Badge>
                  </div>
                </div>

                {/* Book Details */}
                <div className="p-2.5 flex flex-col flex-1 w-full">
                  <h4 className="text-xs font-semibold leading-tight line-clamp-2 text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {book.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                    {book.authors.join(', ') || 'Unknown author'}
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
                <div className="flex items-center gap-1.5 mb-1.5">
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
                  {selectedBook.url && (
                    <a
                      href={selectedBook.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-indigo-600 inline-flex items-center gap-0.5 ml-auto"
                    >
                      Store Link <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <DialogTitle className="text-base sm:text-lg">
                  {selectedBook.title}
                </DialogTitle>

                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                  {selectedBook.authors.join(', ') || 'Author unknown'}
                </p>

                <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Publisher:{' '}
                    </span>
                    {selectedBook.publisher || 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Date:{' '}
                    </span>
                    {selectedBook.publishedDate || 'N/A'}
                  </div>
                  {selectedBook.isbn && (
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        ISBN:{' '}
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
                  Description
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-36 overflow-y-auto pr-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {selectedBook.description}
                </p>
              </div>
            )}

            {/* Duplicate Check Notification */}
            {selectedBook.isbn && (
              <div className="mb-4">
                {isCheckingDuplicate ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>
                      Checking if already registered in your Notion library...
                    </span>
                  </div>
                ) : duplicateStatus?.exists ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        Already in your library:{' '}
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
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>Not in your library yet</span>
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
                  <span className="font-medium">
                    Successfully added to your Notion library!
                  </span>
                </div>
                <a
                  href={saveSuccessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View in Notion <ExternalLink className="w-3 h-3" />
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
                Close
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
                    Saving...
                  </>
                ) : duplicateStatus?.exists ? (
                  'Add Again (Duplicate)'
                ) : (
                  'Add to Notion'
                )}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
