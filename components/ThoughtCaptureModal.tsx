'use client'

import { useState, useEffect, useRef } from 'react'
import { useUrlMetadata } from '@/hooks/useUrlMetadata'
import { useUrlDetection } from '@/hooks/useUrlDetection'
import { useFeedValidation } from '@/hooks/useFeedValidation'

interface ThoughtCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  articleId?: string
  articleTitle?: string
}

// Common category suggestions
const SUGGESTED_CATEGORIES = [
  'App Ideas',
  'Video Insights',
  'Research',
  'Random',
  'Article Ideas'
]

export default function ThoughtCaptureModal({
  isOpen,
  onClose,
  articleId,
  articleTitle
}: ThoughtCaptureModalProps) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Feed addition state
  const [addingFeed, setAddingFeed] = useState<string | null>(null) // Track which feed URL is being added
  const [feedError, setFeedError] = useState<string | null>(null)

  // Progressive disclosure: Category-specific fields
  const [isAdditionalFieldsExpanded, setIsAdditionalFieldsExpanded] = useState(false)

  // Video Insights fields
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTimestamp, setVideoTimestamp] = useState('')
  const [videoCreator, setVideoCreator] = useState('')
  const [keyQuote, setKeyQuote] = useState('')

  // Article Ideas, Research, App Ideas fields
  const [articleUrl, setArticleUrl] = useState('')
  const [researchUrl, setResearchUrl] = useState('')
  const [appUrl, setAppUrl] = useState('')

  // Universal Article URL (works for all categories)
  const [universalUrl, setUniversalUrl] = useState('')
  const [isUniversalUrlExpanded, setIsUniversalUrlExpanded] = useState(false)

  // Manual Feed Subscription (direct feed URL input)
  const [manualFeedUrl, setManualFeedUrl] = useState('')
  const [isManualFeedExpanded, setIsManualFeedExpanded] = useState(false)

  // URL metadata extraction hooks
  const articleMetadata = useUrlMetadata()
  const researchMetadata = useUrlMetadata()
  const appMetadata = useUrlMetadata()
  const universalMetadata = useUrlMetadata()

  // Feed validation hook
  const feedValidation = useFeedValidation()

  // URL detection in thought text
  const { detectedUrl, hasUrl, clearDetectedUrl } = useUrlDetection(text, 500)
  const [urlBannerDismissed, setUrlBannerDismissed] = useState(false)

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  // Reset URL banner dismissed state when detected URL changes
  useEffect(() => {
    if (detectedUrl) {
      setUrlBannerDismissed(false)
    }
  }, [detectedUrl])

  // Validate manual feed URL when it changes
  useEffect(() => {
    if (manualFeedUrl.trim()) {
      feedValidation.validateFeedUrl(manualFeedUrl.trim())
    } else {
      feedValidation.reset()
    }
  }, [manualFeedUrl])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc to close
      if (e.key === 'Escape') {
        onClose()
      }
      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, text, category, customCategory, isCustomCategory])

  const handleSubmit = async () => {
    if (!text.trim()) return

    setSubmitting(true)
    try {
      const finalCategory = isCustomCategory ? customCategory.trim() : category

      // Build category-specific fields object
      let categoryFields = null
      if (finalCategory === 'Video Insights') {
        categoryFields = {
          url: videoUrl.trim() || null,
          timestamp: videoTimestamp.trim() || null,
          creator: videoCreator.trim() || null,
          keyQuote: keyQuote.trim() || null
        }
      } else if (finalCategory === 'Article Ideas') {
        categoryFields = {
          url: articleUrl.trim() || null,
          metadata: articleMetadata.metadata || null
        }
      } else if (finalCategory === 'Research') {
        categoryFields = {
          url: researchUrl.trim() || null,
          metadata: researchMetadata.metadata || null
        }
      } else if (finalCategory === 'App Ideas') {
        categoryFields = {
          url: appUrl.trim() || null,
          metadata: appMetadata.metadata || null
        }
      }

      // Include universal URL if provided
      const universalUrlData = universalUrl.trim() ? {
        url: universalUrl.trim(),
        metadata: universalMetadata.metadata || null
      } : null

      const res = await fetch('/api/thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          category: finalCategory || null,
          categoryFields,
          universalUrl: universalUrlData,
          articleId: articleId || null
        })
      })

      if (!res.ok) throw new Error('Failed to save thought')

      // Reset form
      setText('')
      setCategory('')
      setCustomCategory('')
      setIsCustomCategory(false)
      setVideoUrl('')
      setVideoTimestamp('')
      setVideoCreator('')
      setKeyQuote('')
      setArticleUrl('')
      setResearchUrl('')
      setAppUrl('')
      setUniversalUrl('')
      setIsUniversalUrlExpanded(false)
      setManualFeedUrl('')
      setIsManualFeedExpanded(false)
      setUrlBannerDismissed(false)
      articleMetadata.reset()
      researchMetadata.reset()
      appMetadata.reset()
      universalMetadata.reset()
      feedValidation.reset()
      clearDetectedUrl()
      setIsAdditionalFieldsExpanded(false)
      onClose()
    } catch (error) {
      console.error('Error saving thought:', error)
      alert('Failed to save thought. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCategoryChange = (value: string) => {
    if (value === '__custom__') {
      setIsCustomCategory(true)
      setCategory('')
    } else {
      setIsCustomCategory(false)
      setCategory(value)
      setCustomCategory('')
    }
  }

  const handleAddFeed = async (feedUrl: string, feedTitle: string) => {
    setAddingFeed(feedUrl)
    setFeedError(null)

    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: feedTitle || feedUrl,
          url: feedUrl,
          priority: 50
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Combine error message with details if available
        const errorMessage = data.details
          ? `${data.error}: ${data.details}`
          : data.error || 'Failed to add feed'

        // Add suggestion if provided
        const fullMessage = data.suggestion
          ? `${errorMessage}\n\n${data.suggestion}`
          : errorMessage

        throw new Error(fullMessage)
      }

      // Re-check subscription status for all metadata hooks
      if (universalUrl) await universalMetadata.extractMetadata(universalUrl)
      if (articleUrl) await articleMetadata.extractMetadata(articleUrl)
      if (researchUrl) await researchMetadata.extractMetadata(researchUrl)
      if (appUrl) await appMetadata.extractMetadata(appUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add feed'
      setFeedError(message)
      console.error('Error adding feed:', error)
    } finally {
      setAddingFeed(null)
    }
  }

  const handleAddManualFeed = async () => {
    if (!feedValidation.isValid || !manualFeedUrl.trim()) return

    const feedName = feedValidation.feedName || manualFeedUrl
    await handleAddFeed(manualFeedUrl, feedName)

    // On success, reset the manual feed form
    if (!feedError) {
      setManualFeedUrl('')
      feedValidation.reset()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-700 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-neutral-50">Capture Thought</h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {articleTitle && (
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <span>Related to:</span>
              <span className="text-ember-400 font-medium">{articleTitle}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Thought Text */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Your Thought
            </label>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full h-40 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Smart URL Detection Banner */}
          {hasUrl && detectedUrl && !urlBannerDismissed && (
            <div className="bg-ember-500/10 border border-ember-500/30 rounded-lg p-3">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-ember-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-200 mb-1">
                    URL detected in your thought
                  </div>
                  <div className="text-xs text-neutral-400 truncate mb-2">
                    {detectedUrl}
                  </div>
                  <div className="text-xs text-neutral-300">
                    Would you like to extract article metadata and discover RSS feeds?
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUrlBannerDismissed(true)
                    clearDetectedUrl()
                  }}
                  className="flex-shrink-0 text-neutral-400 hover:text-neutral-200 transition-colors"
                  title="Dismiss"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUniversalUrl(detectedUrl)
                    setIsUniversalUrlExpanded(true)
                    universalMetadata.extractMetadata(detectedUrl)
                    setUrlBannerDismissed(true)
                  }}
                  className="px-3 py-1.5 text-xs rounded-md bg-ember-500 hover:bg-ember-400 text-neutral-50 transition-colors font-medium"
                >
                  Extract Metadata
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUrlBannerDismissed(true)
                  }}
                  className="px-3 py-1.5 text-xs rounded-md bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Category <span className="text-neutral-500">(optional)</span>
            </label>

            {!isCustomCategory ? (
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent"
              >
                <option value="">None</option>
                {SUGGESTED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom__">+ Create New Category</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category"
                  className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    setIsCustomCategory(false)
                    setCustomCategory('')
                  }}
                  className="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Universal Article URL Section (works for all categories) */}
          <div className="border border-neutral-700/50 rounded-lg overflow-hidden">
            {/* Collapsible Header */}
            <button
              type="button"
              onClick={() => setIsUniversalUrlExpanded(!isUniversalUrlExpanded)}
              className="w-full px-4 py-3 bg-neutral-800/50 flex items-center justify-between hover:bg-neutral-800 transition-colors"
            >
              <span className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-ember-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Article URL <span className="text-neutral-500">(optional)</span>
              </span>
              <svg
                className={`w-5 h-5 text-neutral-500 transition-transform ${
                  isUniversalUrlExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable Fields */}
            {isUniversalUrlExpanded && (
              <div className="p-4 space-y-3 bg-neutral-800/30">
                {/* Universal URL Input */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Article or Resource URL
                  </label>
                  <input
                    type="text"
                    value={universalUrl}
                    onChange={(e) => setUniversalUrl(e.target.value)}
                    onBlur={() => universalMetadata.extractMetadata(universalUrl)}
                    onPaste={() => setTimeout(() => universalMetadata.extractMetadata(universalUrl), 100)}
                    placeholder="https://example.com/article"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent"
                  />
                  <div className="mt-1.5 text-xs text-neutral-500">
                    Add a URL to extract article metadata and discover RSS feeds
                  </div>
                </div>

                {/* Loading State */}
                {universalMetadata.loading && (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Extracting metadata...
                  </div>
                )}

                {/* Error State */}
                {universalMetadata.error && (
                  <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-2">
                    {universalMetadata.error}
                  </div>
                )}

                {/* Metadata Preview */}
                {universalMetadata.metadata && (
                  <div className="bg-neutral-900/50 rounded-lg border border-neutral-700/30 p-3 space-y-2">
                    <div className="text-xs font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Metadata Extracted
                    </div>

                    <div>
                      <span className="text-xs text-neutral-500">Title: </span>
                      <span className="text-xs text-neutral-300">{universalMetadata.metadata.title}</span>
                    </div>

                    {universalMetadata.metadata.author && (
                      <div>
                        <span className="text-xs text-neutral-500">Author: </span>
                        <span className="text-xs text-neutral-300">{universalMetadata.metadata.author}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-xs text-neutral-500">Source: </span>
                      <span className="text-xs text-neutral-300">{universalMetadata.metadata.siteName}</span>
                    </div>

                    {/* RSS Feed Discovery Banner */}
                    {universalMetadata.metadata.feeds.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-700/30">
                        <div className="text-xs text-neutral-400 mb-2">
                          {universalMetadata.metadata.feeds.length === 1 ? 'RSS feed found' : `${universalMetadata.metadata.feeds.length} RSS feeds found`}
                        </div>
                        {universalMetadata.metadata.feeds.map((feed, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-neutral-800/50 rounded-lg p-2 mb-2 last:mb-0">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-neutral-300 truncate">
                                {feed.title || feed.url}
                              </div>
                            </div>
                            {feed.isSubscribed ? (
                              <div className="flex items-center gap-1 text-xs text-green-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Subscribed
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddFeed(feed.url, feed.title)}
                                disabled={addingFeed === feed.url}
                                className="px-3 py-1 text-xs rounded-md bg-ember-500 hover:bg-ember-400 text-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                              >
                                {addingFeed === feed.url ? (
                                  <>
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Adding...
                                  </>
                                ) : (
                                  '+ Add Feed'
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Feed Error Display */}
                {feedError && (
                  <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <div className="font-medium">Failed to add feed</div>
                      <div className="mt-1 text-red-300 whitespace-pre-line">{feedError}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedError(null)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Dismiss error"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Feed Subscription Section */}
          <div className="border border-neutral-700/50 rounded-lg overflow-hidden">
            {/* Collapsible Header */}
            <button
              type="button"
              onClick={() => setIsManualFeedExpanded(!isManualFeedExpanded)}
              className="w-full px-4 py-3 bg-neutral-800/50 flex items-center justify-between hover:bg-neutral-800 transition-colors"
            >
              <span className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-ember-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                Subscribe to Feed <span className="text-neutral-500">(optional)</span>
              </span>
              <svg
                className={`w-5 h-5 text-neutral-500 transition-transform ${
                  isManualFeedExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable Fields */}
            {isManualFeedExpanded && (
              <div className="p-4 space-y-3 bg-neutral-800/30">
                {/* Manual Feed URL Input */}
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    RSS Feed URL
                  </label>
                  <input
                    type="text"
                    value={manualFeedUrl}
                    onChange={(e) => setManualFeedUrl(e.target.value)}
                    placeholder="https://example.com/feed.xml"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent"
                  />
                  <div className="mt-1.5 text-xs text-neutral-500">
                    Enter a direct RSS/Atom feed URL to subscribe
                  </div>
                </div>

                {/* Validation Loading State */}
                {feedValidation.validating && (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating feed...
                  </div>
                )}

                {/* Validation Error State */}
                {feedValidation.error && (
                  <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <div className="font-medium">{feedValidation.error}</div>
                      {feedValidation.suggestion && (
                        <div className="mt-1 text-red-300">{feedValidation.suggestion}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Validation Success State */}
                {feedValidation.isValid && (
                  <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-medium text-green-400 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Valid RSS Feed
                    </div>

                    {feedValidation.feedName && (
                      <div>
                        <span className="text-xs text-neutral-500">Feed Name: </span>
                        <span className="text-xs text-neutral-300">{feedValidation.feedName}</span>
                      </div>
                    )}

                    {feedValidation.articlesCount !== null && (
                      <div>
                        <span className="text-xs text-neutral-500">Articles Found: </span>
                        <span className="text-xs text-neutral-300">{feedValidation.articlesCount}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddManualFeed}
                      disabled={addingFeed === manualFeedUrl}
                      className="w-full mt-2 px-4 py-2 text-sm rounded-md bg-ember-500 hover:bg-ember-400 text-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {addingFeed === manualFeedUrl ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding Feed...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Feed to Subscriptions
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Feed Error Display */}
                {feedError && (
                  <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <div className="font-medium">Failed to add feed</div>
                      <div className="mt-1 text-red-300 whitespace-pre-line">{feedError}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedError(null)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Dismiss error"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progressive Disclosure: Article Ideas Additional Fields */}
          {!isCustomCategory && category === 'Article Ideas' && (
            <div className="border border-neutral-700/50 rounded-lg overflow-hidden">
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => setIsAdditionalFieldsExpanded(!isAdditionalFieldsExpanded)}
                className="w-full px-4 py-3 bg-neutral-800/50 flex items-center justify-between hover:bg-neutral-800 transition-colors"
              >
                <span className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-ember-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Article Details <span className="text-neutral-500">(optional)</span>
                </span>
                <svg
                  className={`w-5 h-5 text-neutral-500 transition-transform ${
                    isAdditionalFieldsExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expandable Fields */}
              {isAdditionalFieldsExpanded && (
                <div className="p-4 space-y-3 bg-neutral-800/30">
                  {/* Article URL */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Article URL
                    </label>
                    <input
                      type="text"
                      value={articleUrl}
                      onChange={(e) => setArticleUrl(e.target.value)}
                      onBlur={() => articleMetadata.extractMetadata(articleUrl)}
                      onPaste={() => setTimeout(() => articleMetadata.extractMetadata(articleUrl), 100)}
                      placeholder="https://example.com/article"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent"
                    />
                  </div>

                  {/* Loading State */}
                  {articleMetadata.loading && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Extracting metadata...
                    </div>
                  )}

                  {/* Error State */}
                  {articleMetadata.error && (
                    <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-2">
                      {articleMetadata.error}
                    </div>
                  )}

                  {/* Metadata Preview */}
                  {articleMetadata.metadata && (
                    <div className="bg-neutral-900/50 rounded-lg border border-neutral-700/30 p-3 space-y-2">
                      <div className="text-xs font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Metadata Extracted
                      </div>

                      <div>
                        <span className="text-xs text-neutral-500">Title: </span>
                        <span className="text-xs text-neutral-300">{articleMetadata.metadata.title}</span>
                      </div>

                      {articleMetadata.metadata.author && (
                        <div>
                          <span className="text-xs text-neutral-500">Author: </span>
                          <span className="text-xs text-neutral-300">{articleMetadata.metadata.author}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-xs text-neutral-500">Source: </span>
                        <span className="text-xs text-neutral-300">{articleMetadata.metadata.siteName}</span>
                      </div>

                      {/* RSS Feed Discovery Banner */}
                      {articleMetadata.metadata.feeds.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-700/30">
                          <div className="text-xs text-neutral-400 mb-2">
                            {articleMetadata.metadata.feeds.length === 1 ? 'RSS feed found' : `${articleMetadata.metadata.feeds.length} RSS feeds found`}
                          </div>
                          {articleMetadata.metadata.feeds.map((feed, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-neutral-800/50 rounded-lg p-2 mb-2 last:mb-0">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-neutral-300 truncate">
                                  {feed.title || feed.url}
                                </div>
                              </div>
                              {feed.isSubscribed ? (
                                <div className="flex items-center gap-1 text-xs text-green-400">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Subscribed
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddFeed(feed.url, feed.title)}
                                  disabled={addingFeed === feed.url}
                                  className="px-3 py-1 text-xs rounded-md bg-ember-500 hover:bg-ember-400 text-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                  {addingFeed === feed.url ? (
                                    <>
                                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Adding...
                                    </>
                                  ) : (
                                    '+ Add Feed'
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feed Error Display - Outside metadata section */}
                  {feedError && (
                    <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3 flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <div className="font-medium">Failed to add feed</div>
                        <div className="mt-1 text-red-300 whitespace-pre-line">{feedError}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFeedError(null)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Dismiss error"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progressive Disclosure: Research Additional Fields */}
          {!isCustomCategory && category === 'Research' && (
            <div className="border border-neutral-700/50 rounded-lg overflow-hidden">
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => setIsAdditionalFieldsExpanded(!isAdditionalFieldsExpanded)}
                className="w-full px-4 py-3 bg-neutral-800/50 flex items-center justify-between hover:bg-neutral-800 transition-colors"
              >
                <span className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-ember-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Research Details <span className="text-neutral-500">(optional)</span>
                </span>
                <svg
                  className={`w-5 h-5 text-neutral-500 transition-transform ${
                    isAdditionalFieldsExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expandable Fields */}
              {isAdditionalFieldsExpanded && (
                <div className="p-4 space-y-3 bg-neutral-800/30">
                  {/* Research URL */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Research URL
                    </label>
                    <input
                      type="text"
                      value={researchUrl}
                      onChange={(e) => setResearchUrl(e.target.value)}
                      onBlur={() => researchMetadata.extractMetadata(researchUrl)}
                      onPaste={() => setTimeout(() => researchMetadata.extractMetadata(researchUrl), 100)}
                      placeholder="https://example.com/paper"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent"
                    />
                  </div>

                  {/* Loading State */}
                  {researchMetadata.loading && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Extracting metadata...
                    </div>
                  )}

                  {/* Error State */}
                  {researchMetadata.error && (
                    <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-2">
                      {researchMetadata.error}
                    </div>
                  )}

                  {/* Metadata Preview */}
                  {researchMetadata.metadata && (
                    <div className="bg-neutral-900/50 rounded-lg border border-neutral-700/30 p-3 space-y-2">
                      <div className="text-xs font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Metadata Extracted
                      </div>

                      <div>
                        <span className="text-xs text-neutral-500">Title: </span>
                        <span className="text-xs text-neutral-300">{researchMetadata.metadata.title}</span>
                      </div>

                      {researchMetadata.metadata.author && (
                        <div>
                          <span className="text-xs text-neutral-500">Author: </span>
                          <span className="text-xs text-neutral-300">{researchMetadata.metadata.author}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-xs text-neutral-500">Source: </span>
                        <span className="text-xs text-neutral-300">{researchMetadata.metadata.siteName}</span>
                      </div>

                      {/* RSS Feed Discovery Banner */}
                      {researchMetadata.metadata.feeds.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-700/30">
                          <div className="text-xs text-neutral-400 mb-2">
                            {researchMetadata.metadata.feeds.length === 1 ? 'RSS feed found' : `${researchMetadata.metadata.feeds.length} RSS feeds found`}
                          </div>
                          {researchMetadata.metadata.feeds.map((feed, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-neutral-800/50 rounded-lg p-2 mb-2 last:mb-0">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-neutral-300 truncate">
                                  {feed.title || feed.url}
                                </div>
                              </div>
                              {feed.isSubscribed ? (
                                <div className="flex items-center gap-1 text-xs text-green-400">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Subscribed
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddFeed(feed.url, feed.title)}
                                  disabled={addingFeed === feed.url}
                                  className="px-3 py-1 text-xs rounded-md bg-ember-500 hover:bg-ember-400 text-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                  {addingFeed === feed.url ? (
                                    <>
                                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Adding...
                                    </>
                                  ) : (
                                    '+ Add Feed'
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feed Error Display - Outside metadata section */}
                  {feedError && (
                    <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3 flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <div className="font-medium">Failed to add feed</div>
                        <div className="mt-1 text-red-300 whitespace-pre-line">{feedError}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFeedError(null)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Dismiss error"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progressive Disclosure: App Ideas Additional Fields */}
          {!isCustomCategory && category === 'App Ideas' && (
            <div className="border border-neutral-700/50 rounded-lg overflow-hidden">
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => setIsAdditionalFieldsExpanded(!isAdditionalFieldsExpanded)}
                className="w-full px-4 py-3 bg-neutral-800/50 flex items-center justify-between hover:bg-neutral-800 transition-colors"
              >
                <span className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-ember-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  App Details <span className="text-neutral-500">(optional)</span>
                </span>
                <svg
                  className={`w-5 h-5 text-neutral-500 transition-transform ${
                    isAdditionalFieldsExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expandable Fields */}
              {isAdditionalFieldsExpanded && (
                <div className="p-4 space-y-3 bg-neutral-800/30">
                  {/* App URL */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Inspiration URL
                    </label>
                    <input
                      type="text"
                      value={appUrl}
                      onChange={(e) => setAppUrl(e.target.value)}
                      onBlur={() => appMetadata.extractMetadata(appUrl)}
                      onPaste={() => setTimeout(() => appMetadata.extractMetadata(appUrl), 100)}
                      placeholder="https://example.com/app"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent"
                    />
                  </div>

                  {/* Loading State */}
                  {appMetadata.loading && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Extracting metadata...
                    </div>
                  )}

                  {/* Error State */}
                  {appMetadata.error && (
                    <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-2">
                      {appMetadata.error}
                    </div>
                  )}

                  {/* Metadata Preview */}
                  {appMetadata.metadata && (
                    <div className="bg-neutral-900/50 rounded-lg border border-neutral-700/30 p-3 space-y-2">
                      <div className="text-xs font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Metadata Extracted
                      </div>

                      <div>
                        <span className="text-xs text-neutral-500">Title: </span>
                        <span className="text-xs text-neutral-300">{appMetadata.metadata.title}</span>
                      </div>

                      {appMetadata.metadata.author && (
                        <div>
                          <span className="text-xs text-neutral-500">Author: </span>
                          <span className="text-xs text-neutral-300">{appMetadata.metadata.author}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-xs text-neutral-500">Source: </span>
                        <span className="text-xs text-neutral-300">{appMetadata.metadata.siteName}</span>
                      </div>

                      {/* RSS Feed Discovery Banner */}
                      {appMetadata.metadata.feeds.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-700/30">
                          <div className="text-xs text-neutral-400 mb-2">
                            {appMetadata.metadata.feeds.length === 1 ? 'RSS feed found' : `${appMetadata.metadata.feeds.length} RSS feeds found`}
                          </div>
                          {appMetadata.metadata.feeds.map((feed, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-neutral-800/50 rounded-lg p-2 mb-2 last:mb-0">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-neutral-300 truncate">
                                  {feed.title || feed.url}
                                </div>
                              </div>
                              {feed.isSubscribed ? (
                                <div className="flex items-center gap-1 text-xs text-green-400">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Subscribed
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddFeed(feed.url, feed.title)}
                                  disabled={addingFeed === feed.url}
                                  className="px-3 py-1 text-xs rounded-md bg-ember-500 hover:bg-ember-400 text-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                  {addingFeed === feed.url ? (
                                    <>
                                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Adding...
                                    </>
                                  ) : (
                                    '+ Add Feed'
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feed Error Display - Outside metadata section */}
                  {feedError && (
                    <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3 flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <div className="font-medium">Failed to add feed</div>
                        <div className="mt-1 text-red-300 whitespace-pre-line">{feedError}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFeedError(null)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Dismiss error"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progressive Disclosure: Video Insights Additional Fields */}
          {!isCustomCategory && category === 'Video Insights' && (
            <div className="border border-neutral-700/50 rounded-lg overflow-hidden">
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => setIsAdditionalFieldsExpanded(!isAdditionalFieldsExpanded)}
                className="w-full px-4 py-3 bg-neutral-800/50 flex items-center justify-between hover:bg-neutral-800 transition-colors"
              >
                <span className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-ember-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Additional Details <span className="text-neutral-500">(optional)</span>
                </span>
                <svg
                  className={`w-5 h-5 text-neutral-500 transition-transform ${
                    isAdditionalFieldsExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expandable Fields */}
              {isAdditionalFieldsExpanded && (
                <div className="p-4 space-y-3 bg-neutral-800/30">
                  {/* Video URL */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Video URL
                    </label>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent"
                    />
                  </div>

                  {/* Timestamp */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Timestamp
                    </label>
                    <input
                      type="text"
                      value={videoTimestamp}
                      onChange={(e) => setVideoTimestamp(e.target.value)}
                      placeholder="HH:MM:SS or MM:SS"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent"
                    />
                  </div>

                  {/* Creator/Channel */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Creator/Channel
                    </label>
                    <input
                      type="text"
                      value={videoCreator}
                      onChange={(e) => setVideoCreator(e.target.value)}
                      placeholder="Channel name or creator"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent"
                    />
                  </div>

                  {/* Key Quote */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Key Quote
                    </label>
                    <textarea
                      value={keyQuote}
                      onChange={(e) => setKeyQuote(e.target.value)}
                      placeholder="Notable quote from the video..."
                      rows={3}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-ember-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keyboard Shortcuts Hint */}
          <div className="text-xs text-neutral-500">
            <kbd className="px-2 py-1 bg-neutral-800 rounded border border-neutral-700">Esc</kbd> to close •{' '}
            <kbd className="px-2 py-1 bg-neutral-800 rounded border border-neutral-700">⌘</kbd> +{' '}
            <kbd className="px-2 py-1 bg-neutral-800 rounded border border-neutral-700">Enter</kbd> to save
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="px-6 py-3 rounded-lg bg-ember-500 hover:bg-ember-400 text-neutral-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save Thought'}
          </button>
        </div>
      </div>
    </div>
  )
}
