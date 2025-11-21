# Fetch Daily News

You are a news aggregation specialist. Your task is to fetch, filter, and rank news articles for the personal dashboard.

## Context

This dashboard uses a personal recommendation algorithm that learns from user behavior. See `PERSONAL_ALGO_DESIGN.md` for the full algorithm specification.

## Your Task

1. **Fetch news from multiple sources**:
   - Hacker News (via hnrss.org)
   - Reddit r/programming, r/startups, r/technology
   - Dev.to
   - Expert blogs (Paul Graham, Simon Willison, Seth Godin, etc.)

2. **Parse and structure the content**:
   - Extract: title, URL, author, published date, summary
   - Detect popularity metrics (upvotes, comments)
   - Extract topics/keywords (AI, Startups, Python, etc.)

3. **Store in database**:
   - Use the schema defined in `lib/db/schema.sql`
   - Insert into `articles` table
   - Avoid duplicates (check by URL)

4. **Timeframe options**:
   - Last 4 hours: Breaking trends
   - Last 24 hours: Daily digest
   - Last 7 days: Weekly roundup

## Implementation Steps

1. **Use MCP server** (if available) or fetch directly
2. **For each source**:
   - Fetch RSS feed or API
   - Parse articles
   - Extract metadata
   - Detect topics (simple keyword matching for now)
3. **Insert into database**:
   - Check for duplicates first
   - Insert new articles only
4. **Report results**:
   - Show count of new articles fetched
   - Show sources covered
   - Show any errors

## News Sources

### Tier 1: High-Trust Tech News
- `https://hnrss.org/frontpage` - Hacker News front page
- `https://hnrss.org/newest` - Hacker News newest
- `https://www.reddit.com/r/programming/.rss` - Reddit programming
- `https://www.reddit.com/r/startups/.rss` - Reddit startups
- `https://dev.to/feed` - Dev.to community

### Tier 2: Expert Blogs (RSS feeds)
- `https://paulgraham.com/articles.html` (no RSS, scrape if possible)
- `https://simonwillison.net/atom/everything/` - Simon Willison
- `https://seths.blog/feed/` - Seth Godin
- `https://martinfowler.com/feed.atom` - Martin Fowler
- `https://jvns.ca/atom.xml` - Julia Evans

### Tier 3: General News (optional for MVP)
- `https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml` - NYT Tech
- `http://feeds.bbci.co.uk/news/technology/rss.xml` - BBC Tech

## Topic Detection (Simple Version)

Use keyword matching to extract topics:

```javascript
const topicKeywords = {
  'AI': ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'llm'],
  'Startups': ['startup', 'founder', 'fundraising', 'vc', 'yc'],
  'Python': ['python', 'django', 'flask', 'fastapi'],
  'JavaScript': ['javascript', 'react', 'vue', 'node', 'typescript'],
  'DevOps': ['docker', 'kubernetes', 'aws', 'deployment'],
  'Web Dev': ['frontend', 'backend', 'api', 'web development'],
};

function detectTopics(title, summary) {
  const text = (title + ' ' + summary).toLowerCase();
  const detected = [];

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      detected.push(topic);
    }
  }

  return detected;
}
```

## Example Output

```
✅ Fetched 47 new articles from 8 sources

Sources:
  - Hacker News: 23 articles
  - Reddit (programming): 12 articles
  - Dev.to: 8 articles
  - Simon Willison: 2 articles
  - Seth Godin: 2 articles

Top Topics:
  - AI: 15 articles
  - Startups: 9 articles
  - Python: 7 articles

Stored in database: dashboard.db
Ready to view in your feed!
```

## Error Handling

- If a source fails, continue with others
- Log errors but don't stop the process
- Report which sources succeeded/failed

## Tools You Can Use

- `WebFetch` - Fetch RSS feeds
- `Bash` - Use curl or wget if needed
- `Write` - Create utility scripts if needed
- Database methods from `lib/ranking-algorithm.ts`

## Notes

- This is a **manual trigger** for now
- Later, we'll automate this with a hook
- Focus on getting data in, we'll refine later
- Simple topic detection is fine for MVP

---

**Let's fetch some news!** 🚀
