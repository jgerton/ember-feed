/**
 * Feed Parsers
 *
 * Main module for the strategy-pattern feed parsing system.
 * Provides platform detection and unified parsing interface.
 */

import type { FeedPlatform, FeedMeta, ParsedArticle, ExtendedRssItem } from './types'
import { strategies, fallbackStrategy } from './strategies'

// Re-export types for convenience
export type { FeedPlatform, FeedMeta, ParsedArticle, ExtendedRssItem, ParserStrategy } from './types'

/**
 * Detect the platform for a given feed URL and generator string.
 * Returns 'generic' if no specific platform is detected.
 */
export function detectPlatform(feedUrl: string, generator?: string): FeedPlatform {
  for (const strategy of strategies) {
    if (strategy.detect(feedUrl, generator)) {
      return strategy.platform
    }
  }
  return 'generic'
}

/**
 * Parse an RSS item using the appropriate platform strategy.
 * Automatically detects platform if not provided.
 */
export function parseWithStrategy(
  item: ExtendedRssItem,
  feedMeta: FeedMeta,
  platform?: FeedPlatform
): ParsedArticle {
  // If platform is provided, find the matching strategy
  if (platform && platform !== 'generic') {
    const strategy = strategies.find((s) => s.platform === platform)
    if (strategy) {
      return strategy.parse(item, feedMeta)
    }
  }

  // Fall back to generic parser
  return fallbackStrategy.parse(item, feedMeta)
}

/**
 * Get parser strategy by platform name
 */
export function getStrategy(platform: FeedPlatform) {
  if (platform === 'generic') {
    return fallbackStrategy
  }
  return strategies.find((s) => s.platform === platform) || fallbackStrategy
}
