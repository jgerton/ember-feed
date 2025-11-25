'use client'

import { useState, useEffect } from 'react'

interface UserSettings {
  id: string
  diversityLevel: string
  newsApiEnabled: boolean
  newsApiCategories: string
  newsApiLanguage: string
  newsApiCountry: string
  createdAt: string
  updatedAt: string
}

const DIVERSITY_LEVELS = ['low', 'medium', 'high'] as const
const NEWSAPI_CATEGORIES = [
  'business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'
] as const
const NEWSAPI_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'nl', name: 'Dutch' },
  { code: 'no', name: 'Norwegian' },
  { code: 'sv', name: 'Swedish' },
] as const
const NEWSAPI_COUNTRIES = [
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'ca', name: 'Canada' },
  { code: 'au', name: 'Australia' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'it', name: 'Italy' },
  { code: 'es', name: 'Spain' },
  { code: 'nl', name: 'Netherlands' },
  { code: 'br', name: 'Brazil' },
  { code: 'in', name: 'India' },
  { code: 'jp', name: 'Japan' },
  { code: 'cn', name: 'China' },
  { code: 'mx', name: 'Mexico' },
] as const

export default function SettingsPanel() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [diversityLevel, setDiversityLevel] = useState('medium')
  const [newsApiEnabled, setNewsApiEnabled] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['technology', 'science', 'business'])
  const [newsApiLanguage, setNewsApiLanguage] = useState('en')
  const [newsApiCountry, setNewsApiCountry] = useState('us')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      setSettings(data)
      setDiversityLevel(data.diversityLevel || 'medium')
      setNewsApiEnabled(data.newsApiEnabled ?? true)
      setSelectedCategories(data.newsApiCategories?.split(',') || ['technology', 'science', 'business'])
      setNewsApiLanguage(data.newsApiLanguage || 'en')
      setNewsApiCountry(data.newsApiCountry || 'us')
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diversityLevel,
          newsApiEnabled,
          newsApiCategories: selectedCategories.join(','),
          newsApiLanguage,
          newsApiCountry,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      const data = await response.json()
      setSettings(data)
      setMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-neutral-700 rounded w-1/4"></div>
          <div className="h-10 bg-neutral-700 rounded"></div>
          <div className="h-4 bg-neutral-700 rounded w-1/3"></div>
          <div className="h-10 bg-neutral-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Feed Personalization Section */}
      <div className="glass-card p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-neutral-100 mb-4">Feed Personalization</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Diversity Level
            </label>
            <p className="text-xs text-neutral-500 mb-2">
              Controls how diverse your feed sources are. Higher = more variety from different sources.
            </p>
            <div className="flex gap-2">
              {DIVERSITY_LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setDiversityLevel(level)}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                    diversityLevel === level
                      ? 'bg-ember-500 text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* NewsAPI Configuration Section */}
      <div className="glass-card p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-100">NewsAPI Configuration</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-neutral-400">
              {newsApiEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <div
              onClick={() => setNewsApiEnabled(!newsApiEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                newsApiEnabled ? 'bg-ember-500' : 'bg-neutral-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  newsApiEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </div>
          </label>
        </div>

        <div className={`space-y-4 ${!newsApiEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              News Categories
            </label>
            <p className="text-xs text-neutral-500 mb-2">
              Select which news categories to include in your feed.
            </p>
            <div className="flex flex-wrap gap-2">
              {NEWSAPI_CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                    selectedCategories.includes(category)
                      ? 'bg-ember-500 text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            {selectedCategories.length === 0 && (
              <p className="text-xs text-amber-400 mt-2">
                Select at least one category
              </p>
            )}
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Language
            </label>
            <select
              value={newsApiLanguage}
              onChange={(e) => setNewsApiLanguage(e.target.value)}
              className="w-full bg-neutral-700 text-neutral-100 rounded-lg px-4 py-2 border border-neutral-600 focus:border-ember-500 focus:outline-none"
            >
              {NEWSAPI_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Country
            </label>
            <p className="text-xs text-neutral-500 mb-2">
              Get top headlines from this country.
            </p>
            <select
              value={newsApiCountry}
              onChange={(e) => setNewsApiCountry(e.target.value)}
              className="w-full bg-neutral-700 text-neutral-100 rounded-lg px-4 py-2 border border-neutral-600 focus:border-ember-500 focus:outline-none"
            >
              {NEWSAPI_COUNTRIES.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || selectedCategories.length === 0}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            saving || selectedCategories.length === 0
              ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
              : 'bg-ember-500 text-white hover:bg-ember-600'
          }`}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Last Updated */}
      {settings && (
        <p className="text-xs text-neutral-500 text-center">
          Last updated: {new Date(settings.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
