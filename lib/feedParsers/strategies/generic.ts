/**
 * Generic RSS Parser Strategy
 *
 * Fallback parser for unknown platforms. Uses best-effort parsing
 * with sensible defaults for standard RSS 2.0 feeds.
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

export const genericStrategy: ParserStrategy = {
  platform: 'generic',

  // Generic always returns false - it's the fallback, not auto-detected
  detect: () => false,

  parse: (item: ExtendedRssItem, feedMeta: FeedMeta): ParsedArticle => {
    const content = getContent(
      item.contentEncoded || item['content:encoded'],
      item.summary || item.content || item.description
    )

    return {
      guid: extractGuid(item.guid, item.link),
      title: item.title || 'Untitled',
      link: item.link || '',
      author: extractAuthor(item['dc:creator'], item.creator, feedMeta.title),
      publishedAt: parseDate(item.isoDate || item.pubDate),
      summary: item.contentSnippet || generateSummary(content),
      content: content,
      imageUrl: item.media?.$.url || item.enclosure?.url || extractFirstImage(content),
      tags: extractTags(item.categories),
      platform: 'generic',
    }
  },
}
