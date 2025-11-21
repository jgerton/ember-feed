# Personal Recommendation Algorithm Design

Your dashboard's intelligent content ranking system that learns from your behavior.

## Overview

A personalized news feed algorithm that:
- Tracks what you read vs. skip
- Learns from explicit ratings (👍/👎)
- Adjusts source credibility over time
- Surfaces relevant content based on your interests
- Gets smarter the more you use it

## Core Concept

**Traditional algorithms** optimize for engagement (addiction).
**Your personal algo** optimizes for value (what YOU actually want to read).

---

## Data Collection (Engagement Signals)

### Implicit Signals (Automatic)

1. **Click Tracking**
   - Article clicked = positive signal
   - Article ignored = neutral/negative signal
   - Track: timestamp, article_id, source

2. **Dwell Time** (how long you read)
   - < 10 seconds = accidental click (negative)
   - 10-60 seconds = skimmed (neutral)
   - 60-300 seconds = read (positive)
   - > 300 seconds = deep read (very positive)

3. **Scroll Depth** (optional future enhancement)
   - Did you scroll to bottom?
   - Indicates genuine interest

### Explicit Signals (User-triggered)

1. **Ratings**
   - 👍 Upvote = boost similar content
   - 👎 Downvote = suppress similar content
   - ⭐ Save for later = very positive signal

2. **Source Feedback**
   - "Show me more from this source"
   - "Show me less from this source"
   - "Block this source"

3. **Topic Preferences** (optional)
   - User tags articles with interests
   - Or: auto-extract topics via NLP

---

## Ranking Algorithm

### Initial Score (Cold Start)

When you first start, we don't know your preferences yet.

```javascript
initialScore = (recency * 0.4) + (popularity * 0.3) + (source_trust * 0.3)
```

**Recency**: Time decay function
- Last 4 hours: 1.0
- Last 24 hours: 0.7
- Last 7 days: 0.4
- Older: 0.1

**Popularity**: Upvotes, comments, shares (from source)
- Normalized to 0-1 scale

**Source Trust**: Initial credibility score
- Tier 1 (Hacker News, NYT, BBC): 1.0
- Tier 2 (Dev.to, Medium): 0.8
- Tier 3 (Unknown blogs): 0.5

### Personalized Score (After Learning)

After collecting engagement data:

```javascript
personalizedScore =
  (recency * w1) +           // Time relevance
  (popularity * w2) +         // Social proof
  (source_weight * w3) +      // Learned source preference
  (topic_match * w4) +        // Interest alignment
  (author_weight * w5)        // Learned author preference

// Weights adjust over time based on what predicts YOUR engagement
// Start with: w1=0.2, w2=0.2, w3=0.25, w4=0.25, w5=0.1
```

**Source Weight**: Learned from your behavior
```javascript
source_weight = (
  (clicks_on_source / impressions) * 0.4 +
  (avg_read_time / max_read_time) * 0.3 +
  (upvotes - downvotes) * 0.3
)
```

**Topic Match**: How well does this match your interests?
```javascript
// Extract topics from article (ML or keyword matching)
article_topics = ["AI", "Startups", "Python"]

// Compare to your top topics (from reading history)
user_top_topics = getTopTopics(user_reading_history, limit=10)

topic_match = similarity(article_topics, user_top_topics)
```

**Author Weight**: Some authors you always read
```javascript
author_weight = (
  articles_read_from_author / articles_seen_from_author
)
```

---

## Learning System

### Updating Weights (Daily Batch)

Every day, analyze yesterday's engagement:

```python
def update_source_weights(user_id):
    """Update source credibility based on user engagement"""

    sources = get_all_sources()

    for source in sources:
        # Get engagement metrics
        impressions = count_articles_shown(source, user_id, last_24h)
        clicks = count_articles_clicked(source, user_id, last_24h)
        avg_dwell_time = calculate_avg_dwell_time(source, user_id, last_24h)
        ratings = get_ratings(source, user_id, last_24h)

        # Calculate engagement rate
        ctr = clicks / impressions if impressions > 0 else 0

        # Calculate rating score (-1 to +1)
        rating_score = (ratings.upvotes - ratings.downvotes) / ratings.total

        # Normalize dwell time (0 to 1)
        dwell_score = min(avg_dwell_time / 180, 1.0)  # 180s = ideal

        # Combined weight
        new_weight = (ctr * 0.4) + (dwell_score * 0.3) + (rating_score * 0.3)

        # Smooth update (don't change too fast)
        old_weight = get_source_weight(source, user_id)
        final_weight = (old_weight * 0.7) + (new_weight * 0.3)

        # Save to database
        update_source_weight(source, user_id, final_weight)
```

### Topic Modeling (Weekly Batch)

Every week, analyze your reading patterns:

```python
def update_topic_preferences(user_id):
    """Learn which topics user engages with most"""

    # Get all articles user engaged with (clicked, read, rated)
    engaged_articles = get_engaged_articles(user_id, last_7_days)

    # Extract topics from those articles
    all_topics = []
    for article in engaged_articles:
        topics = extract_topics(article.content)
        weight = calculate_engagement_score(article)
        all_topics.extend([(topic, weight) for topic in topics])

    # Aggregate by topic
    topic_scores = aggregate_weighted_topics(all_topics)

    # Store top 20 topics for user
    save_user_topic_preferences(user_id, topic_scores[:20])
```

---

## Database Schema

### Tables

```sql
-- Articles fetched from sources
CREATE TABLE articles (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    content TEXT,
    summary TEXT,
    source TEXT NOT NULL,           -- "ycombinator", "nytimes", etc.
    author TEXT,
    published_at TIMESTAMP NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    popularity_score REAL DEFAULT 0,  -- Upvotes, shares from source
    topics TEXT                       -- JSON array: ["AI", "Startups"]
);

-- User engagement tracking
CREATE TABLE article_engagement (
    id INTEGER PRIMARY KEY,
    article_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,      -- For multi-user support later

    -- Implicit signals
    impression_at TIMESTAMP,         -- When shown in feed
    clicked_at TIMESTAMP,            -- When user clicked
    dwell_time INTEGER,              -- Seconds spent reading
    scroll_depth REAL,               -- Percentage scrolled (0-1)

    -- Explicit signals
    rating INTEGER,                  -- -1 (downvote), 0 (none), 1 (upvote)
    saved BOOLEAN DEFAULT FALSE,     -- Bookmarked for later

    FOREIGN KEY (article_id) REFERENCES articles(id)
);

-- Source weights (learned preferences)
CREATE TABLE source_weights (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL,
    user_id INTEGER DEFAULT 1,

    -- Engagement metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    total_dwell_time INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,

    -- Calculated weight
    weight REAL DEFAULT 0.5,         -- 0 (never show) to 1 (always show)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(source, user_id)
);

-- Topic preferences (learned interests)
CREATE TABLE topic_preferences (
    id INTEGER PRIMARY KEY,
    user_id INTEGER DEFAULT 1,
    topic TEXT NOT NULL,

    -- Engagement with this topic
    articles_seen INTEGER DEFAULT 0,
    articles_clicked INTEGER DEFAULT 0,
    total_dwell_time INTEGER DEFAULT 0,

    -- Calculated preference
    preference_score REAL DEFAULT 0.5,  -- 0 (not interested) to 1 (very interested)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(topic, user_id)
);

-- Author preferences (favorite writers)
CREATE TABLE author_weights (
    id INTEGER PRIMARY KEY,
    author TEXT NOT NULL,
    user_id INTEGER DEFAULT 1,

    articles_seen INTEGER DEFAULT 0,
    articles_read INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0,

    weight REAL DEFAULT 0.5,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(author, user_id)
);
```

---

## Content Sources

### Tier 1: High-Trust News Sources

**Tech:**
- Hacker News (via hnrss.org)
- TechCrunch RSS
- The Verge RSS
- Ars Technica RSS

**General News:**
- NYT (via RSS or API)
- BBC (via RSS)
- Reuters (via RSS)
- AP News (via RSS)

**Business:**
- Bloomberg (via RSS or scraping)
- WSJ (via RSS)
- Financial Times (via RSS)

### Tier 2: Expert Blogs & Newsletters

Pull from SME experts in your skills:

**From your skills (market-researcher, marketing-strategist, etc.):**
- April Dunford (positioning) - aprildunford.com
- Rob Fitzpatrick (customer development) - robfitz.com
- Clayton Christensen (innovation) - Various publications
- Seth Godin (marketing) - seths.blog
- Paul Graham (startups) - paulgraham.com
- Patrick McKenzie (SaaS) - kalzumeus.com
- Indie Hackers (community) - indiehackers.com

**Developer/Tech:**
- Simon Willison - simonwillison.net
- Julia Evans - jvns.ca
- Martin Fowler - martinfowler.com
- Kent Beck - medium.com/@kentbeck_7670

### Tier 3: Community Platforms

- Reddit (r/programming, r/startups, r/SaaS)
- Dev.to (developer community)
- Lobsters (tech aggregator)
- Designer News (design/tech)

---

## UI/UX for Learning

### Feed Display

```
┌────────────────────────────────────────────┐
│  🔥 Trending in last 4 hours               │
├────────────────────────────────────────────┤
│  ⭐ 9.2  Title of highly ranked article    │
│  Source: Hacker News · 2h ago · AI, Python │
│  👍 👎 💾                                   │
├────────────────────────────────────────────┤
│  ⭐ 8.7  Another great article             │
│  Source: Paul Graham · 5h ago · Startups   │
│  👍 👎 💾                                   │
└────────────────────────────────────────────┘
```

**Score badge (⭐ 9.2)**: Shows personalized ranking
**Actions**:
- 👍 = Upvote (boost similar content)
- 👎 = Downvote (suppress similar content)
- 💾 = Save for later

### Analytics Dashboard (Optional)

Show user their reading patterns:

```
Your Reading Stats (Last 30 Days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Top Sources:
1. Hacker News (42 articles read)
2. Paul Graham (12 articles read)
3. NYT (8 articles read)

Top Topics:
1. AI & Machine Learning (67% of reads)
2. Startups & Indie Hacking (23% of reads)
3. Python Development (18% of reads)

Reading Time: 12.3 hours
Most Active: Mornings (8-10am)
```

---

## Implementation Phases

### Phase 1: Basic Tracking (Week 1)
- [x] Database schema
- [ ] Click tracking
- [ ] Basic scoring (recency + popularity)
- [ ] Display articles in feed

### Phase 2: Learning (Week 2)
- [ ] Dwell time tracking
- [ ] Rating system (👍/👎)
- [ ] Source weight calculation
- [ ] Personalized scoring

### Phase 3: Advanced (Week 3)
- [ ] Topic extraction & modeling
- [ ] Author preferences
- [ ] Daily weight updates (automated)
- [ ] Analytics dashboard

### Phase 4: Optimization (Week 4)
- [ ] A/B test different ranking formulas
- [ ] Add more sources
- [ ] Export/import preferences
- [ ] Recommendation explanations ("Why am I seeing this?")

---

## Privacy & Control

**Your data stays local:**
- All tracking stored in your SQLite database
- No external analytics services
- No data sent to third parties

**You're always in control:**
- Reset algorithm anytime
- Export your data (JSON/CSV)
- Manual overrides (block sources, pin topics)
- See why articles are ranked highly

---

## Algorithm Transparency

Show users WHY an article is ranked highly:

```
Why you're seeing this:
✓ From Hacker News (you read 80% of articles from this source)
✓ Topic: AI (your #1 interest)
✓ Posted 2 hours ago (very recent)
✓ 342 upvotes (high popularity)
```

This builds trust and helps you understand your own preferences.

---

## Future Enhancements

**Machine Learning (Optional):**
- Use lightweight ML (scikit-learn, TensorFlow.js)
- Collaborative filtering (if you add friends)
- Content embeddings for semantic similarity

**Social Features (Optional):**
- Share your feed with friends
- See what friends are reading
- Collaborative filtering ("Users like you also read...")

**Advanced Analytics:**
- Reading speed trends
- Optimal posting times from sources
- Burnout detection (reading too much news?)

---

## Comparison to Other Algorithms

| Feature | Twitter | Reddit | Your Dashboard |
|---------|---------|--------|----------------|
| **Goal** | Engagement | Engagement | Personal value |
| **Transparency** | Black box | Partial | Fully transparent |
| **Control** | Minimal | Moderate | Total control |
| **Privacy** | Data harvested | Data harvested | Local only |
| **Learning** | ML (opaque) | Voting | Explicit + implicit |
| **Addictive?** | Yes | Somewhat | No (you control it) |

---

## Getting Started

1. **Start with defaults**: Initial ranking uses recency + popularity
2. **Read naturally**: Click what interests you
3. **Give feedback**: Upvote/downvote to teach the algorithm
4. **Wait 24 hours**: Algorithm learns from first day
5. **See improvement**: Feed gets more relevant over time

**The more you use it, the smarter it gets.**

---

Ready to implement? Let's build your personal recommendation engine! 🚀
