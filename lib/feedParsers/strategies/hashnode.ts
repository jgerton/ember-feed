/**
 * Hashnode Parser Strategy
 *
 * Handles Hashnode blogs. Key characteristics:
 * - Feed URL: https://{publication}.hashnode.dev/rss.xml or custom domain
 * - Standard RSS 2.0 with content:encoded
 * - Similar structure to Substack
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

export const hashnodeStrategy: ParserStrategy = {
  platform: 'hashnode',

  detect: (feedUrl: string): boolean => {
    return feedUrl.toLowerCase().includes('hashnode')
  },

  parse: (item: ExtendedRssItem, feedMeta: FeedMeta): ParsedArticle => {
    const content = getContent(
      item.contentEncoded || item['content:encoded'],
      item.description
    )

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
      tags: extractTags(item.categories),
      platform: 'hashnode',
    }
  },
}
