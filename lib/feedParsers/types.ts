/**
 * Feed Parser Types
 *
 * Type definitions for the strategy-pattern feed parsing system.
 * Supports platform-specific parsing for Substack, Medium, Dev.to, Ghost, and generic RSS.
 */

import type { Item as RssParserItem } from 'rss-parser'

// Supported feed platforms
export type FeedPlatform =
  | 'substack'
  | 'medium'
  | 'devto'
  | 'ghost'
  | 'hashnode'
  | 'generic'

// Normalized article output from any platform
export interface ParsedArticle {
  guid: string
  title: string
  link: string
  author: string
  publishedAt: Date | null
  summary: string
  content: string
  imageUrl: string | null
  tags: string[]
  platform: FeedPlatform
}

// Feed-level metadata passed to parsers
export interface FeedMeta {
  title?: string
  link?: string
  generator?: string
}

// Extended RSS item with platform-specific fields
export interface ExtendedRssItem extends RssParserItem {
  // Standard RSS fields that rss-parser doesn't always include
  description?: string

  // Dublin Core namespace
  'dc:creator'?: string

  // Content namespace
  'content:encoded'?: string
  contentEncoded?: string // rss-parser custom field mapping

  // Media namespace
  media?: { $: { url?: string } } // media:content mapping

  // Atom namespace
  'atom:updated'?: string

  // Note: 'categories' and 'enclosure' are inherited from RssParserItem
  // Don't override them to avoid type conflicts
}

// Parser strategy interface - each platform implements this
export interface ParserStrategy {
  platform: FeedPlatform
  detect: (feedUrl: string, generator?: string) => boolean
  parse: (item: ExtendedRssItem, feedMeta: FeedMeta) => ParsedArticle
}
