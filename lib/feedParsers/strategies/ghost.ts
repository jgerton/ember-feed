/**
 * Ghost Parser Strategy
 *
 * Handles Ghost blogs. Key characteristics:
 * - Feed URL: https://{domain}/rss/
 * - Generator field contains "Ghost"
 * - media:content for featured images with srcsets
 * - content:encoded for full HTML content
 * - description for excerpt/summary
 */

import type { ParserStrategy, ExtendedRssItem, FeedMeta, ParsedArticle } from '../types'
import {
  extractFirstImage,
  generateSummary,
  parseDate,
  extractTags,
  extractAuthor,
  getContent,
  extractGuid,
} from '../utils'

export const ghostStrategy: ParserStrategy = {
  platform: 'ghost',

  detect: (feedUrl: string, generator?: string): boolean => {
    const gen = (generator || '').toLowerCase()
    return gen.includes('ghost')
  },

  parse: (item: ExtendedRssItem, feedMeta: FeedMeta): ParsedArticle => {
    const content = getContent(
      item.contentEncoded || item['content:encoded'],
      item.description
    )

    // Ghost uses media:content for featured images
    const imageUrl =
      item.media?.$.url ||
      item.enclosure?.url ||
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
      tags: extractTags(item.categories),
      platform: 'ghost',
    }
  },
}
