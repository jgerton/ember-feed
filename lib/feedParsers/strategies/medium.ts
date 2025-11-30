/**
 * Medium Parser Strategy
 *
 * Handles Medium blogs and publications. Key characteristics:
 * - Feed URL: https://medium.com/@{username}/feed or publication feeds
 * - Generator field contains "Medium"
 * - Tracking pixel at end of content (must be stripped)
 * - URL has tracking params (?source=rss...) that should be cleaned
 * - No description field - must generate summary from content
 * - Multiple category tags per article
 * - atom:updated for edit tracking
 */

import type { ParserStrategy, ExtendedRssItem, FeedMeta, ParsedArticle } from '../types'
import {
  extractFirstImage,
  generateSummary,
  parseDate,
  extractTags,
  extractAuthor,
  cleanMediumUrl,
  stripMediumTrackingPixel,
  extractGuid,
} from '../utils'

export const mediumStrategy: ParserStrategy = {
  platform: 'medium',

  detect: (feedUrl: string, generator?: string): boolean => {
    const gen = (generator || '').toLowerCase()
    // Check generator field first (most reliable)
    if (gen.includes('medium')) return true
    // Parse URL properly to check hostname
    try {
      const parsedUrl = new URL(feedUrl)
      return parsedUrl.hostname === 'medium.com' || parsedUrl.hostname.endsWith('.medium.com')
    } catch {
      return false
    }
  },

  parse: (item: ExtendedRssItem, feedMeta: FeedMeta): ParsedArticle => {
    // Medium content is in content:encoded, needs tracking pixel removed
    const rawContent = item.contentEncoded || item['content:encoded'] || ''
    const content = stripMediumTrackingPixel(rawContent)

    // Clean the URL to remove tracking parameters
    const cleanedLink = cleanMediumUrl(item.link)

    // Extract first image from content (Medium doesn't provide cover image separately)
    const imageUrl = extractFirstImage(content)

    return {
      guid: extractGuid(item.guid, item.link),
      title: item.title || 'Untitled',
      link: cleanedLink,
      author: extractAuthor(item['dc:creator'], item.creator, feedMeta.title),
      publishedAt: parseDate(item.isoDate || item.pubDate),
      summary: generateSummary(content), // Medium has no description, generate from content
      content: content,
      imageUrl: imageUrl,
      tags: extractTags(item.categories),
      platform: 'medium',
    }
  },
}
