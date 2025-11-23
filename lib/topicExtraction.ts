// Topic Extraction Service
// Extracts topics from article titles and descriptions using keyword matching

interface TopicMatch {
  name: string
  slug: string
  relevance: number
}

// Predefined topic keywords for tech/developer content
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Artificial Intelligence': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural network', 'llm', 'gpt', 'chatgpt', 'claude', 'openai', 'gemini'],
  'Web Development': ['web dev', 'frontend', 'backend', 'fullstack', 'html', 'css', 'javascript', 'typescript', 'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs'],
  'Mobile Development': ['mobile', 'ios', 'android', 'swift', 'kotlin', 'flutter', 'react native', 'mobile app'],
  'DevOps': ['devops', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'deployment', 'infrastructure', 'terraform', 'ansible', 'jenkins'],
  'Cloud Computing': ['cloud', 'aws', 'azure', 'gcp', 'google cloud', 'serverless', 'lambda', 'cloudflare'],
  'Security': ['security', 'cybersecurity', 'vulnerability', 'encryption', 'authentication', 'privacy', 'hack', 'breach', 'malware'],
  'Databases': ['database', 'sql', 'nosql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'prisma', 'orm'],
  'Programming Languages': ['python', 'java', 'golang', 'go lang', 'rust', 'c++', 'php', 'ruby', 'elixir', 'scala'],
  'Open Source': ['open source', 'github', 'git', 'oss', 'contribution', 'repository', 'fork'],
  'Performance': ['performance', 'optimization', 'speed', 'benchmark', 'latency', 'caching', 'cdn'],
  'Design': ['design', 'ui', 'ux', 'user interface', 'user experience', 'figma', 'sketch', 'wireframe'],
  'Data Science': ['data science', 'analytics', 'big data', 'data analysis', 'pandas', 'jupyter', 'visualization'],
  'Blockchain': ['blockchain', 'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'web3', 'nft', 'smart contract'],
  'APIs': ['api', 'rest', 'graphql', 'rest api', 'webhook', 'endpoint', 'microservice'],
  'Testing': ['testing', 'test', 'qa', 'unit test', 'integration test', 'e2e', 'jest', 'playwright', 'cypress'],
  'Career': ['career', 'job', 'interview', 'hiring', 'salary', 'remote work', 'freelance', 'startup'],
  'Productivity': ['productivity', 'tool', 'workflow', 'automation', 'efficiency', 'vscode', 'terminal'],
  'Framework': ['framework', 'library', 'package', 'npm', 'dependency'],
  'Hardware': ['hardware', 'cpu', 'gpu', 'ram', 'ssd', 'raspberry pi', 'arduino'],
  'Game Development': ['game dev', 'gaming', 'unity', 'unreal', 'godot', '3d', 'game engine']
}

// Helper to create slug from topic name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Extract topics from article content using keyword matching
export function extractTopics(title: string, description: string): TopicMatch[] {
  const content = `${title} ${description}`.toLowerCase()
  const matches: Map<string, number> = new Map()

  // Check each topic's keywords
  for (const [topicName, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0
    let matchCount = 0

    for (const keyword of keywords) {
      // Count occurrences of keyword
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      const occurrences = (content.match(regex) || []).length

      if (occurrences > 0) {
        matchCount++
        // Weight matches in title higher than description
        const titleMatches = (title.toLowerCase().match(regex) || []).length
        const descMatches = occurrences - titleMatches
        score += (titleMatches * 2) + descMatches
      }
    }

    // Only include topics with at least one keyword match
    if (matchCount > 0) {
      matches.set(topicName, score)
    }
  }

  // Convert to array and sort by score
  const sortedMatches = Array.from(matches.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Top 5 topics max

  // Normalize scores to 0-1 range
  const maxScore = sortedMatches[0]?.[1] || 1

  return sortedMatches.map(([name, score]) => ({
    name,
    slug: slugify(name),
    relevance: Math.min(score / maxScore, 1.0)
  }))
}

// Extract topics and ensure minimum relevance threshold
export function extractTopicsWithThreshold(
  title: string,
  description: string,
  minRelevance: number = 0.3
): TopicMatch[] {
  const topics = extractTopics(title, description)
  return topics.filter(topic => topic.relevance >= minRelevance)
}

// Extract topics and assign them to an article in the database
export async function extractAndAssignTopics(articleId: string) {
  const { prisma } = await import('./db')

  // Get the article
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  })

  if (!article) {
    throw new Error(`Article not found: ${articleId}`)
  }

  // Extract topics from article
  const topicMatches = extractTopicsWithThreshold(article.title, article.description || '', 0.3)

  // Create or find topics and associate them with the article
  const articleTopics = []
  for (const match of topicMatches) {
    // Upsert topic (create if doesn't exist)
    const topic = await prisma.topic.upsert({
      where: { slug: match.slug },
      create: {
        name: match.name,
        slug: match.slug,
      },
      update: {},
    })

    // Create article-topic relationship
    const articleTopic = await prisma.articleTopic.upsert({
      where: {
        articleId_topicId: {
          articleId,
          topicId: topic.id,
        },
      },
      create: {
        articleId,
        topicId: topic.id,
        relevance: match.relevance,
      },
      update: {
        relevance: match.relevance,
      },
      include: {
        topic: true,
      },
    })

    articleTopics.push(articleTopic)
  }

  return articleTopics
}
