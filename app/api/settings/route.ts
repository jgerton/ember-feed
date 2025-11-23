import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createCachedResponse } from '@/lib/cacheHeaders'
import { handleApiError, validateEnum } from '@/lib/errorHandler'

// Force Node.js runtime (required for crypto module in cacheHeaders)
export const runtime = 'nodejs'

// GET /api/settings - Get user settings
export async function GET(request: Request) {
  try {
    let settings = await prisma.userSettings.findFirst()

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { diversityLevel: 'medium' },
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
    const { diversityLevel } = body

    // Validate diversity level using centralized validation
    if (diversityLevel) {
      validateEnum(diversityLevel, ['low', 'medium', 'high'] as const, 'diversityLevel')
    }

    // Get or create settings
    let settings = await prisma.userSettings.findFirst()

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { diversityLevel: diversityLevel || 'medium' },
      })
    } else {
      settings = await prisma.userSettings.update({
        where: { id: settings.id },
        data: { diversityLevel: diversityLevel || settings.diversityLevel },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    return handleApiError(error, { endpoint: '/api/settings', method: 'PATCH' })
  }
}
