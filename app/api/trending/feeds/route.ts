/**
 * Feed Management API
 *
 * GET: List all feed sources
 * POST: Add custom feed source
 * PATCH: Update feed (enable/disable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const feeds = await prisma.feedSource.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      feeds,
      count: feeds.length,
      enabled: feeds.filter(f => f.enabled).length,
    });
  } catch (error) {
    console.error('Failed to fetch feeds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feeds' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, type, category } = body;

    // Validate required fields
    if (!name || !url || !type || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, type, category' },
        { status: 400 }
      );
    }

    // Check if feed URL already exists
    const existing = await prisma.feedSource.findUnique({
      where: { url },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Feed with this URL already exists' },
        { status: 409 }
      );
    }

    // Create feed
    const feed = await prisma.feedSource.create({
      data: {
        name,
        url,
        type,
        category,
        updateFrequency: 60, // Default to 60 minutes
        enabled: true,
      },
    });

    return NextResponse.json({ feed }, { status: 201 });
  } catch (error) {
    console.error('Failed to create feed:', error);
    return NextResponse.json(
      { error: 'Failed to create feed' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedId, enabled } = body;

    if (!feedId || enabled === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: feedId, enabled' },
        { status: 400 }
      );
    }

    // Update feed
    const feed = await prisma.feedSource.update({
      where: { id: feedId },
      data: { enabled },
    });

    return NextResponse.json({ feed });
  } catch (error) {
    console.error('Failed to update feed:', error);
    return NextResponse.json(
      { error: 'Failed to update feed' },
      { status: 500 }
    );
  }
}
