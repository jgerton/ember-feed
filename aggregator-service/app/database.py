"""
Database module for trending topics storage

Uses SQLAlchemy with asyncpg for PostgreSQL async database access.
Table names match Prisma's @@map() directives.
"""

import json
import os
import time
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

import structlog
from sqlalchemy import select, delete, and_, desc
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from .models import Base, Feed, HotTopic, TrendingUpTopic, KeywordHistory

logger = structlog.get_logger()


def get_database_url() -> str:
    """Get the PostgreSQL database URL from environment"""
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://ember:ember_dev@localhost:5432/ember_feed"
    )
    # Convert postgresql:// to postgresql+asyncpg:// for async support
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return db_url


# Create async engine with connection pooling
engine = create_async_engine(
    get_database_url(),
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    echo=os.environ.get("DEBUG_SQL", "").lower() == "true",
)

# Create async session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


def generate_cuid() -> str:
    """Generate a CUID-like ID to match Prisma's default"""
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
    logger.info("storing_hot_topics", timeframe=timeframe, count=len(topics))

    async with async_session() as session:
        stored = 0
        for i, topic in enumerate(topics):
            try:
                hot_topic = HotTopic(
                    id=generate_cuid(),
                    keyword=topic.get("keyword", ""),
                    timeframe=timeframe,
                    rank=i + 1,
                    score=topic.get("score", 0.0),
                    mentions=topic.get("mentions", 0),
                    summary=topic.get("summary", ""),
                    sources=json.dumps(topic.get("sources", [])),
                    sampleUrls=json.dumps(topic.get("sample_articles", [])),
                    fetchedAt=fetched_at,
                    createdAt=datetime.utcnow(),
                )
                session.add(hot_topic)
                stored += 1
            except Exception as e:
                logger.error("store_hot_topic_failed", keyword=topic.get("keyword"), error=str(e))

        await session.commit()
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
    logger.info("storing_trending_up_topics", timeframe=timeframe, count=len(topics))

    async with async_session() as session:
        stored = 0
        for i, topic in enumerate(topics):
            try:
                trending_topic = TrendingUpTopic(
                    id=generate_cuid(),
                    keyword=topic.get("keyword", ""),
                    timeframe=timeframe,
                    rank=i + 1,
                    velocity=topic.get("velocity", 0.0),
                    currentVolume=topic.get("current_volume", 0),
                    previousVolume=topic.get("previous_volume", 0),
                    percentGrowth=topic.get("percent_growth", 0.0),
                    summary=topic.get("summary", ""),
                    sources=json.dumps(topic.get("sources", [])),
                    sampleUrls=json.dumps(topic.get("sample_articles", [])),
                    fetchedAt=fetched_at,
                    createdAt=datetime.utcnow(),
                )
                session.add(trending_topic)
                stored += 1
            except Exception as e:
                logger.error("store_trending_up_topic_failed", keyword=topic.get("keyword"), error=str(e))

        await session.commit()
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
    logger.info("storing_keyword_history", count=len(keywords))

    async with async_session() as session:
        stored = 0
        for kw in keywords:
            try:
                keyword_hist = KeywordHistory(
                    id=generate_cuid(),
                    keyword=kw.get("keyword", ""),
                    mentions=kw.get("mentions", kw.get("count", 0)),
                    sources=json.dumps(kw.get("sources", [])),
                    date=date,
                    createdAt=datetime.utcnow(),
                )
                session.add(keyword_hist)
                stored += 1
            except Exception as e:
                logger.error("store_keyword_history_failed", keyword=kw.get("keyword"), error=str(e))

        await session.commit()
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
    logger.info("fetching_hot_topics", timeframe=timeframe, limit=limit)

    async with async_session() as session:
        # Get the most recent fetch timestamp for this timeframe
        stmt = (
            select(HotTopic.fetchedAt)
            .where(HotTopic.timeframe == timeframe)
            .order_by(desc(HotTopic.fetchedAt))
            .limit(1)
        )
        result = await session.execute(stmt)
        row = result.scalar_one_or_none()

        if not row:
            logger.info("no_hot_topics_found", timeframe=timeframe)
            return []

        latest_fetch = row

        # Get topics from that fetch
        stmt = (
            select(HotTopic)
            .where(and_(
                HotTopic.timeframe == timeframe,
                HotTopic.fetchedAt == latest_fetch
            ))
            .order_by(HotTopic.rank)
            .limit(limit)
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()

        topics = []
        for row in rows:
            topics.append({
                "rank": row.rank,
                "keyword": row.keyword,
                "score": row.score,
                "mentions": row.mentions,
                "summary": row.summary,
                "sources": json.loads(row.sources),
                "sample_articles": json.loads(row.sampleUrls),
                "fetched_at": row.fetchedAt.isoformat() if row.fetchedAt else None,
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
    logger.info("fetching_trending_up_topics", timeframe=timeframe, limit=limit)

    async with async_session() as session:
        # Get the most recent fetch timestamp for this timeframe
        stmt = (
            select(TrendingUpTopic.fetchedAt)
            .where(TrendingUpTopic.timeframe == timeframe)
            .order_by(desc(TrendingUpTopic.fetchedAt))
            .limit(1)
        )
        result = await session.execute(stmt)
        row = result.scalar_one_or_none()

        if not row:
            logger.info("no_trending_up_topics_found", timeframe=timeframe)
            return []

        latest_fetch = row

        # Get topics from that fetch
        stmt = (
            select(TrendingUpTopic)
            .where(and_(
                TrendingUpTopic.timeframe == timeframe,
                TrendingUpTopic.fetchedAt == latest_fetch
            ))
            .order_by(TrendingUpTopic.rank)
            .limit(limit)
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()

        topics = []
        for row in rows:
            topics.append({
                "rank": row.rank,
                "keyword": row.keyword,
                "velocity": row.velocity,
                "current_volume": row.currentVolume,
                "previous_volume": row.previousVolume,
                "percent_growth": row.percentGrowth,
                "summary": row.summary,
                "sources": json.loads(row.sources),
                "sample_articles": json.loads(row.sampleUrls),
                "fetched_at": row.fetchedAt.isoformat() if row.fetchedAt else None,
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
    async with async_session() as session:
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        stmt = (
            select(KeywordHistory)
            .where(and_(
                KeywordHistory.keyword == keyword,
                KeywordHistory.date >= cutoff_date
            ))
            .order_by(KeywordHistory.date)
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()

        history = []
        for row in rows:
            history.append({
                "keyword": row.keyword,
                "mentions": row.mentions,
                "sources": json.loads(row.sources),
                "date": row.date.isoformat() if row.date else None,
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
    async with async_session() as session:
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        stmt = (
            select(KeywordHistory)
            .where(KeywordHistory.date >= cutoff_date)
            .order_by(KeywordHistory.keyword, KeywordHistory.date)
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()

        history: Dict[str, List[Dict[str, Any]]] = {}
        for row in rows:
            keyword = row.keyword
            if keyword not in history:
                history[keyword] = []
            history[keyword].append({
                "mentions": row.mentions,
                "sources": json.loads(row.sources),
                "date": row.date.isoformat() if row.date else None,
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
    logger.info("fetching_enabled_feeds", type=feed_type, category=category)

    async with async_session() as session:
        # Build query with optional filters
        conditions = [
            Feed.enabled == True,
            Feed.status == "active"
        ]

        if feed_type:
            conditions.append(Feed.type == feed_type)
        if category:
            conditions.append(Feed.category == category)

        stmt = (
            select(Feed)
            .where(and_(*conditions))
            .order_by(desc(Feed.priority), Feed.name)
        )

        result = await session.execute(stmt)
        rows = result.scalars().all()

        feeds = []
        for row in rows:
            feeds.append({
                "id": row.id,
                "name": row.name,
                "url": row.url,
                "type": row.type,
                "category": row.category,
                "priority": row.priority,
                "last_fetched": row.lastFetched.isoformat() if row.lastFetched else None,
            })

        logger.info("enabled_feeds_fetched", count=len(feeds))
        return feeds


async def update_feed_last_fetched(feed_id: str) -> None:
    """
    Update the lastFetched timestamp for a feed

    Args:
        feed_id: The feed ID to update
    """
    async with async_session() as session:
        stmt = select(Feed).where(Feed.id == feed_id)
        result = await session.execute(stmt)
        feed = result.scalar_one_or_none()

        if feed:
            feed.lastFetched = datetime.utcnow()
            feed.updatedAt = datetime.utcnow()
            await session.commit()


async def cleanup_old_data(days_to_keep: int = 30) -> Dict[str, int]:
    """
    Clean up old trending data to prevent database bloat

    Args:
        days_to_keep: How many days of data to retain

    Returns:
        Dict with counts of deleted rows per table
    """
    logger.info("cleaning_old_data", days_to_keep=days_to_keep)

    cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
    deleted = {}

    async with async_session() as session:
        # Clean hot_topics
        stmt = delete(HotTopic).where(HotTopic.fetchedAt < cutoff_date)
        result = await session.execute(stmt)
        deleted["hot_topics"] = result.rowcount

        # Clean trending_up_topics
        stmt = delete(TrendingUpTopic).where(TrendingUpTopic.fetchedAt < cutoff_date)
        result = await session.execute(stmt)
        deleted["trending_up_topics"] = result.rowcount

        # Clean keyword_history
        stmt = delete(KeywordHistory).where(KeywordHistory.date < cutoff_date)
        result = await session.execute(stmt)
        deleted["keyword_history"] = result.rowcount

        await session.commit()

    logger.info("old_data_cleaned", deleted=deleted)
    return deleted
