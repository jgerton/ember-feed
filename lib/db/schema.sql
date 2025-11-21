-- Personal Dashboard Database Schema
-- SQLite schema for content tracking and personalization

-- Articles fetched from various sources
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    content TEXT,
    summary TEXT,
    source TEXT NOT NULL,           -- 'ycombinator', 'nytimes', 'paulgr aham', etc.
    author TEXT,
    published_at TIMESTAMP NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    popularity_score REAL DEFAULT 0,  -- Upvotes, shares from source
    topics TEXT,                      -- JSON array: ["AI", "Startups"]

    -- Indexes for common queries
    UNIQUE(url)
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_fetched ON articles(fetched_at DESC);

-- User engagement tracking (implicit and explicit signals)
CREATE TABLE IF NOT EXISTS article_engagement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,      -- For future multi-user support

    -- Implicit signals (automatic tracking)
    impression_at TIMESTAMP,         -- When shown in feed
    clicked_at TIMESTAMP,            -- When user clicked to read
    dwell_time INTEGER,              -- Seconds spent reading (0 if not clicked)
    scroll_depth REAL,               -- Percentage scrolled (0-1), future feature

    -- Explicit signals (user actions)
    rating INTEGER DEFAULT 0,        -- -1 (downvote), 0 (no rating), 1 (upvote)
    saved BOOLEAN DEFAULT FALSE,     -- Bookmarked for later
    rated_at TIMESTAMP,              -- When user rated

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE(article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_article ON article_engagement(article_id);
CREATE INDEX IF NOT EXISTS idx_engagement_user ON article_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_clicked ON article_engagement(clicked_at);

-- Source weights (learned source preferences)
CREATE TABLE IF NOT EXISTS source_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    user_id INTEGER DEFAULT 1,

    -- Engagement metrics (aggregate counts)
    impressions INTEGER DEFAULT 0,    -- Times shown in feed
    clicks INTEGER DEFAULT 0,         -- Times clicked
    total_dwell_time INTEGER DEFAULT 0, -- Total seconds spent reading
    upvotes INTEGER DEFAULT 0,        -- Explicit positive ratings
    downvotes INTEGER DEFAULT 0,      -- Explicit negative ratings

    -- Calculated weight (0 = never show, 1 = always show)
    weight REAL DEFAULT 0.5,

    -- Metadata
    last_shown_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(source, user_id)
);

CREATE INDEX IF NOT EXISTS idx_source_weights_user ON source_weights(user_id);
CREATE INDEX IF NOT EXISTS idx_source_weights_weight ON source_weights(weight DESC);

-- Topic preferences (learned interest areas)
CREATE TABLE IF NOT EXISTS topic_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    topic TEXT NOT NULL,

    -- Engagement with this topic
    articles_seen INTEGER DEFAULT 0,
    articles_clicked INTEGER DEFAULT 0,
    total_dwell_time INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,

    -- Calculated preference (0 = not interested, 1 = very interested)
    preference_score REAL DEFAULT 0.5,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(topic, user_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_prefs_user ON topic_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_prefs_score ON topic_preferences(preference_score DESC);

-- Author weights (favorite writers)
CREATE TABLE IF NOT EXISTS author_weights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    user_id INTEGER DEFAULT 1,

    -- Engagement metrics
    articles_seen INTEGER DEFAULT 0,
    articles_read INTEGER DEFAULT 0,   -- Clicked + meaningful dwell time
    avg_rating REAL DEFAULT 0,         -- Average of ratings (-1 to 1)
    total_ratings INTEGER DEFAULT 0,

    -- Calculated weight
    weight REAL DEFAULT 0.5,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(author, user_id)
);

CREATE INDEX IF NOT EXISTS idx_author_weights_user ON author_weights(user_id);
CREATE INDEX IF NOT EXISTS idx_author_weights_weight ON author_weights(weight DESC);

-- Todo list (personal task management)
CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,       -- 0=normal, 1=high, 2=urgent
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    user_id INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);

-- Daily summaries (optional feature)
CREATE TABLE IF NOT EXISTS daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    summary TEXT,                     -- Generated summary of the day's content
    top_articles TEXT,                -- JSON array of article IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_summaries_date ON daily_summaries(date DESC);

-- Algorithm configuration (user preferences and settings)
CREATE TABLE IF NOT EXISTS algo_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1 UNIQUE,

    -- Algorithm weights (can be tuned over time)
    weight_recency REAL DEFAULT 0.2,
    weight_popularity REAL DEFAULT 0.2,
    weight_source REAL DEFAULT 0.25,
    weight_topic REAL DEFAULT 0.25,
    weight_author REAL DEFAULT 0.1,

    -- Learning parameters
    learning_rate REAL DEFAULT 0.3,   -- How fast to adapt (0-1)
    min_data_points INTEGER DEFAULT 10, -- Min engagements before personalizing

    -- Display preferences
    articles_per_page INTEGER DEFAULT 20,
    default_timeframe TEXT DEFAULT '24h', -- '4h', '24h', '7d'

    -- Feature flags
    enable_personalization BOOLEAN DEFAULT TRUE,
    enable_topic_extraction BOOLEAN DEFAULT TRUE,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config
INSERT OR IGNORE INTO algo_config (user_id) VALUES (1);

-- Saved articles (bookmarks)
CREATE TABLE IF NOT EXISTS saved_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    note TEXT,                        -- Optional user note
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE(article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_articles(user_id, saved_at DESC);
