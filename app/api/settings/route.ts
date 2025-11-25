import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCachedResponse } from '@/lib/cacheHeaders'
import { handleApiError, validateEnum } from '@/lib/errorHandler'

// Force Node.js runtime (required for crypto module in cacheHeaders)
export const runtime = 'nodejs'

// Valid NewsAPI values
const VALID_NEWSAPI_CATEGORIES = [
  'business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'
] as const

const VALID_NEWSAPI_LANGUAGES = [
  'ar', 'de', 'en', 'es', 'fr', 'he', 'it', 'nl', 'no', 'pt', 'ru', 'sv', 'ud', 'zh'
] as const

const VALID_NEWSAPI_COUNTRIES = [
  'ae', 'ar', 'at', 'au', 'be', 'bg', 'br', 'ca', 'ch', 'cn', 'co', 'cu', 'cz', 'de',
  'eg', 'fr', 'gb', 'gr', 'hk', 'hu', 'id', 'ie', 'il', 'in', 'it', 'jp', 'kr', 'lt',
  'lv', 'ma', 'mx', 'my', 'ng', 'nl', 'no', 'nz', 'ph', 'pl', 'pt', 'ro', 'rs', 'ru',
  'sa', 'se', 'sg', 'si', 'sk', 'th', 'tr', 'tw', 'ua', 'us', 've', 'za'
] as const

// Validate comma-separated categories
function validateCategories(categories: string): boolean {
  if (!categories) return true
  const categoryList = categories.split(',').map(c => c.trim())
  return categoryList.every(cat => VALID_NEWSAPI_CATEGORIES.includes(cat as typeof VALID_NEWSAPI_CATEGORIES[number]))
}

// GET /api/settings - Get user settings
export async function GET(request: Request) {
  try {
    let settings = await prisma.userSettings.findFirst()

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          diversityLevel: 'medium',
          newsApiEnabled: true,
          newsApiCategories: 'technology,science,business',
          newsApiLanguage: 'en',
          newsApiCountry: 'us'
        },
      })
    }

    // Settings rarely change, use static caching (1 hour)
    return createCachedResponse(request, settings, 'static')
  } catch (error) {
    return handleApiError(error, { endpoint: '/api/settings', method: 'GET' })
  }
}

// PATCH /api/settings - Update user settings
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const {
      diversityLevel,
      newsApiEnabled,
      newsApiCategories,
      newsApiLanguage,
      newsApiCountry
    } = body

    // Validate diversity level using centralized validation
    if (diversityLevel) {
      validateEnum(diversityLevel, ['low', 'medium', 'high'] as const, 'diversityLevel')
    }

    // Validate NewsAPI categories
    if (newsApiCategories !== undefined && newsApiCategories !== '') {
      if (!validateCategories(newsApiCategories)) {
        return NextResponse.json(
          { error: `Invalid newsApiCategories. Valid categories: ${VALID_NEWSAPI_CATEGORIES.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate NewsAPI language
    if (newsApiLanguage !== undefined && newsApiLanguage !== '') {
      if (!VALID_NEWSAPI_LANGUAGES.includes(newsApiLanguage as typeof VALID_NEWSAPI_LANGUAGES[number])) {
        return NextResponse.json(
          { error: `Invalid newsApiLanguage. Valid languages: ${VALID_NEWSAPI_LANGUAGES.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate NewsAPI country
    if (newsApiCountry !== undefined && newsApiCountry !== '') {
      if (!VALID_NEWSAPI_COUNTRIES.includes(newsApiCountry as typeof VALID_NEWSAPI_COUNTRIES[number])) {
        return NextResponse.json(
          { error: `Invalid newsApiCountry. Valid countries: ${VALID_NEWSAPI_COUNTRIES.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Get or create settings
    let settings = await prisma.userSettings.findFirst()

    // Build update data - only include fields that were provided
    const updateData: Record<string, string | boolean> = {}
    if (diversityLevel) updateData.diversityLevel = diversityLevel
    if (newsApiEnabled !== undefined) updateData.newsApiEnabled = Boolean(newsApiEnabled)
    if (newsApiCategories !== undefined && newsApiCategories !== '') updateData.newsApiCategories = newsApiCategories
    if (newsApiLanguage !== undefined && newsApiLanguage !== '') updateData.newsApiLanguage = newsApiLanguage
    if (newsApiCountry !== undefined && newsApiCountry !== '') updateData.newsApiCountry = newsApiCountry

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          diversityLevel: diversityLevel || 'medium',
          newsApiEnabled: newsApiEnabled ?? true,
          newsApiCategories: newsApiCategories || 'technology,science,business',
          newsApiLanguage: newsApiLanguage || 'en',
          newsApiCountry: newsApiCountry || 'us'
        },
      })
    } else {
      settings = await prisma.userSettings.update({
        where: { id: settings.id },
        data: updateData,
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    return handleApiError(error, { endpoint: '/api/settings', method: 'PATCH' })
  }
}
