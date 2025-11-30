/**
 * Feed Parser Utilities
 *
 * Common utility functions shared across all platform-specific parsers.
 */

/**
 * Decode HTML entities to their character equivalents.
 * Used for converting HTML text content to plain text.
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
  }
  return text.replace(/&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match) => {
    return entities[match] ?? match
  })
}

/**
 * Strip all HTML tags from a string and decode entities.
 * Output is plain text safe for display (not for HTML insertion).
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return ''
  // First strip HTML tags, then decode entities
  // This order ensures encoded tags like &lt;script&gt; don't become executable
  const stripped = html.replace(/<[^>]*>/g, ' ')
  const decoded = decodeHtmlEntities(stripped)
  return decoded.replace(/\s+/g, ' ').trim()
}

/**
 * Extract the first image URL from HTML content
 */
export function extractFirstImage(html: string | undefined | null): string | null {
  if (!html) return null
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1] || null
}

/**
 * Generate a summary/excerpt from HTML content
 */
export function generateSummary(
  html: string | undefined | null,
  maxChars: number = 280
): string {
  const text = stripHtml(html)
  if (text.length <= maxChars) return text
  // Truncate at word boundary
  const truncated = text.substring(0, maxChars)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...'
}

/**
 * Parse various date formats into a Date object
 */
export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Extract categories/tags from RSS item
 * Handles both string arrays and object arrays with term property
 */
export function extractTags(
  categories: Array<string | { _: string; $?: { term?: string } }> | undefined
): string[] {
  if (!categories || !Array.isArray(categories)) return []

  return categories
    .map((cat) => {
      if (typeof cat === 'string') return cat
      // Handle object with term property (common in RSS)
      if (cat && typeof cat === 'object') {
        return cat.$?.term || cat._ || ''
      }
      return ''
    })
    .filter((tag): tag is string => Boolean(tag))
}

/**
 * Get author from various RSS author field formats
 */
export function extractAuthor(
  creator: string | undefined,
  author: string | undefined,
  feedTitle: string | undefined
): string {
  return creator || author || feedTitle || 'Unknown'
}

/**
 * Clean Medium URLs by removing tracking parameters
 */
export function cleanMediumUrl(url: string | undefined): string {
  if (!url) return ''
  return url.replace(/\?source=rss[^&]*(&|$)/, '').replace(/&$/, '')
}

/**
 * Strip Medium tracking pixel from content
 */
export function stripMediumTrackingPixel(html: string | undefined | null): string {
  if (!html) return ''
  return html.replace(/<img[^>]*medium\.com\/_\/stat[^>]*\/?>/gi, '')
}

/**
 * Get content from either content:encoded or description field
 */
export function getContent(
  contentEncoded: string | undefined,
  description: string | undefined
): string {
  return contentEncoded || description || ''
}

/**
 * Extract GUID from item, falling back to link if not available
 */
export function extractGuid(
  guid: string | { _: string } | undefined,
  link: string | undefined
): string {
  if (!guid) return link || ''
  if (typeof guid === 'string') return guid
  return guid._ || link || ''
}
