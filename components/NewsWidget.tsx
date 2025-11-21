interface Article {
  id: number
  title: string
  source: string
  url: string
  summary: string
  publishedAt: string
  score?: number
}

// Hardcoded articles for Phase 1
const MOCK_ARTICLES: Article[] = [
  {
    id: 1,
    title: "The Future of AI Development: Beyond Large Language Models",
    source: "Hacker News",
    url: "#",
    summary: "Exploring next-generation AI architectures that go beyond traditional transformer models, including neuromorphic computing and quantum ML approaches.",
    publishedAt: "2025-11-21T10:00:00Z",
    score: 95
  },
  {
    id: 2,
    title: "Building Resilient Microservices with Temporal Workflows",
    source: "Dev.to",
    url: "#",
    summary: "Learn how Temporal helps you build fault-tolerant distributed systems with durable workflow execution and automatic retries.",
    publishedAt: "2025-11-21T09:30:00Z",
    score: 88
  },
  {
    id: 3,
    title: "Why TypeScript 5.5 Changes Everything",
    source: "Reddit",
    url: "#",
    summary: "Deep dive into the new type inference improvements and const type parameters that make TypeScript even more powerful.",
    publishedAt: "2025-11-21T08:15:00Z",
    score: 82
  },
  {
    id: 4,
    title: "Docker Best Practices for Production Deployments",
    source: "Hacker News",
    url: "#",
    summary: "A comprehensive guide to multi-stage builds, security hardening, and optimization techniques for containerized applications.",
    publishedAt: "2025-11-20T16:45:00Z",
    score: 76
  },
  {
    id: 5,
    title: "The State of React in 2025: Server Components and Beyond",
    source: "Dev.to",
    url: "#",
    summary: "How React 19 and Next.js 16 are reshaping modern web development with server components and streaming SSR.",
    publishedAt: "2025-11-20T14:20:00Z",
    score: 71
  }
]

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function NewsWidget() {
  return (
    <div className="space-y-4">
      {MOCK_ARTICLES.map((article) => (
        <article
          key={article.id}
          className="glass-light rounded-xl p-5 hover:glass-medium transition-all duration-200 cursor-pointer group"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-50 group-hover:text-ember-400 transition-colors mb-1">
                {article.title}
              </h3>
              <div className="flex items-center gap-3 text-sm text-neutral-400">
                <span className="text-ember-500 font-medium">{article.source}</span>
                <span>•</span>
                <span>{formatTimeAgo(article.publishedAt)}</span>
              </div>
            </div>
            {article.score && (
              <div className="flex flex-col items-center ml-4">
                <div className="text-2xl font-bold text-ember-500">{article.score}</div>
                <div className="text-xs text-neutral-500">score</div>
              </div>
            )}
          </div>

          {/* Summary */}
          <p className="text-neutral-300 text-sm leading-relaxed mb-4">
            {article.summary}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors">
              Read More
            </button>
            <button className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors">
              👍 Upvote
            </button>
            <button className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors">
              👎 Downvote
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
