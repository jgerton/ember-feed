/**
 * Jon-OS Insights Service
 *
 * Analyzes log entries to identify patterns, recurring blockers,
 * actionable discoveries, and connections between entries.
 */

import { prisma } from '@/lib/db'

interface LogEntry {
  id: string
  type: string
  content: string
  tags: string | null
  createdAt: Date
}

interface RecurringBlocker {
  pattern: string
  count: number
  entries: Array<{ id: string; content: string; created_at: string }>
}

interface ActionableDiscovery {
  id: string
  content: string
  tags: string[]
  created_at: string
}

interface Connection {
  entry_ids: string[]
  relationship: string
  shared_tags: string[]
}

interface InsightsSummary {
  total_blockers: number
  total_discoveries: number
  total_accomplishments: number
  top_tags: Array<{ tag: string; count: number }>
}

interface InsightsResult {
  recurring_blockers: RecurringBlocker[]
  actionable_discoveries: ActionableDiscovery[]
  connections: Connection[]
  summary: InsightsSummary
  analyzed_entries: number
}

interface AnalyzeResult {
  keywords: string[]
  suggested_tags: string[]
  similar_entries: Array<{ id: string; content: string; similarity: number }>
}

/**
 * Get insights from log entries within a time range
 */
export async function getInsights(options: {
  days?: number
  limit?: number
  type?: string
}): Promise<InsightsResult> {
  const { days = 30, limit = 5, type } = options

  // Calculate date range
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Query log entries
  const where: { createdAt?: { gte: Date }; type?: string } = {
    createdAt: { gte: startDate }
  }

  if (type) {
    where.type = type
  }

  const entries = await prisma.logEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })

  // Analyze entries
  const recurringBlockers = findRecurringBlockers(entries, limit)
  const actionableDiscoveries = findActionableDiscoveries(entries, limit)
  const connections = findConnections(entries, limit)
  const summary = generateSummary(entries)

  return {
    recurring_blockers: recurringBlockers,
    actionable_discoveries: actionableDiscoveries,
    connections,
    summary,
    analyzed_entries: entries.length
  }
}

/**
 * Analyze content for patterns and suggestions
 */
export async function analyzeContent(content: string): Promise<AnalyzeResult> {
  // Extract keywords from content
  const keywords = extractKeywords(content)

  // Suggest tags based on keywords
  const suggestedTags = suggestTags(keywords)

  // Find similar entries
  const similarEntries = await findSimilarEntries(content, keywords)

  return {
    keywords,
    suggested_tags: suggestedTags,
    similar_entries: similarEntries
  }
}

/**
 * Find recurring blocker patterns
 */
function findRecurringBlockers(entries: LogEntry[], limit: number): RecurringBlocker[] {
  const blockers = entries.filter(e => e.type === 'blocker')

  if (blockers.length === 0) {
    return []
  }

  // Extract common patterns using keyword frequency
  const patternMap = new Map<string, LogEntry[]>()

  blockers.forEach(entry => {
    const keywords = extractKeywords(entry.content)
    keywords.forEach(keyword => {
      const existing = patternMap.get(keyword) || []
      existing.push(entry)
      patternMap.set(keyword, existing)
    })
  })

  // Sort by frequency and return top patterns
  const patterns: RecurringBlocker[] = []

  const sortedPatterns = Array.from(patternMap.entries())
    .filter(([, entries]) => entries.length >= 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limit)

  sortedPatterns.forEach(([pattern, matchingEntries]) => {
    patterns.push({
      pattern,
      count: matchingEntries.length,
      entries: matchingEntries.map(e => ({
        id: e.id,
        content: e.content,
        created_at: e.createdAt.toISOString()
      }))
    })
  })

  return patterns
}

/**
 * Find actionable discoveries
 */
function findActionableDiscoveries(entries: LogEntry[], limit: number): ActionableDiscovery[] {
  const discoveries = entries.filter(e => e.type === 'discovery')

  return discoveries.slice(0, limit).map(entry => ({
    id: entry.id,
    content: entry.content,
    tags: entry.tags ? JSON.parse(entry.tags) : [],
    created_at: entry.createdAt.toISOString()
  }))
}

/**
 * Find connections between entries based on shared tags and keywords
 */
function findConnections(entries: LogEntry[], limit: number): Connection[] {
  const connections: Connection[] = []
  const processed = new Set<string>()

  // Group entries by tags
  const tagGroups = new Map<string, LogEntry[]>()

  entries.forEach(entry => {
    if (entry.tags) {
      try {
        const tags = JSON.parse(entry.tags) as string[]
        tags.forEach(tag => {
          const existing = tagGroups.get(tag) || []
          existing.push(entry)
          tagGroups.set(tag, existing)
        })
      } catch {
        // Invalid JSON, skip
      }
    }
  })

  // Find entries that share multiple tags
  tagGroups.forEach((groupEntries, tag) => {
    if (groupEntries.length >= 2) {
      const entryIds = groupEntries.map(e => e.id)
      const key = entryIds.sort().join('-')

      if (!processed.has(key) && connections.length < limit) {
        // Find all shared tags between these entries
        const sharedTags = findSharedTags(groupEntries)

        connections.push({
          entry_ids: entryIds,
          relationship: `Shared topic: ${tag}`,
          shared_tags: sharedTags
        })

        processed.add(key)
      }
    }
  })

  // Also find connections based on similar keywords
  for (let i = 0; i < entries.length && connections.length < limit; i++) {
    for (let j = i + 1; j < entries.length && connections.length < limit; j++) {
      const entry1 = entries[i]
      const entry2 = entries[j]
      const key = [entry1.id, entry2.id].sort().join('-')

      if (!processed.has(key)) {
        const keywords1 = new Set(extractKeywords(entry1.content))
        const keywords2 = new Set(extractKeywords(entry2.content))

        const shared = [...keywords1].filter(k => keywords2.has(k))

        if (shared.length >= 2) {
          connections.push({
            entry_ids: [entry1.id, entry2.id],
            relationship: `Related topics: ${shared.slice(0, 3).join(', ')}`,
            shared_tags: shared
          })

          processed.add(key)
        }
      }
    }
  }

  return connections.slice(0, limit)
}

/**
 * Find tags shared between multiple entries
 */
function findSharedTags(entries: LogEntry[]): string[] {
  if (entries.length === 0) return []

  const tagSets = entries.map(entry => {
    if (!entry.tags) return new Set<string>()
    try {
      return new Set(JSON.parse(entry.tags) as string[])
    } catch {
      return new Set<string>()
    }
  })

  const firstSet = tagSets[0]
  return [...firstSet].filter(tag =>
    tagSets.every(set => set.has(tag))
  )
}

/**
 * Generate summary statistics
 */
function generateSummary(entries: LogEntry[]): InsightsSummary {
  const typeCounts = {
    blocker: 0,
    discovery: 0,
    accomplishment: 0
  }

  const tagCounts = new Map<string, number>()

  entries.forEach(entry => {
    if (entry.type === 'blocker') typeCounts.blocker++
    if (entry.type === 'discovery') typeCounts.discovery++
    if (entry.type === 'accomplishment') typeCounts.accomplishment++

    if (entry.tags) {
      try {
        const tags = JSON.parse(entry.tags) as string[]
        tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        })
      } catch {
        // Invalid JSON, skip
      }
    }
  })

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))

  return {
    total_blockers: typeCounts.blocker,
    total_discoveries: typeCounts.discovery,
    total_accomplishments: typeCounts.accomplishment,
    top_tags: topTags
  }
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'this', 'that', 'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we',
    'our', 'you', 'your', 'he', 'she', 'they', 'them', 'their', 'what',
    'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
    'only', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now',
    'get', 'got', 'getting', 'keep', 'kept'
  ])

  // Extract words, filter stop words, keep meaningful ones
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word =>
      word.length > 2 &&
      !stopWords.has(word) &&
      !/^\d+$/.test(word)
    )

  // Return unique keywords
  return [...new Set(words)]
}

/**
 * Suggest tags based on keywords
 */
function suggestTags(keywords: string[]): string[] {
  // Common tag mappings
  const tagMappings: Record<string, string[]> = {
    'api': ['api', 'backend'],
    'frontend': ['frontend', 'ui'],
    'database': ['database', 'data'],
    'bug': ['bug', 'debugging'],
    'test': ['testing', 'qa'],
    'deploy': ['deployment', 'devops'],
    'performance': ['performance', 'optimization'],
    'security': ['security'],
    'ci': ['ci-cd', 'automation'],
    'build': ['build', 'ci-cd']
  }

  const suggestedTags = new Set<string>()

  keywords.forEach(keyword => {
    // Check if keyword matches any tag mapping
    Object.entries(tagMappings).forEach(([key, tags]) => {
      if (keyword.includes(key) || key.includes(keyword)) {
        tags.forEach(tag => suggestedTags.add(tag))
      }
    })

    // Also suggest the keyword itself if it's meaningful
    if (keyword.length > 3) {
      suggestedTags.add(keyword)
    }
  })

  return [...suggestedTags].slice(0, 10)
}

/**
 * Find similar entries based on content
 */
async function findSimilarEntries(
  content: string,
  keywords: string[]
): Promise<Array<{ id: string; content: string; similarity: number }>> {
  if (keywords.length === 0) {
    return []
  }

  // Query entries that might be similar
  const entries = await prisma.logEntry.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' }
  })

  // Calculate similarity scores
  const contentKeywords = new Set(keywords)

  const scored = entries
    .map(entry => {
      const entryKeywords = new Set(extractKeywords(entry.content))

      // Calculate Jaccard similarity
      const intersection = [...contentKeywords].filter(k => entryKeywords.has(k))
      const union = new Set([...contentKeywords, ...entryKeywords])
      const similarity = union.size > 0 ? intersection.length / union.size : 0

      return {
        id: entry.id,
        content: entry.content,
        similarity: Math.round(similarity * 100) / 100
      }
    })
    .filter(item => item.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)

  return scored
}
