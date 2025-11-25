/**
 * Feed Scheduler API Proxy
 *
 * Proxies scheduler control requests to the aggregator service.
 * GET /api/scheduler - Get scheduler status
 * POST /api/scheduler - Start/stop/pause/resume scheduler
 */

import { NextRequest, NextResponse } from 'next/server'

const AGGREGATOR_URL = process.env.AGGREGATOR_URL || 'http://aggregator:8000'

// GET /api/scheduler - Get scheduler status
export async function GET() {
  try {
    const response = await fetch(`${AGGREGATOR_URL}/api/scheduler/status`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: 'Failed to get scheduler status', details: error },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Scheduler status error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to aggregator service' },
      { status: 503 }
    )
  }
}

// POST /api/scheduler - Control scheduler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, interval_minutes } = body

    if (!action) {
      return NextResponse.json(
        { error: 'action is required (start, stop, pause, resume, trigger)' },
        { status: 400 }
      )
    }

    let endpoint: string
    let method = 'POST'
    let payload: object | null = null

    switch (action) {
      case 'start':
        endpoint = '/api/scheduler/start'
        if (interval_minutes) {
          payload = { interval_minutes }
        }
        break
      case 'stop':
        endpoint = '/api/scheduler/stop'
        break
      case 'pause':
        endpoint = '/api/scheduler/pause'
        break
      case 'resume':
        endpoint = '/api/scheduler/resume'
        break
      case 'trigger':
        endpoint = '/api/scheduler/trigger'
        break
      case 'update_interval':
        endpoint = '/api/scheduler/interval'
        method = 'PATCH'
        payload = { interval_minutes: interval_minutes || 30 }
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, pause, resume, trigger, update_interval' },
          { status: 400 }
        )
    }

    const fetchOptions: { method: string; headers: Record<string, string>; body?: string } = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    if (payload) {
      fetchOptions.body = JSON.stringify(payload)
    }

    const response = await fetch(`${AGGREGATOR_URL}${endpoint}`, fetchOptions)

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `Scheduler ${action} failed`, details: error },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      action,
      success: true,
      ...data
    })
  } catch (error) {
    console.error('Scheduler control error:', error)
    return NextResponse.json(
      { error: 'Failed to control scheduler' },
      { status: 500 }
    )
  }
}
