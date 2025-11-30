/**
 * Substack Parser Strategy
 *
 * Handles Substack newsletters. Key characteristics:
 * - Feed URL: https://{publication}.substack.com/feed or custom domain
 * - Generator field contains "Substack"
 * - Cover images in enclosure element
 * - dc:creator for author
 * - content:encoded for full HTML content
 */

import type { ParserStrategy, ExtendedRssItem, FeedMeta, ParsedArticle } from '../types'
import {
  extractFirstImage,
  generateSummary,
  parseDate,
  extractAuthor,
  getContent,
  extractGuid,
} from '../utils'

export const substackStrategy: ParserStrategy = {
  platform: 'substack',

  detect: (feedUrl: string, generator?: string): boolean => {
    const url = feedUrl.toLowerCase()
    const gen = (generator || '').toLowerCase()
    return url.includes('substack.com') || gen.includes('substack')
  },

  parse: (item: ExtendedRssItem, feedMeta: FeedMeta): ParsedArticle => {
    const content = getContent(
      item.contentEncoded || item['content:encoded'],
      item.description
    )

    // Substack uses enclosure for cover images
    const imageUrl =
      item.enclosure?.url ||
      item.media?.$.url ||
      extractFirstImage(content)

    return {
      guid: extractGuid(item.guid, item.link),
      title: item.title || 'Untitled',
      link: item.link || '',
      author: extractAuthor(item['dc:creator'], item.creator, feedMeta.title),
      publishedAt: parseDate(item.isoDate || item.pubDate),
      summary: item.contentSnippet || item.description || generateSummary(content),
      content: content,
      imageUrl: imageUrl,
      tags: [], // Substack typically doesn't include tags in RSS
      platform: 'substack',
    }
  },
}
