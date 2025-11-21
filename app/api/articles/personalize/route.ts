import { NextResponse } from 'next/server'
import { updatePersonalizedScores, buildUserProfile } from '@/lib/rankingService'

// POST /api/articles/personalize - Recalculate personalized scores
export async function POST() {
  try {
    const result = await updatePersonalizedScores()

    return NextResponse.json({
      success: true,
      message: `Updated ${result.updated} article scores with personalized ranking`,
      updated: result.updated
    })
  } catch (error) {
    console.error('Error personalizing article scores:', error)
    return NextResponse.json(
      { error: 'Failed to personalize article scores' },
      { status: 500 }
    )
  }
}

// GET /api/articles/personalize - Get user profile for debugging
export async function GET() {
  try {
    const profile = await buildUserProfile()

    return NextResponse.json({
      profile,
      message: 'User profile built from activity history'
    })
  } catch (error) {
    console.error('Error building user profile:', error)
    return NextResponse.json(
      { error: 'Failed to build user profile' },
      { status: 500 }
    )
  }
}
