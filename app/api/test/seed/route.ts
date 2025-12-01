/**
 * Test Seed API Endpoint
 *
 * Seeds the test database with baseline data needed for tests.
 * Only available when TEST_MODE=true for security.
 *
 * POST /api/test/seed
 * Body: { feeds?: boolean, topics?: boolean, settings?: boolean, articles?: boolean }
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Default test feeds (RSS sources)
const TEST_FEEDS = [
  {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com/rss',
    type: 'rss',
    category: 'tech',
    priority: 90,
    status: 'active',
  },
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    type: 'rss',
    category: 'tech',
    priority: 80,
    status: 'active',
  },
  {
    name: 'Dev.to',
    url: 'https://dev.to/feed',
    type: 'rss',
    category: 'developer',
    priority: 70,
    status: 'active',
  },
]

// Default topics (categories)
const TEST_TOPICS = [
  { name: 'Artificial Intelligence', slug: 'ai' },
  { name: 'Web Development', slug: 'web-development' },
  { name: 'DevOps', slug: 'devops' },
  { name: 'Security', slug: 'security' },
  { name: 'Startups', slug: 'startups' },
  { name: 'Programming', slug: 'programming' },
]

// Sample test articles
const TEST_ARTICLES = [
  {
    title: 'Test Article 1: Introduction to AI',
    description: 'A comprehensive guide to artificial intelligence concepts.',
    url: 'https://example.com/test-article-1',
    source: 'Hacker News',
    score: 100,
    publishedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  },
  {
    title: 'Test Article 2: Web Development Trends',
    description: 'Latest trends in modern web development for 2024.',
    url: 'https://example.com/test-article-2',
    source: 'TechCrunch',
    score: 85,
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    title: 'Test Article 3: DevOps Best Practices',
    description: 'Essential DevOps practices for modern teams.',
    url: 'https://example.com/test-article-3',
    source: 'Dev.to',
    score: 70,
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
  },
]

export async function POST(request: Request) {
  // Security: Only allow in test mode
  if (process.env.TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Test endpoints are not available. Set TEST_MODE=true to enable.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const {
      feeds = true,
      topics = true,
      settings = true,
      articles = false, // Off by default - only seed if explicitly requested
    } = body

    const results: Record<string, number> = {}

    // Seed feeds
    if (feeds) {
      const feedResults = await Promise.all(
        TEST_FEEDS.map((feed) =>
          prisma.feed.upsert({
            where: { url: feed.url },
            update: feed,
            create: feed,
          })
        )
      )
      results.feeds = feedResults.length
    }

    // Seed topics
    if (topics) {
      const topicResults = await Promise.all(
        TEST_TOPICS.map((topic) =>
          prisma.topic.upsert({
            where: { slug: topic.slug },
            update: topic,
            create: topic,
          })
        )
      )
      results.topics = topicResults.length
    }

    // Seed default settings
    if (settings) {
      await prisma.userSettings.upsert({
        where: { id: 'default-settings' },
        update: {},
        create: {
          id: 'default-settings',
          diversityLevel: 'medium',
          newsApiEnabled: true,
          newsApiCategories: 'technology,science,business',
          newsApiLanguage: 'en',
          newsApiCountry: 'us',
        },
      })
      results.settings = 1
    }

    // Seed test articles (optional)
    if (articles) {
      const articleResults = await Promise.all(
        TEST_ARTICLES.map((article) =>
          prisma.article.upsert({
            where: { url: article.url },
            update: article,
            create: article,
          })
        )
      )
      results.articles = articleResults.length
    }

    return NextResponse.json({
      success: true,
      message: 'Test data seeded',
      seeded: results,
    })
  } catch (error) {
    console.error('Test seed failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Seed failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint for documentation
export async function GET() {
  if (process.env.TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Test endpoints are not available. Set TEST_MODE=true to enable.' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    endpoint: '/api/test/seed',
    method: 'POST',
    description: 'Seeds the test database with baseline data',
    body: {
      feeds: 'boolean (default: true) - Seed RSS feed sources',
      topics: 'boolean (default: true) - Seed topic categories',
      settings: 'boolean (default: true) - Seed default user settings',
      articles: 'boolean (default: false) - Seed sample test articles',
    },
    data: {
      feeds: TEST_FEEDS.map((f) => f.name),
      topics: TEST_TOPICS.map((t) => t.name),
    },
    security: 'Requires TEST_MODE=true environment variable',
  })
}
