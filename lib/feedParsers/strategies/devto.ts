/**
 * Dev.to Parser Strategy
 *
 * Handles Dev.to developer blogs. Key characteristics:
 * - Feed URL: https://dev.to/feed/{username}
 * - No content:encoded field - full HTML content is in description
 * - Multiple category tags (discuss, ai, webdev, etc.)
 * - dc:creator for author
 */

import type { ParserStrategy, ExtendedRssItem, FeedMeta, ParsedArticle } from '../types'
import {
  extractFirstImage,
  generateSummary,
  parseDate,
  extractTags,
  extractAuthor,
  extractGuid,
} from '../utils'

export const devtoStrategy: ParserStrategy = {
  platform: 'devto',

  detect: (feedUrl: string): boolean => {
    return feedUrl.toLowerCase().includes('dev.to')
  },

  parse: (item: ExtendedRssItem, feedMeta: FeedMeta): ParsedArticle => {
    // Dev.to puts full HTML content in description (no content:encoded)
    const content = item.description || item.summary || ''

    // Extract first image from content
    const imageUrl = extractFirstImage(content)

    return {
      guid: extractGuid(item.guid, item.link),
      title: item.title || 'Untitled',
      link: item.link || '',
      author: extractAuthor(item['dc:creator'], item.creator, feedMeta.title),
      publishedAt: parseDate(item.isoDate || item.pubDate),
      summary: generateSummary(content),
      content: content,
      imageUrl: imageUrl,
      tags: extractTags(item.categories),
      platform: 'devto',
    }
  },
}
