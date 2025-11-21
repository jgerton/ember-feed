# Ember Feed

A modern, glassmorphic personal dashboard with news aggregation, todo list, and daily summaries. Built with Next.js, React, and TailwindCSS.

![Dashboard Preview](./docs/screenshot.png) <!-- Add screenshot later -->
Coming soon, screenshot for dashboard preview.

## Features

- **News Aggregation**: Multi-timeframe trending topics (4 hours, 24 hours, 7 days)
- **Todo List**: Simple task management with SQLite persistence
- **Daily Summary**: Customizable daily overview widget
- **Glassmorphic UI**: Modern, frosted-glass aesthetic
- **Hot Reload**: Instant feedback during development
- **Dockerized**: Run with or without Docker

## Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (development) / PostgreSQL (production)
- **Containerization**: Docker + Docker Compose
- **News Sources**: RSS feeds, NewsAPI

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
http://localhost:3000
```

**That's it!** Hot reload is enabled automatically.

**Stop the application:**
```bash
docker-compose down
```

---

### Option 2: Run Locally (Without Docker)

**Prerequisites**: Node.js 18+ installed

```bash
# Clone the repository
git clone https://github.com/jgerton/ember-feed.git
cd ember-feed

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev

# Open browser
http://localhost:3000
```

## Development

### Project Structure

```
ember-feed/
├── app/                    # Next.js 14 app directory
│   ├── api/               # API routes
│   │   ├── todos/         # Todo CRUD endpoints
│   │   └── news/          # News aggregation endpoints
│   ├── components/        # React components
│   │   ├── DailySummary.tsx
│   │   ├── TodoList.tsx
│   │   ├── NewsWidget.tsx
│   │   └── TrendingTopics.tsx
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/                   # Utilities
│   ├── db.ts             # Database connection
│   ├── rss-parser.ts     # RSS feed parser
│   └── trending.ts       # Trend detection algorithm
├── public/               # Static assets
├── prisma/               # Database schema (if using Prisma)
├── Dockerfile            # Development Docker image
├── Dockerfile.prod       # Production Docker image
├── docker-compose.yml    # Docker orchestration
└── next.config.js        # Next.js configuration
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

1. Create component in `app/components/`
2. Add API route in `app/api/` if needed
3. Update home page in `app/page.tsx`

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

```
┌─────────────────────────────────────────┐
│         Next.js Dashboard (React)       │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Todo    │ │ Daily   │ │ News     │  │
│  │ Widget  │ │ Summary │ │ Trending │  │
│  └─────────┘ └─────────┘ └──────────┘  │
└─────────────────┬───────────────────────┘
                  │ API Routes
┌─────────────────▼───────────────────────┐
│        Next.js API Routes               │
│  /api/todos      /api/news              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         SQLite Database                 │
│  • todos                                │
│  • news_articles (timestamp, source)    │
│  • daily_summaries                      │
└─────────────────────────────────────────┘
```

## News Aggregation Strategy

**Timeframes:**
- **4 hours**: Breaking trends, updated every 30 minutes
- **24 hours**: Daily trending topics, updated every 2 hours
- **7 days**: Weekly trends, updated daily

**Trending Algorithm:**
```javascript
// Simplified version
function getTrending(timeframeHours) {
  const articles = getArticlesInTimeframe(timeframeHours);
  const keywords = extractKeywords(articles);
  return rankByFrequency(keywords);
}
```

## Contributing

This is a personal project, but feel free to fork and customize!

## License

MIT License - feel free to use this for your own dashboard!

## Roadmap

- [ ] Phase 1: Core dashboard layout
- [ ] Phase 2: News aggregation
- [ ] Phase 3: Polish & portfolio prep
- [ ] Add email summary feature
- [ ] Mobile responsive design
- [ ] Dark/light theme toggle
- [ ] Export data to CSV
- [ ] Browser extension

## Acknowledgments

- Design inspiration from Dribbble glassmorphism examples
- News aggregation patterns from System Design Framework
- Docker best practices from Docker Mastery course

---

**Built with ❤️ using Next.js and Docker**
