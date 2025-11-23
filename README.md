# Ember Feed

A modern, AI-powered personal news dashboard with ML-based article ranking, smart recommendations, and feed diversity controls. Built with Next.js 16, React 19, and Tailwind CSS 4.

![Dashboard Preview](./docs/screenshot.png) <!-- Add screenshot later -->
Coming soon, screenshot for dashboard preview.

## Features

### Core Features
- **ML-Powered Ranking**: Personalized article scoring based on reading behavior and preferences
- **Smart Recommendations**: Content-based filtering with 5 scoring signals (similarity, topic affinity, source preferences, serendipity, recency)
- **Feed Diversity Algorithm**: Prevents echo chambers with configurable diversity levels (low/medium/high)
- **Daily Digest Card**: Curated highlights showing top articles, tasks, and trending topics
- **Topic Classification**: Automatic topic extraction and filtering with relevance scoring
- **RSS Feed Health Tracking**: Monitors feed reliability with automatic quarantine for broken sources
- **Read-Later Queue**: Priority-based article bookmarking with dedicated reading view
- **Full-Text Search**: Fast article search across titles and descriptions
- **Developer Journal**: Log discoveries, accomplishments, blockers, and thoughts
- **Analytics Dashboard**: Reading patterns, topic engagement, and activity tracking

### UI/UX
- **Glassmorphic Design**: Modern frosted-glass aesthetic with dark theme
- **Collapsible Sections**: User-controlled visibility for all major components
- **Real-Time Updates**: Live data refresh without page reloads
- **Responsive Layout**: Optimized for desktop and mobile viewing
- **Hot Reload**: Instant feedback during development
- **Dockerized**: Containerized development environment

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes (App Router)
- **Database**: Prisma ORM with SQLite (development) / PostgreSQL (production ready)
- **Containerization**: Docker + Docker Compose
- **News Sources**: RSS feeds (Hacker News, Reddit, Dev.to)
- **Type Safety**: TypeScript with strict mode
- **Testing**: Playwright for end-to-end tests

## Quick Start

Choose your preferred method:

### Option 1: Run with Docker (Recommended)

**Prerequisites**: Docker Desktop installed

```bash
# Clone the repository
git clone https://github.com/jgerton/ember-feed.git
cd ember-feed

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Open browser
http://localhost:3002
```

**That's it!** Hot reload is enabled automatically.

**Stop the application:**
```bash
docker-compose down
```

---

### Option 2: Run Locally (Without Docker)

**Prerequisites**: Node.js 20+ installed

```bash
# Clone the repository
git clone https://github.com/jgerton/ember-feed.git
cd ember-feed

# Install dependencies
npm install

# Set up Prisma database
npx prisma generate
npx prisma migrate dev

# Run development server
npm run dev

# Open browser
http://localhost:3000  # or check console for actual port
```

## Development

### Project Structure

```
ember-feed/
├── app/                    # Next.js 16 app directory (App Router)
│   ├── api/               # API routes
│   │   ├── analytics/     # User activity analytics
│   │   ├── articles/      # Article CRUD and listing
│   │   ├── digest/        # Daily digest aggregation
│   │   ├── feeds/         # RSS feed management
│   │   ├── log/           # Developer journal entries
│   │   ├── recommendations/ # Smart article recommendations
│   │   ├── saved-articles/ # Read-later queue
│   │   ├── search/        # Full-text article search
│   │   ├── settings/      # User preferences (diversity level)
│   │   ├── sync/          # Manual RSS sync trigger
│   │   ├── todos/         # Todo CRUD endpoints
│   │   └── topics/        # Topic filtering and stats
│   ├── read-later/        # Read-later page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React client components
│   ├── AnalyticsDashboard.tsx  # Reading stats and charts
│   ├── DailyDigest.tsx         # Daily highlights card
│   ├── DailySummary.tsx        # Quick stats overview
│   ├── DeveloperJournal.tsx    # Log entry interface
│   ├── FeedAdmin.tsx           # RSS feed management UI
│   ├── NewsWidget.tsx          # Main article feed
│   ├── SearchBar.tsx           # Article search interface
│   ├── ThemeToggle.tsx         # Theme switcher
│   └── TodoList.tsx            # Task management
├── lib/                   # Utilities and services
│   ├── db.ts             # Prisma client initialization
│   ├── cronService.ts    # RSS feed polling (every 30 min)
│   ├── feedHealthService.ts  # RSS health monitoring
│   ├── feedService.ts    # RSS parsing and ingestion
│   ├── rankingService.ts # ML ranking, recommendations, diversity
│   └── topicExtraction.ts # Automatic topic classification
├── prisma/               # Database layer
│   ├── schema.prisma     # Database schema (8 models)
│   ├── migrations/       # Migration history
│   └── dev.db           # SQLite database (development)
├── scripts/              # Utility scripts
│   ├── addBadFeed.ts     # Test feed health monitoring
│   ├── benchmark-queries.ts  # Performance testing
│   └── check-analytics.ts    # Verify analytics data
├── tests/                # E2E tests
│   └── homepage.spec.ts  # Playwright tests
├── hooks/                # Custom React hooks
│   └── useDebounce.ts    # Debounced input helper
├── Dockerfile            # Development Docker image
├── docker-compose.yml    # Docker orchestration
├── next.config.ts        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS 4 configuration
└── instrumentation.ts    # Next.js instrumentation (cron init)
```

### Hot Reload Configuration

Hot reload works automatically in both Docker and local setups:

**Docker (Windows/Mac):**
- Uses file polling (checks every 1 second)
- Configured in `next.config.js` with `watchOptions.poll`

**Local:**
- Uses native file watching (inotify)
- Faster than Docker on Linux

### Adding New Features

1. Create component in `components/`
2. Add API route in `app/api/[feature]/route.ts` if needed
3. Update Prisma schema if database changes required
4. Run `npx prisma migrate dev` to create migration
5. Restart Docker container to pick up new routes
6. Update home page in `app/page.tsx`

## API Documentation

All API endpoints return JSON responses. Base URL: `http://localhost:3002/api`

### Articles

**GET /api/articles**
- Returns paginated, ranked list of articles
- Query params:
  - `limit` (number): Max articles to return (default: 20)
  - `personalized` (boolean): Enable ML ranking (default: false)
  - `topic` (string): Filter by topic slug
- Response: Array of articles with topics, score, and metadata

**Example:**
```bash
curl "http://localhost:3002/api/articles?limit=10&personalized=true&topic=ai"
```

### Recommendations

**GET /api/recommendations**
- Returns personalized article recommendations based on reading history
- Filters out already-read articles automatically
- Query params:
  - `limit` (number): Max recommendations (default: 10, max: 50)
- Response: Articles with recommendation metadata (score, reason, breakdown)

**Example:**
```bash
curl "http://localhost:3002/api/recommendations?limit=5"
```

**Response structure:**
```json
{
  "recommendations": [
    {
      "id": "...",
      "title": "Article Title",
      "url": "https://...",
      "source": "Hacker News",
      "score": 90,
      "recommendation": {
        "score": 95,
        "reason": "Similar to articles you upvoted",
        "breakdown": {
          "similarityScore": 70,
          "topicAffinityScore": 8,
          "sourceAffinityScore": 10,
          "serendipityBonus": 0,
          "recencyBonus": 15
        }
      }
    }
  ],
  "count": 5
}
```

### Daily Digest

**GET /api/digest**
- Aggregates daily highlights from last 24 hours
- Response includes:
  - `topArticles`: Top 5 personalized articles
  - `unreadTodos`: Pending tasks
  - `logs`: Discoveries, accomplishments, blockers, thoughts
  - `trendingTopics`: Most common topics with article counts
  - `stats`: New article count, todo count, log entry count

**Example:**
```bash
curl "http://localhost:3002/api/digest"
```

### Settings

**GET /api/settings**
- Get user settings (currently: diversity level)

**PATCH /api/settings**
- Update diversity level
- Body: `{ "diversityLevel": "low" | "medium" | "high" }`

**Example:**
```bash
curl -X PATCH http://localhost:3002/api/settings \
  -H "Content-Type: application/json" \
  -d '{"diversityLevel":"high"}'
```

**Diversity Levels:**
- **Low**: Allows up to 5 articles from same source (lenient)
- **Medium**: Allows up to 3 articles from same source (balanced, default)
- **High**: Allows up to 2 articles from same source (strict diversity)

### Topics

**GET /api/topics**
- List all topics with article counts
- Response: Array of topics with slug, name, article count

### Search

**GET /api/search**
- Full-text search across article titles and descriptions
- Query params:
  - `q` (string, required): Search query
  - `limit` (number): Max results (default: 20)

**Example:**
```bash
curl "http://localhost:3002/api/search?q=machine+learning&limit=10"
```

### Analytics

**GET /api/analytics**
- Returns user activity statistics
- Response includes:
  - Total activities by type (read, upvote, downvote, save)
  - Top topics by engagement
  - Source distribution
  - Reading timeline

### Saved Articles (Read-Later)

**GET /api/saved-articles**
- List all saved articles ordered by priority and date

**POST /api/saved-articles**
- Save an article for later reading
- Body: `{ "articleId": "...", "priority": 1-5, "notes": "..." }`

**DELETE /api/saved-articles/:id**
- Remove article from read-later queue

### Todos

**GET /api/todos**
- List all todos

**POST /api/todos**
- Create new todo
- Body: `{ "text": "Task description" }`

**PATCH /api/todos/:id**
- Update todo (mark complete/incomplete)
- Body: `{ "completed": true/false }`

**DELETE /api/todos/:id**
- Delete todo

### RSS Feeds

**GET /api/feeds**
- List all configured RSS feeds with health status

**POST /api/sync**
- Manually trigger RSS feed sync (normally runs every 30 minutes)

### Database

**Development**: SQLite (`./dev.db`)
**Production**: PostgreSQL (configure in `.env.local`)

```bash
# View SQLite database
sqlite3 dev.db
sqlite> .tables
sqlite> SELECT * FROM todos;
```

## Docker Commands

### Development

```bash
# Start containers
docker-compose up -d

# Rebuild after dependency changes
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Execute command in container
docker-compose exec app sh
docker-compose exec app npm run lint

# Restart containers
docker-compose restart
```

### Production Build

```bash
# Build production image
docker build -f Dockerfile.prod -t my-dashboard:prod .

# Run production container
docker run -p 3000:3000 my-dashboard:prod
```

### Troubleshooting Docker

**Hot reload not working?**
1. Ensure files are saved on host (not inside container)
2. Check `docker-compose.yml` has volume mount: `- .:/app`
3. Verify `next.config.js` has `watchOptions.poll: 1000`

**Slow performance?**
1. Check Docker Desktop resource allocation (Settings → Resources)
2. Ensure WSL 2 backend is enabled (Windows)
3. Consider using local setup for development

**Port already in use?**
```bash
# Find process using port 3000
netstat -ano | findstr :3000  # Windows
lsof -ti:3000                 # Mac/Linux

# Kill process or change port in docker-compose.yml
```

## Deployment

### Deploy to Vercel (Easiest)

```bash
npm install -g vercel
vercel
```

### Deploy to Fly.io (Docker-based)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
flyctl launch
flyctl deploy
```

### Self-Hosted (VPS)

```bash
# On server
git clone https://github.com/jgerton/ember-feed.git
cd ember-feed

# Build production image
docker build -f Dockerfile.prod -t my-dashboard:prod .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# News API (optional - get free key at https://newsapi.org)
NEWS_API_KEY=your_api_key_here

# RSS Feeds (comma-separated)
RSS_FEEDS=https://hnrss.org/frontpage,https://www.reddit.com/r/technology/.rss

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/dashboard
```

### Adding RSS Feeds

Edit `.env.local`:
```env
RSS_FEEDS=https://hnrss.org/frontpage,https://www.reddit.com/r/technology/.rss,https://dev.to/feed
```

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js 16 App (React 19)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐    │
│  │ Daily    │ │ News     │ │ Search   │ │ Developer      │    │
│  │ Digest   │ │ Feed     │ │ Bar      │ │ Journal        │    │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐    │
│  │ Daily    │ │ Todo     │ │ Feed     │ │ Analytics      │    │
│  │ Summary  │ │ List     │ │ Admin    │ │ Dashboard      │    │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ API Routes (Next.js App Router)
┌───────────────────────────▼─────────────────────────────────────┐
│                     Next.js API Routes                          │
│  /articles  /recommendations  /digest  /settings  /search       │
│  /topics    /saved-articles   /todos   /analytics /feeds        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Business Logic Layer                         │
│  ┌─────────────────┐ ┌──────────────┐ ┌─────────────────────┐ │
│  │ rankingService  │ │ feedService  │ │ feedHealthService   │ │
│  │                 │ │              │ │                     │ │
│  │ • buildUserProfile()             │ │ • parseFeed()       │ │
│  │ • calculatePersonalizedScores()  │ │ • extractArticles() │ │
│  │ • applyDiversityReranking()      │ │ • checkHealth()     │ │
│  │ • getRecommendations()           │ │ • quarantineFeed()  │ │
│  │ • getPersonalizedFeed()          │ │                     │ │
│  └─────────────────┘ └──────────────┘ └─────────────────────┘ │
│  ┌──────────────────┐ ┌─────────────────────────────────────┐ │
│  │ topicExtraction  │ │ cronService (runs every 30 min)     │ │
│  │ • extractTopics()│ │ • syncAllFeeds()                    │ │
│  └──────────────────┘ └─────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Prisma ORM
┌───────────────────────────▼─────────────────────────────────────┐
│                    SQLite Database (8 Models)                   │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────┐              │
│  │ Article    │ │ Topic       │ │ ArticleTopic │              │
│  │            │ │             │ │ (relation)   │              │
│  └────────────┘ └─────────────┘ └──────────────┘              │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────┐              │
│  │ UserActivity│ │SavedArticle│ │ UserSettings │              │
│  │ (tracking) │ │(read-later) │ │ (diversity)  │              │
│  └────────────┘ └─────────────┘ └──────────────┘              │
│  ┌────────────┐ ┌─────────────┐                               │
│  │ RssFeed    │ │ LogEntry    │ │ Todo         │              │
│  │ (health)   │ │ (journal)   │ │              │              │
│  └────────────┘ └─────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### ML Ranking Pipeline

```
1. RSS Feed Ingestion (cronService)
   ↓
2. Topic Classification (topicExtraction)
   ↓
3. User Profile Building (buildUserProfile)
   • Analyzes read/upvote/save activities
   • Builds source preferences map
   • Identifies top keywords from engaged articles
   ↓
4. Personalized Scoring (calculatePersonalizedScores)
   • Source preference score (0-50)
   • Keyword relevance score (0-30)
   • Base score from RSS (0-100)
   • Final combined score (0-100)
   ↓
5. Diversity Re-ranking (applyDiversityReranking)
   • Tracks source & topic usage
   • Applies progressive penalties for over-representation
   • Ensures balanced distribution
   ↓
6. Final Feed (getPersonalizedFeed)
   • Articles ranked by diversity-optimized scores
   • Ready for display
```

### Recommendation Engine Flow

```
1. Analyze User Behavior
   • Last 20 upvoted/saved articles
   • Top 5 topics by engagement
   • Source preference distribution
   ↓
2. Score Candidate Articles (5 signals)
   • Similarity: Keyword/topic overlap with liked articles (0-100)
   • Topic Affinity: Matches user's favorite topics (0-40)
   • Source Affinity: Prefers user's preferred sources (0-15)
   • Serendipity: Bonus for new quality sources (0-20)
   • Recency: Fresh content boost (0-15)
   ↓
3. Filter & Rank
   • Remove already-read articles
   • Apply minimum threshold (score > 10)
   • Sort by total score
   ↓
4. Return Recommendations
   • Top N articles with scores & reasons
```

### RSS Feed Health Monitoring

```
1. Periodic Health Checks (every sync)
   ↓
2. Track Metrics
   • Consecutive failures
   • Last successful fetch
   • Total article yield
   ↓
3. Quarantine Decision
   • 3+ consecutive failures → Quarantine
   • Stops polling quarantined feeds
   ↓
4. Manual Override
   • Admin can restore via Feed Admin UI
```

## Contributing

This is a personal project, but feel free to fork and customize!

## License

MIT License - feel free to use this for your own dashboard!

## Roadmap

### Completed ✅
- [x] Phase 1: Core dashboard layout
- [x] Phase 2: RSS feed aggregation with health monitoring
- [x] ML-powered personalized ranking algorithm
- [x] Smart article recommendations engine
- [x] Feed diversity algorithm to prevent echo chambers
- [x] Topic classification and filtering
- [x] Read-later queue with priorities
- [x] Full-text article search
- [x] Daily digest card (replaced email digest)
- [x] Developer journal for logging
- [x] Analytics dashboard
- [x] Dark theme (glassmorphic UI)
- [x] Collapsible UI sections

### In Progress 🚧
- [ ] Jon-OS Integration: Insight Mining (#24)
  - Extract insights from articles for daily log
  - Auto-tag discoveries and blockers
  - Integration with existing log entry system

### Planned 📋
- [ ] Mobile responsive design improvements
- [ ] Export data to CSV/JSON
- [ ] Browser extension for quick article saving
- [ ] Dedicated recommendations page UI
- [ ] Performance optimizations (caching, indexes)
- [ ] PostgreSQL migration for production
- [ ] Email notifications (optional, for digest)
- [ ] Multi-user support
- [ ] API rate limiting
- [ ] Integration tests for all endpoints

## Acknowledgments

- Design inspiration from Dribbble glassmorphism examples
- News aggregation patterns from System Design Framework
- Docker best practices from Docker Mastery course

---

**Built with ❤️ using Next.js and Docker**
