/**
 * Feed Parser Strategy Tests
 *
 * Unit tests for platform-specific RSS feed parsing strategies.
 * Uses mocked feed responses for fast, reliable tests.
 */

import { test, expect } from '@playwright/test'
import { detectPlatform, parseWithStrategy } from '../../lib/feedParsers'
import type { ExtendedRssItem, FeedMeta } from '../../lib/feedParsers/types'
import {
  stripHtml,
  extractFirstImage,
  generateSummary,
  parseDate,
  extractTags,
  stripMediumTrackingPixel,
  cleanMediumUrl,
} from '../../lib/feedParsers/utils'

// ============================================
// Platform Detection Tests
// ============================================

test.describe('Platform Detection', () => {
  test('detects Substack by URL', () => {
    expect(detectPlatform('https://example.substack.com/feed')).toBe('substack')
    expect(detectPlatform('https://news.tonydinh.com/feed', 'Substack')).toBe('substack')
  })

  test('detects Medium by URL', () => {
    expect(detectPlatform('https://medium.com/@username/feed')).toBe('medium')
    expect(detectPlatform('https://medium.com/feed/publication')).toBe('medium')
  })

  test('detects Medium by generator', () => {
    expect(detectPlatform('https://example.com/feed', 'Medium')).toBe('medium')
  })

  test('detects Dev.to by URL', () => {
    expect(detectPlatform('https://dev.to/feed/username')).toBe('devto')
    expect(detectPlatform('https://dev.to/feed')).toBe('devto')
  })

  test('detects Ghost by generator', () => {
    expect(detectPlatform('https://blog.example.com/rss/', 'Ghost 5.0')).toBe('ghost')
    expect(detectPlatform('https://ghost.org/blog/rss/', 'ghost')).toBe('ghost')
  })

  test('detects Hashnode by URL', () => {
    expect(detectPlatform('https://blog.hashnode.dev/rss.xml')).toBe('hashnode')
    expect(detectPlatform('https://example.hashnode.dev/rss.xml')).toBe('hashnode')
  })

  test('returns generic for unknown platforms', () => {
    expect(detectPlatform('https://example.com/feed.xml')).toBe('generic')
    expect(detectPlatform('https://blog.example.org/rss')).toBe('generic')
  })
})

// ============================================
// Utility Function Tests
// ============================================

test.describe('Utility Functions', () => {
  test('stripHtml removes HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
    expect(stripHtml('<div class="test">Content</div>')).toBe('Content')
    expect(stripHtml('')).toBe('')
    expect(stripHtml(null)).toBe('')
    expect(stripHtml(undefined)).toBe('')
  })

  test('stripHtml decodes HTML entities', () => {
    expect(stripHtml('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'')
    expect(stripHtml('Hello&nbsp;World')).toBe('Hello World')
  })

  test('extractFirstImage finds img src', () => {
    expect(extractFirstImage('<p><img src="https://example.com/img.jpg" /></p>')).toBe(
      'https://example.com/img.jpg'
    )
    expect(extractFirstImage('<img src=\'https://test.com/image.png\'>')).toBe(
      'https://test.com/image.png'
    )
    expect(extractFirstImage('<p>No image here</p>')).toBeNull()
    expect(extractFirstImage(null)).toBeNull()
  })

  test('generateSummary truncates at word boundary', () => {
    const longText = '<p>This is a very long paragraph that should be truncated at a word boundary.</p>'
    const summary = generateSummary(longText, 30)
    expect(summary.length).toBeLessThanOrEqual(33) // 30 + '...'
    expect(summary.endsWith('...')).toBe(true)
    expect(summary).not.toMatch(/\s$/) // Should not end with space before ...
  })

  test('generateSummary returns full text if short', () => {
    expect(generateSummary('<p>Short</p>')).toBe('Short')
  })

  test('parseDate handles various formats', () => {
    expect(parseDate('2024-01-15T10:30:00Z')).toBeInstanceOf(Date)
    expect(parseDate('Mon, 15 Jan 2024 10:30:00 GMT')).toBeInstanceOf(Date)
    expect(parseDate('')).toBeNull()
    expect(parseDate(null)).toBeNull()
    expect(parseDate('invalid-date')).toBeNull()
  })

  test('extractTags handles string array', () => {
    expect(extractTags(['ai', 'webdev', 'javascript'])).toEqual(['ai', 'webdev', 'javascript'])
  })

  test('extractTags handles object array with term', () => {
    const categories = [
      { _: 'AI', $: { term: 'ai' } },
      { _: 'Web Development', $: { term: 'webdev' } },
    ]
    expect(extractTags(categories)).toEqual(['ai', 'webdev'])
  })

  test('extractTags returns empty array for undefined', () => {
    expect(extractTags(undefined)).toEqual([])
  })

  test('stripMediumTrackingPixel removes tracking images', () => {
    const content = '<p>Content</p><img src="https://medium.com/_/stat?event=post.clientViewed">'
    expect(stripMediumTrackingPixel(content)).toBe('<p>Content</p>')
  })

  test('cleanMediumUrl removes source params', () => {
    expect(cleanMediumUrl('https://medium.com/post?source=rss-abc123')).toBe(
      'https://medium.com/post'
    )
    expect(cleanMediumUrl('https://medium.com/post')).toBe('https://medium.com/post')
  })
})

// ============================================
// Strategy Parsing Tests
// ============================================

test.describe('Substack Strategy', () => {
  const mockItem: ExtendedRssItem = {
    title: 'Test Substack Article',
    link: 'https://example.substack.com/p/test-article',
    guid: 'substack-guid-123',
    pubDate: 'Mon, 15 Jan 2024 10:30:00 GMT',
    isoDate: '2024-01-15T10:30:00.000Z',
    'dc:creator': 'John Author',
    description: 'This is the article summary.',
    contentEncoded: '<p>Full article content here.</p>',
    enclosure: { url: 'https://example.com/cover.jpg', type: 'image/jpeg' },
  }

  const feedMeta: FeedMeta = { title: 'Example Newsletter', link: 'https://example.substack.com' }

  test('parses Substack article correctly', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'substack')

    expect(result.platform).toBe('substack')
    expect(result.title).toBe('Test Substack Article')
    expect(result.link).toBe('https://example.substack.com/p/test-article')
    expect(result.author).toBe('John Author')
    expect(result.summary).toBe('This is the article summary.')
    expect(result.content).toBe('<p>Full article content here.</p>')
    expect(result.imageUrl).toBe('https://example.com/cover.jpg')
    expect(result.publishedAt).toBeInstanceOf(Date)
  })

  test('falls back to feed title for author', () => {
    const itemNoAuthor = { ...mockItem, 'dc:creator': undefined }
    const result = parseWithStrategy(itemNoAuthor, feedMeta, 'substack')
    expect(result.author).toBe('Example Newsletter')
  })
})

test.describe('Medium Strategy', () => {
  const mockItem: ExtendedRssItem = {
    title: 'Test Medium Article',
    link: 'https://medium.com/@user/test-article-abc123?source=rss-feed',
    guid: 'medium-guid-456',
    isoDate: '2024-01-15T10:30:00.000Z',
    'dc:creator': 'Jane Writer',
    contentEncoded:
      '<p>Full article content with an image.</p><img src="https://example.com/article-img.jpg"><img src="https://medium.com/_/stat?event=post.clientViewed">',
    categories: ['technology', 'programming'],
  }

  const feedMeta: FeedMeta = { title: 'Jane Writer on Medium' }

  test('parses Medium article and strips tracking pixel', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'medium')

    expect(result.platform).toBe('medium')
    expect(result.content).not.toContain('medium.com/_/stat')
    expect(result.content).toContain('article-img.jpg')
  })

  test('cleans Medium URL tracking params', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'medium')
    expect(result.link).toBe('https://medium.com/@user/test-article-abc123')
    expect(result.link).not.toContain('?source=')
  })

  test('extracts tags from categories', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'medium')
    expect(result.tags).toEqual(['technology', 'programming'])
  })

  test('extracts first image for cover', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'medium')
    expect(result.imageUrl).toBe('https://example.com/article-img.jpg')
  })
})

test.describe('Dev.to Strategy', () => {
  const mockItem: ExtendedRssItem = {
    title: 'Test Dev.to Article',
    link: 'https://dev.to/user/test-article',
    guid: 'devto-guid-789',
    isoDate: '2024-01-15T10:30:00.000Z',
    'dc:creator': 'Dev User',
    description: '<p>Full content in description since Dev.to has no content:encoded.</p><img src="https://dev.to/cover.png">',
    categories: ['discuss', 'javascript', 'webdev'],
  }

  const feedMeta: FeedMeta = { title: 'Dev.to Feed' }

  test('uses description as full content', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'devto')

    expect(result.platform).toBe('devto')
    expect(result.content).toContain('Full content in description')
  })

  test('extracts image from description content', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'devto')
    expect(result.imageUrl).toBe('https://dev.to/cover.png')
  })

  test('extracts Dev.to tags', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'devto')
    expect(result.tags).toEqual(['discuss', 'javascript', 'webdev'])
  })
})

test.describe('Ghost Strategy', () => {
  const mockItem: ExtendedRssItem = {
    title: 'Test Ghost Article',
    link: 'https://blog.example.com/test-article/',
    guid: 'ghost-guid-101',
    isoDate: '2024-01-15T10:30:00.000Z',
    'dc:creator': 'Ghost Author',
    description: 'Article excerpt/summary.',
    contentEncoded: '<p>Full Ghost article content.</p>',
    media: { $: { url: 'https://blog.example.com/featured.jpg' } },
    categories: ['tech'],
  }

  const feedMeta: FeedMeta = { title: 'Example Ghost Blog', generator: 'Ghost 5.0' }

  test('parses Ghost article with media:content image', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'ghost')

    expect(result.platform).toBe('ghost')
    expect(result.imageUrl).toBe('https://blog.example.com/featured.jpg')
  })

  test('uses description as summary', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'ghost')
    expect(result.summary).toBe('Article excerpt/summary.')
  })
})

test.describe('Generic Strategy', () => {
  const mockItem: ExtendedRssItem = {
    title: 'Generic Blog Post',
    link: 'https://example.com/blog/post',
    guid: 'generic-guid-202',
    isoDate: '2024-01-15T10:30:00.000Z',
    description: 'Simple blog post content.',
  }

  const feedMeta: FeedMeta = { title: 'Example Blog' }

  test('handles minimal RSS item', () => {
    const result = parseWithStrategy(mockItem, feedMeta, 'generic')

    expect(result.platform).toBe('generic')
    expect(result.title).toBe('Generic Blog Post')
    expect(result.link).toBe('https://example.com/blog/post')
    expect(result.author).toBe('Example Blog') // Falls back to feed title
  })

  test('uses fallback for missing fields', () => {
    const minimalItem: ExtendedRssItem = {
      link: 'https://example.com/post',
    }
    const result = parseWithStrategy(minimalItem, feedMeta, 'generic')

    expect(result.title).toBe('Untitled')
    expect(result.guid).toBe('https://example.com/post')
  })
})

// ============================================
// Edge Cases
// ============================================

test.describe('Edge Cases', () => {
  test('handles empty content gracefully', () => {
    const emptyItem: ExtendedRssItem = {
      title: '',
      link: '',
    }
    const result = parseWithStrategy(emptyItem, {}, 'generic')

    expect(result.title).toBe('Untitled')
    expect(result.link).toBe('')
    expect(result.summary).toBe('')
    expect(result.imageUrl).toBeNull()
  })

  test('handles null/undefined fields', () => {
    const item: ExtendedRssItem = {
      title: undefined,
      link: undefined,
      contentEncoded: undefined,
    }
    const result = parseWithStrategy(item, {}, 'generic')

    expect(result.title).toBe('Untitled')
    expect(result.content).toBe('')
  })

  test('detects platform and parses in one step', () => {
    const substackItem: ExtendedRssItem = {
      title: 'Auto-detected Substack',
      link: 'https://test.substack.com/p/article',
      description: 'Content',
    }

    // First detect, then parse
    const platform = detectPlatform('https://test.substack.com/feed')
    const result = parseWithStrategy(substackItem, {}, platform)

    expect(result.platform).toBe('substack')
  })
})
