"""
Database module for trending topics storage

Uses aiosqlite to interact with the same SQLite database as Prisma.
Table names match Prisma's @@map() directives.
"""

import aiosqlite
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
import structlog
import os
from pathlib import Path

logger = structlog.get_logger()

# Database path - matches Prisma's location
# Prisma uses file:./data/dashboard.db relative to prisma/ folder
# Docker uses sqlite:///app/data/dashboard.db
def get_database_path() -> str:
    """Get the database path, handling both Docker and local dev environments"""
    # Check for environment variable override
    db_url = os.environ.get("DATABASE_URL", "")

    # Handle Docker's sqlite:// URL format
    if db_url.startswith("sqlite:///"):
        path = db_url.replace("sqlite:///", "/")
        if Path(path).exists() or Path(path).parent.exists():
            return path

    # Handle Prisma's file: URL format (local dev)
    if db_url.startswith("file:"):
        # Parse Prisma-style file URL - it's relative to prisma folder
        path = db_url.replace("file:", "").replace("./", "")
        # The path is relative to prisma folder, so: prisma/data/dashboard.db
        project_root = Path(__file__).parent.parent.parent
        prisma_relative = project_root / "prisma" / path
        if prisma_relative.exists():
            return str(prisma_relative)

    # Default paths to try (in order of preference)
    paths = [
        "/app/data/dashboard.db",  # Docker (from docker-compose volume mount)
        Path(__file__).parent.parent.parent / "prisma" / "data" / "dashboard.db",  # Local dev (correct location)
        Path(__file__).parent.parent.parent / "data" / "dashboard.db",  # Alternative
        Path(__file__).parent.parent.parent / "prisma" / "dev.db",  # Old location
    ]

    for path in paths:
        if Path(path).exists():
            return str(path)

    # Fall back to Docker path (most common deployment)
    return "/app/data/dashboard.db"


def generate_cuid() -> str:
    """Generate a CUID-like ID to match Prisma's default"""
    import uuid
    import time
    # Simple CUID-like ID: timestamp + random
    timestamp = hex(int(time.time() * 1000))[2:]
    random_part = uuid.uuid4().hex[:12]
    return f"c{timestamp}{random_part}"


async def store_hot_topics(
    topics: List[Dict[str, Any]],
    timeframe: str,
    fetched_at: datetime
) -> int:
    """
    Store hot topics in the database

    Args:
        topics: List of topic dicts with keyword, score, mentions, sources, summary, sample_articles
        timeframe: "24hr", "3day", or "7day"
        fetched_at: When this data was calculated

    Returns:
        Number of topics stored
    """
    db_path = get_database_path()
    logger.info("storing_hot_topics", path=db_path, timeframe=timeframe, count=len(topics))

    async with aiosqlite.connect(db_path) as db:
        stored = 0
        for i, topic in enumerate(topics):
            try:
                topic_id = generate_cuid()
                await db.execute(
                    """
                    INSERT INTO hot_topics (id, keyword, timeframe, rank, score, mentions, summary, sources, sampleUrls, fetchedAt, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        topic_id,
                        topic.get("keyword", ""),
                        timeframe,
                        i + 1,  # rank 1-5
                        topic.get("score", 0.0),
                        topic.get("mentions", 0),
                        topic.get("summary", ""),
                        json.dumps(topic.get("sources", [])),
                        json.dumps(topic.get("sample_articles", [])),
                        fetched_at.isoformat(),
                        datetime.now().isoformat()
                    )
                )
                stored += 1
            except Exception as e:
                logger.error("store_hot_topic_failed", keyword=topic.get("keyword"), error=str(e))

        await db.commit()
        logger.info("hot_topics_stored", count=stored, timeframe=timeframe)
        return stored


async def store_trending_up_topics(
    topics: List[Dict[str, Any]],
    timeframe: str,
    fetched_at: datetime
) -> int:
    """
    Store trending up topics in the database

    Args:
        topics: List of topic dicts with velocity, current_volume, previous_volume, percent_growth
        timeframe: "7day", "14day", or "30day"
        fetched_at: When this data was calculated

    Returns:
        Number of topics stored
    """
    db_path = get_database_path()
    logger.info("storing_trending_up_topics", path=db_path, timeframe=timeframe, count=len(topics))

    async with aiosqlite.connect(db_path) as db:
        stored = 0
        for i, topic in enumerate(topics):
            try:
                topic_id = generate_cuid()
                await db.execute(
                    """
                    INSERT INTO trending_up_topics (id, keyword, timeframe, rank, velocity, currentVolume, previousVolume, percentGrowth, summary, sources, sampleUrls, fetchedAt, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        topic_id,
                        topic.get("keyword", ""),
                        timeframe,
                        i + 1,  # rank 1-5
                        topic.get("velocity", 0.0),
                        topic.get("current_volume", 0),
                        topic.get("previous_volume", 0),
                        topic.get("percent_growth", 0.0),
                        topic.get("summary", ""),
                        json.dumps(topic.get("sources", [])),
                        json.dumps(topic.get("sample_articles", [])),
                        fetched_at.isoformat(),
                        datetime.now().isoformat()
                    )
                )
                stored += 1
            except Exception as e:
                logger.error("store_trending_up_topic_failed", keyword=topic.get("keyword"), error=str(e))

        await db.commit()
        logger.info("trending_up_topics_stored", count=stored, timeframe=timeframe)
        return stored


async def store_keyword_history(
    keywords: List[Dict[str, Any]],
    date: datetime
) -> int:
    """
    Store keyword history snapshot for velocity calculation

    Args:
        keywords: List of dicts with keyword, mentions, sources
        date: Date of this snapshot

    Returns:
        Number of keywords stored
    """
    db_path = get_database_path()
    logger.info("storing_keyword_history", path=db_path, count=len(keywords))

    async with aiosqlite.connect(db_path) as db:
        stored = 0
        for kw in keywords:
            try:
                kw_id = generate_cuid()
                await db.execute(
                    """
                    INSERT INTO keyword_history (id, keyword, mentions, sources, date, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        kw_id,
                        kw.get("keyword", ""),
                        kw.get("mentions", kw.get("count", 0)),
                        json.dumps(kw.get("sources", [])),
                        date.isoformat(),
                        datetime.now().isoformat()
                    )
                )
                stored += 1
            except Exception as e:
                logger.error("store_keyword_history_failed", keyword=kw.get("keyword"), error=str(e))

        await db.commit()
        logger.info("keyword_history_stored", count=stored)
        return stored


async def get_hot_topics(
    timeframe: str,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Get the most recent hot topics for a timeframe

    Args:
        timeframe: "24hr", "3day", or "7day"
        limit: Max topics to return

    Returns:
        List of hot topic dicts
    """
    db_path = get_database_path()
    logger.info("fetching_hot_topics", path=db_path, timeframe=timeframe, limit=limit)

    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row

        # Get the most recent fetch timestamp for this timeframe
        cursor = await db.execute(
            """
            SELECT DISTINCT fetchedAt
            FROM hot_topics
            WHERE timeframe = ?
            ORDER BY fetchedAt DESC
            LIMIT 1
            """,
            (timeframe,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.info("no_hot_topics_found", timeframe=timeframe)
            return []

        latest_fetch = row["fetchedAt"]

        # Get topics from that fetch
        cursor = await db.execute(
            """
            SELECT * FROM hot_topics
            WHERE timeframe = ? AND fetchedAt = ?
            ORDER BY rank ASC
            LIMIT ?
            """,
            (timeframe, latest_fetch, limit)
        )
        rows = await cursor.fetchall()

        topics = []
        for row in rows:
            topics.append({
                "rank": row["rank"],
                "keyword": row["keyword"],
                "score": row["score"],
                "mentions": row["mentions"],
                "summary": row["summary"],
                "sources": json.loads(row["sources"]),
                "sample_articles": json.loads(row["sampleUrls"]),
                "fetched_at": row["fetchedAt"]
            })

        logger.info("hot_topics_fetched", count=len(topics), timeframe=timeframe)
        return topics


async def get_trending_up_topics(
    timeframe: str,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Get the most recent trending up topics for a timeframe

    Args:
        timeframe: "7day", "14day", or "30day"
        limit: Max topics to return

    Returns:
        List of trending up topic dicts
    """
    db_path = get_database_path()
    logger.info("fetching_trending_up_topics", path=db_path, timeframe=timeframe, limit=limit)

    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row

        # Get the most recent fetch timestamp for this timeframe
        cursor = await db.execute(
            """
            SELECT DISTINCT fetchedAt
            FROM trending_up_topics
            WHERE timeframe = ?
            ORDER BY fetchedAt DESC
            LIMIT 1
            """,
            (timeframe,)
        )
        row = await cursor.fetchone()

        if not row:
            logger.info("no_trending_up_topics_found", timeframe=timeframe)
            return []

        latest_fetch = row["fetchedAt"]

        # Get topics from that fetch
        cursor = await db.execute(
            """
            SELECT * FROM trending_up_topics
            WHERE timeframe = ? AND fetchedAt = ?
            ORDER BY rank ASC
            LIMIT ?
            """,
            (timeframe, latest_fetch, limit)
        )
        rows = await cursor.fetchall()

        topics = []
        for row in rows:
            topics.append({
                "rank": row["rank"],
                "keyword": row["keyword"],
                "velocity": row["velocity"],
                "current_volume": row["currentVolume"],
                "previous_volume": row["previousVolume"],
                "percent_growth": row["percentGrowth"],
                "summary": row["summary"],
                "sources": json.loads(row["sources"]),
                "sample_articles": json.loads(row["sampleUrls"]),
                "fetched_at": row["fetchedAt"]
            })

        logger.info("trending_up_topics_fetched", count=len(topics), timeframe=timeframe)
        return topics


async def get_keyword_history(
    keyword: str,
    days: int = 30
) -> List[Dict[str, Any]]:
    """
    Get historical mentions for a keyword

    Args:
        keyword: The keyword to look up
        days: How many days of history to fetch

    Returns:
        List of history entries sorted by date
    """
    db_path = get_database_path()

    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            """
            SELECT * FROM keyword_history
            WHERE keyword = ?
            AND date >= datetime('now', ?)
            ORDER BY date ASC
            """,
            (keyword, f"-{days} days")
        )
        rows = await cursor.fetchall()

        history = []
        for row in rows:
            history.append({
                "keyword": row["keyword"],
                "mentions": row["mentions"],
                "sources": json.loads(row["sources"]),
                "date": row["date"]
            })

        return history


async def get_all_keywords_history(
    days: int = 30
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get historical data for all keywords (for velocity calculation)

    Args:
        days: How many days of history to fetch

    Returns:
        Dict mapping keyword -> list of history entries
    """
    db_path = get_database_path()

    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            """
            SELECT * FROM keyword_history
            WHERE date >= datetime('now', ?)
            ORDER BY keyword, date ASC
            """,
            (f"-{days} days",)
        )
        rows = await cursor.fetchall()

        history: Dict[str, List[Dict[str, Any]]] = {}
        for row in rows:
            keyword = row["keyword"]
            if keyword not in history:
                history[keyword] = []
            history[keyword].append({
                "mentions": row["mentions"],
                "sources": json.loads(row["sources"]),
                "date": row["date"]
            })

        return history


async def get_enabled_feeds(
    feed_type: Optional[str] = None,
    category: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get enabled feeds from the database for aggregation

    Args:
        feed_type: Optional filter by type ('rss', 'reddit', 'hackernews', 'api')
        category: Optional filter by category ('tech', 'business', 'science', etc.)

    Returns:
        List of feed dicts with url, name, type, category, priority
    """
    db_path = get_database_path()
    logger.info("fetching_enabled_feeds", path=db_path, type=feed_type, category=category)

    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row

        # Build query with optional filters
        query = """
            SELECT id, name, url, type, category, priority, lastFetched
            FROM feeds
            WHERE enabled = 1 AND status = 'active'
        """
        params: List[Any] = []

        if feed_type:
            query += " AND type = ?"
            params.append(feed_type)

        if category:
            query += " AND category = ?"
            params.append(category)

        query += " ORDER BY priority DESC, name ASC"

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()

        feeds = []
        for row in rows:
            feeds.append({
                "id": row["id"],
                "name": row["name"],
                "url": row["url"],
                "type": row["type"],
                "category": row["category"],
                "priority": row["priority"],
                "last_fetched": row["lastFetched"]
            })

        logger.info("enabled_feeds_fetched", count=len(feeds))
        return feeds


async def update_feed_last_fetched(feed_id: str) -> None:
    """
    Update the lastFetched timestamp for a feed

    Args:
        feed_id: The feed ID to update
    """
    db_path = get_database_path()

    async with aiosqlite.connect(db_path) as db:
        await db.execute(
            """
            UPDATE feeds
            SET lastFetched = ?, updatedAt = ?
            WHERE id = ?
            """,
            (datetime.now().isoformat(), datetime.now().isoformat(), feed_id)
        )
        await db.commit()


async def cleanup_old_data(days_to_keep: int = 30) -> Dict[str, int]:
    """
    Clean up old trending data to prevent database bloat

    Args:
        days_to_keep: How many days of data to retain

    Returns:
        Dict with counts of deleted rows per table
    """
    db_path = get_database_path()
    logger.info("cleaning_old_data", days_to_keep=days_to_keep)

    async with aiosqlite.connect(db_path) as db:
        deleted = {}

        # Clean hot_topics
        cursor = await db.execute(
            """
            DELETE FROM hot_topics
            WHERE fetchedAt < datetime('now', ?)
            """,
            (f"-{days_to_keep} days",)
        )
        deleted["hot_topics"] = cursor.rowcount

        # Clean trending_up_topics
        cursor = await db.execute(
            """
            DELETE FROM trending_up_topics
            WHERE fetchedAt < datetime('now', ?)
            """,
            (f"-{days_to_keep} days",)
        )
        deleted["trending_up_topics"] = cursor.rowcount

        # Clean keyword_history
        cursor = await db.execute(
            """
            DELETE FROM keyword_history
            WHERE date < datetime('now', ?)
            """,
            (f"-{days_to_keep} days",)
        )
        deleted["keyword_history"] = cursor.rowcount

        await db.commit()
        logger.info("old_data_cleaned", deleted=deleted)
        return deleted
