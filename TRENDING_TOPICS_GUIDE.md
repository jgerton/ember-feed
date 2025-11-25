# Trending Topics Aggregator - Setup & Usage Guide

## Overview

The Trending Topics Aggregator provides **two distinct trending detection systems**:

1. **Hot Now 🔥** - Topics with high engagement RIGHT NOW (popular, lots of mentions)
2. **Trending Up 📈** - Topics GAINING MOMENTUM (velocity-based, early detection)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App (Port 3002)                                    │
│  ├─ Dashboard UI                                            │
│  │  ├─ HotNowWidget (24hr / 3day / 7day)                   │
│  │  └─ TrendingUpWidget (7day / 14day / 30day)             │
│  └─ API Proxy Routes                                        │
│     ├─ /api/trending/fetch                                  │
│     ├─ /api/trending/hot                                    │
│     └─ /api/trending/trending-up                            │
└─────────────────────────────────────────────────────────────┘
                    ↓ Proxies to ↓
┌─────────────────────────────────────────────────────────────┐
│  Aggregator Service (Port 8000) - Python FastAPI            │
│  ├─ Fetchers                                                │
│  │  ├─ Hacker News API (unlimited)                          │
│  │  ├─ Reddit OAuth (60-100 req/min)                        │
│  │  └─ RSS (Google News, Substack, Medium, Tech News)       │
│  ├─ Analyzers                                               │
│  │  ├─ RAKE keyword extraction                              │
│  │  ├─ MinHash+LSH deduplication (~7% duplicates removed)   │
│  │  ├─ Hot scoring (Hacker News algorithm)                  │
│  │  ├─ Historical snapshots (daily keyword frequencies)     │
│  │  └─ Velocity calculation (growth rate detection)         │
│  └─ API Endpoints                                           │
│     ├─ POST /api/fetch (trigger content fetching)           │
│     ├─ GET /api/hot?timeframe=24hr                          │
│     ├─ GET /api/trending-up?timeframe=7day                  │
│     └─ GET /api/feeds (list sources)                        │
└─────────────────────────────────────────────────────────────┘
                    ↓ Stores in ↓
┌─────────────────────────────────────────────────────────────┐
│  SQLite Database (dashboard.db)                             │
│  ├─ HotTopic (15 total: 5 × 3 timeframes)                  │
│  ├─ TrendingUpTopic (15 total: 5 × 3 timeframes)           │
│  ├─ KeywordHistory (daily snapshots for velocity calc)      │
│  └─ FeedSource (curated feed configurations)                │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for Next.js)
- Python 3.12+ (for aggregator service)

### 2. Environment Configuration

Create `.env` file in root directory:

```env
# Database
DATABASE_URL="file:./data/dashboard.db"

# Reddit OAuth (optional but recommended for higher rate limits)
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here

# Aggregator Service URL
AGGREGATOR_URL=http://aggregator:8000
```

#### Getting Reddit OAuth Credentials (Optional)

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Choose "script" as app type
4. Copy `client_id` and `client_secret`
5. Add to `.env` file

**Benefits**: Increases rate limit from 10 req/min to 60-100 req/min

### 3. Start Services

```bash
# Start all services (Next.js, Aggregator, Redis, RSSHub)
docker-compose up -d

# Or start individually
docker-compose up -d aggregator  # Aggregator service
docker-compose up -d rsshub      # RSSHub (for sources without RSS)
docker-compose up -d redis       # Redis cache
docker-compose up -d app         # Next.js app
```

### 4. Verify Services

Check that all services are running:

```bash
# Check service status
docker-compose ps

# Check aggregator health
curl http://localhost:8000/health

# Check Next.js app
curl http://localhost:3002
```

## Usage

### Trigger Content Fetching

The aggregator service needs to fetch content before trending topics appear. This runs as a background job.

#### Via API

```bash
# Trigger fetch from all sources
curl -X POST http://localhost:3002/api/trending/fetch

# Response
{
  "job_id": "uuid-here",
  "status": "started",
  "message": "Fetching content from sources in background"
}

# Check job status
curl http://localhost:3002/api/trending/fetch?jobId=uuid-here
```

#### Via Dashboard

1. Navigate to http://localhost:3002
2. Find the "Hot Now" or "Trending Up" widgets
3. Click "Refresh" button to trigger fetch

### View Hot Now Topics

**Hot Now** shows topics with high engagement RIGHT NOW (based on Hacker News algorithm).

#### Via API

```bash
# Get hot topics for last 24 hours
curl http://localhost:3002/api/trending/hot?timeframe=24hr&limit=5

# Get hot topics for last 3 days
curl http://localhost:3002/api/trending/hot?timeframe=3day&limit=5

# Get hot topics for last 7 days
curl http://localhost:3002/api/trending/hot?timeframe=7day&limit=5
```

#### Via Dashboard

1. Navigate to dashboard
2. Find "Hot Now 🔥" widget
3. Click timeframe tabs: **24 Hours** | **3 Days** | **7 Days**
4. View top 5 topics with mentions, sources, and summaries

### View Trending Up Topics

**Trending Up** shows topics GAINING MOMENTUM (velocity-based, compares current vs historical volume).

**Note**: Requires 1-2 weeks of historical data for accurate results.

#### Via API

```bash
# Get trending up topics (7-day comparison)
curl http://localhost:3002/api/trending/trending-up?timeframe=7day&limit=5

# 14-day comparison
curl http://localhost:3002/api/trending/trending-up?timeframe=14day&limit=5

# 30-day comparison
curl http://localhost:3002/api/trending/trending-up?timeframe=30day&limit=5
```

#### Via Dashboard

1. Navigate to dashboard
2. Find "Trending Up 📈" widget
3. Click timeframe tabs: **7 Days** | **14 Days** | **30 Days**
4. View top 5 topics with velocity, growth %, and summaries

## Adding Widgets to Dashboard

### Import Components

```tsx
import HotNowWidget from '@/components/HotNowWidget'
import TrendingUpWidget from '@/components/TrendingUpWidget'
```

### Add to Layout

```tsx
// In your dashboard layout (e.g., app/page.tsx or layout component)
export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Hot Now */}
      <HotNowWidget />

      {/* Right Column: Trending Up */}
      <TrendingUpWidget />
    </div>
  )
}
```

## Data Sources

### Currently Integrated (Zero Cost)

1. **Hacker News** (Firebase API)
   - Rate Limit: Unlimited
   - Update Frequency: 30 minutes
   - Quality: High (tech-focused)

2. **Reddit** (JSON API with OAuth)
   - Rate Limit: 60-100 req/min (with OAuth)
   - Subreddits: technology, programming, worldnews, business, startups
   - Quality: Good (community-voted)

3. **Google News** (RSS)
   - Rate Limit: Unlimited (personal use)
   - Topics: General news, technology, business, science
   - Quality: High (aggregates major sources)

4. **Substack Newsletters** (RSS)
   - Top newsletters: ByteByteGo, Pragmatic Engineer, Lenny's Newsletter
   - Quality: Very High (curated, expert content)

5. **Medium Publications** (RSS)
   - Top publications: Better Programming, The Startup, Towards Data Science
   - Quality: High (editorial standards)

6. **Tech News Sites** (RSS)
   - TechCrunch, The Verge, Ars Technica
   - Quality: Very High (professional journalism)

### Excluded (Cost)

- **Twitter/X**: Minimum $100/month (Basic tier)
- Not feasible for zero-cost solution

## Algorithms Explained

### Hot Now Scoring (Hacker News Algorithm)

```
Score = (Engagement - 1) / (Hours_Elapsed + 2)^1.8

Where:
- Engagement = upvotes/score/comments
- Hours_Elapsed = time since publication
- 1.8 = gravity (controls decay rate)
```

**Result**: Recent posts with high engagement rank higher.

### Trending Up Velocity Calculation

```
Velocity = (Current_Volume - Historical_Average) / Time_Period
Percent_Growth = ((Current - Previous) / Previous) × 100

Minimum Threshold: 50% growth
Minimum Current Volume: 5 mentions
```

**Result**: Topics with fastest growth rate rank higher.

### Keyword Extraction (RAKE Algorithm)

- Extracts 3-word phrases from article titles and content
- Calculates term frequency across all sources
- Filters by minimum frequency (2+ mentions)
- Outputs top 50 keywords per fetch

### Deduplication (MinHash + LSH)

- Identifies near-duplicate articles across sources
- Typical deduplication rate: ~7%
- Similarity threshold: 50%

## Maintenance & Monitoring

### Scheduled Tasks

**Daily Snapshot** (Recommended):
```bash
# Create cron job to run daily at 2 AM
0 2 * * * curl -X POST http://localhost:3002/api/trending/fetch
```

**Hourly Fetch** (Optional for real-time):
```bash
# Fetch every hour
0 * * * * curl -X POST http://localhost:3002/api/trending/fetch
```

### Database Cleanup

Historical snapshots accumulate over time. Clean up old data periodically:

```python
# In aggregator service (future enhancement)
# Keep last 90 days of snapshots
await snapshot_service.cleanup_old_snapshots(keep_days=90)
```

### Logs

Check aggregator service logs:

```bash
# Follow logs
docker-compose logs -f aggregator

# Last 100 lines
docker-compose logs --tail=100 aggregator
```

## Troubleshooting

### No Trending Topics Showing

**Problem**: Empty trending lists

**Solutions**:
1. Trigger fetch: `curl -X POST http://localhost:3002/api/trending/fetch`
2. Wait 2-3 minutes for background job to complete
3. Check aggregator logs: `docker-compose logs aggregator`

### Trending Up Shows "Requires Historical Data"

**Problem**: Not enough data for velocity calculation

**Solution**: Trending Up requires 1-2 weeks of daily snapshots. Keep fetching daily and it will improve over time.

### Reddit Rate Limits

**Problem**: Hitting Reddit rate limits (10 req/min)

**Solutions**:
1. Add Reddit OAuth credentials to `.env`
2. Restart aggregator service: `docker-compose restart aggregator`
3. Rate limit increases to 60-100 req/min

### Aggregator Service Won't Start

**Problem**: Python dependencies or port conflicts

**Solutions**:
1. Check logs: `docker-compose logs aggregator`
2. Rebuild: `docker-compose build aggregator`
3. Check port 8000 is not in use: `lsof -i :8000` (Mac/Linux)

## Performance

### Resource Usage

- **Aggregator Service**: 512MB-1GB RAM, 1 vCPU
- **RSSHub**: 256MB-512MB RAM, 0.5 vCPU
- **Redis**: 256MB RAM
- **Total Added**: ~1-2GB RAM, ~1.5-2 vCPU

### Fetch Duration

Single fetch cycle (all sources):
- Hacker News: ~10-15 seconds (100 stories)
- Reddit: ~20-30 seconds (7 subreddits)
- RSS Feeds: ~30-45 seconds (40+ feeds)
- Processing (dedup, keywords, scoring): ~10 seconds
- **Total**: ~70-100 seconds per fetch

### Caching

- Hot Now: 15 minutes cache
- Trending Up: 30 minutes cache
- Reduces load on aggregator service

## Future Enhancements

### Phase 7 (Optional)

- [ ] Seed database with 50-100 curated feeds
- [ ] User feed management UI (browse, subscribe, add custom)
- [ ] `/trending` slash command for CLI access
- [ ] Email/webhook notifications for specific trending keywords
- [ ] Personalized trending (filter by user's subscribed feeds)
- [ ] Historical trend charts (visualize topic growth over time)
- [ ] Export trending topics as CSV/JSON

## API Reference

### POST /api/trending/fetch

Trigger content fetching from all sources.

**Response**:
```json
{
  "job_id": "uuid",
  "status": "started",
  "message": "Fetching content from sources in background"
}
```

### GET /api/trending/hot

Get hot topics.

**Query Parameters**:
- `timeframe`: "24hr" | "3day" | "7day" (required)
- `limit`: Number of topics (default: 5)

**Response**:
```json
{
  "timeframe": "24hr",
  "topics": [
    {
      "rank": 1,
      "keyword": "GPT-5",
      "score": 94.5,
      "mentions": 47,
      "sources": ["HackerNews", "Reddit", "Medium"],
      "summary": "OpenAI announces GPT-5...",
      "sample_articles": [...]
    }
  ]
}
```

### GET /api/trending/trending-up

Get trending up topics.

**Query Parameters**:
- `timeframe`: "7day" | "14day" | "30day" (required)
- `limit`: Number of topics (default: 5)

**Response**:
```json
{
  "timeframe": "7day",
  "topics": [
    {
      "rank": 1,
      "keyword": "Rust async",
      "velocity": 12.5,
      "current_volume": 150,
      "previous_volume": 12,
      "percent_growth": 1150.0,
      "summary": "Rapid adoption of async Rust...",
      "sources": [...]
    }
  ]
}
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs aggregator`
2. Review this guide
3. Check API responses for error messages

---

**Built with**: Python FastAPI, Next.js, RAKE NLP, MinHash+LSH, Hacker News Algorithm
**Total Cost**: $0/month (all free sources)
