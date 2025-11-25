"""
API Routes for Trending Topics Aggregator

Endpoints:
- POST /api/fetch - Trigger content fetching from all sources
- GET /api/hot - Get "Hot Now" trending topics
- GET /api/trending-up - Get "Trending Up" topics (velocity-based)
- GET /api/feeds - List available feed sources
- POST /api/feeds/subscribe - Subscribe to feeds
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import structlog
from datetime import datetime, timedelta

# Import our analyzers and fetchers
from app.fetchers import hackernews, reddit, rss, newsapi
from app.analyzers import (
    keyword_extractor,
    deduplicator,
    hot_scorer,
    velocity_calculator,
    historical_snapshot
)
from app.config import settings
from app import database

logger = structlog.get_logger()

router = APIRouter(prefix="/api")


# Request/Response Models
class FetchRequest(BaseModel):
    """Request to trigger fetching"""
    sources: Optional[List[str]] = None  # Specific sources, or None for all


class HotTopicResponse(BaseModel):
    """Response for hot topics"""
    timeframe: str
    topics: List[dict]


class TrendingUpResponse(BaseModel):
    """Response for trending up topics"""
    timeframe: str
    topics: List[dict]


# In-memory job tracking (use Redis in production)
fetch_jobs = {}


@router.post("/fetch")
async def trigger_fetch(request: FetchRequest, background_tasks: BackgroundTasks):
    """
    Trigger content fetching from all sources

    This runs in the background and updates the database with:
    - Hot Now topics
    - Historical snapshots for Trending Up calculation
    """
    import uuid
    job_id = str(uuid.uuid4())

    # Add background task
    background_tasks.add_task(
        fetch_and_process_content,
        job_id=job_id,
        sources=request.sources
    )

    fetch_jobs[job_id] = {
        "status": "running",
        "started_at": datetime.now().isoformat()
    }

    return {
        "job_id": job_id,
        "status": "started",
        "message": "Fetching content from sources in background"
    }


@router.get("/fetch/{job_id}")
async def get_fetch_status(job_id: str):
    """Get status of a fetch job"""
    if job_id not in fetch_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return fetch_jobs[job_id]


@router.get("/hot")
async def get_hot_topics(
    timeframe: str = "24hr",
    limit: int = 5
):
    """
    Get "Hot Now" trending topics

    Args:
        timeframe: "24hr", "3day", or "7day"
        limit: Number of topics to return (default 5)

    Returns:
        Hot topics with scores, mentions, and sample articles
    """
    if timeframe not in ["24hr", "3day", "7day"]:
        raise HTTPException(
            status_code=400,
            detail="timeframe must be one of: 24hr, 3day, 7day"
        )

    try:
        # Query hot topics from database
        topics = await database.get_hot_topics(timeframe=timeframe, limit=limit)

        if not topics:
            # No data yet - return empty with helpful message
            return {
                "timeframe": timeframe,
                "topics": [],
                "message": "No trending data yet. Trigger a fetch with POST /api/fetch first."
            }

        return {
            "timeframe": timeframe,
            "topics": topics
        }

    except Exception as e:
        logger.error("get_hot_topics_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch hot topics")


@router.get("/trending-up")
async def get_trending_up_topics(
    timeframe: str = "7day",
    limit: int = 5
):
    """
    Get "Trending Up" topics (velocity-based)

    Args:
        timeframe: "7day", "14day", or "30day"
        limit: Number of topics to return (default 5)

    Returns:
        Trending up topics with velocity metrics and growth percentages
    """
    if timeframe not in ["7day", "14day", "30day"]:
        raise HTTPException(
            status_code=400,
            detail="timeframe must be one of: 7day, 14day, 30day"
        )

    try:
        # Query trending up topics from database
        topics = await database.get_trending_up_topics(timeframe=timeframe, limit=limit)

        if not topics:
            # No data yet - need historical data for velocity calculation
            return {
                "timeframe": timeframe,
                "topics": [],
                "message": "Trending Up requires historical data. Run daily fetches for 1-2 weeks to build history."
            }

        return {
            "timeframe": timeframe,
            "topics": topics
        }

    except Exception as e:
        logger.error("get_trending_up_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch trending up topics")


@router.get("/feeds")
async def list_feeds(category: Optional[str] = None, feed_type: Optional[str] = None):
    """
    List available feed sources from database

    Args:
        category: Filter by category (tech, business, science, etc.)
        feed_type: Filter by type (rss, reddit, hackernews, api)

    Returns:
        List of available feeds with metadata
    """
    try:
        # Get enabled feeds from database
        db_feeds = await database.get_enabled_feeds(
            feed_type=feed_type,
            category=category
        )

        # Also include built-in sources that aren't in the database
        builtin_feeds = [
            {
                "id": "hn",
                "name": "Hacker News",
                "type": "hackernews",
                "category": "tech",
                "priority": 90,
                "builtin": True
            },
            {
                "id": "reddit-tech",
                "name": "Reddit - r/technology",
                "type": "reddit",
                "category": "tech",
                "priority": 85,
                "builtin": True
            },
            {
                "id": "google-news",
                "name": "Google News",
                "type": "rss",
                "category": "general",
                "priority": 80,
                "builtin": True
            },
        ]

        # Apply category filter to built-in feeds
        if category:
            builtin_feeds = [f for f in builtin_feeds if f["category"] == category]
        if feed_type:
            builtin_feeds = [f for f in builtin_feeds if f["type"] == feed_type]

        # Combine database feeds with built-in
        all_feeds = db_feeds + builtin_feeds

        return {
            "feeds": all_feeds,
            "total": len(all_feeds),
            "user_feeds": len(db_feeds),
            "builtin_feeds": len(builtin_feeds)
        }

    except Exception as e:
        logger.error("list_feeds_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to list feeds")


# Background task
async def fetch_and_process_content(job_id: str, sources: Optional[List[str]] = None):
    """
    Background task to fetch and process content

    Steps:
    1. Fetch from all sources (HN, Reddit, RSS)
    2. Deduplicate articles
    3. Extract keywords
    4. Calculate hot scores
    5. Store in database
    6. Create historical snapshot
    7. Calculate trending up (if enough history)
    """
    try:
        logger.info("fetch_job_started", job_id=job_id)

        # Step 1: Fetch from sources
        all_articles = []

        # Hacker News
        if not sources or "hackernews" in sources:
            hn_articles = await hackernews.fetch_trending_hn(min_score=50, limit=100)
            all_articles.extend(hn_articles)
            logger.info("fetched_hackernews", count=len(hn_articles))

        # Reddit
        if not sources or "reddit" in sources:
            reddit_articles = await reddit.fetch_trending_reddit(
                client_id=settings.reddit_client_id,
                client_secret=settings.reddit_client_secret,
                min_score=50
            )
            all_articles.extend(reddit_articles)
            logger.info("fetched_reddit", count=len(reddit_articles))

        # RSS Feeds
        if not sources or "rss" in sources:
            google_news = await rss.fetch_google_news(limit_per_feed=10)
            substack = await rss.fetch_substack_newsletters(limit_per_feed=10)
            medium = await rss.fetch_medium_publications(limit_per_feed=10)
            tech_news = await rss.fetch_tech_news(limit_per_feed=10)

            all_articles.extend(google_news)
            all_articles.extend(substack)
            all_articles.extend(medium)
            all_articles.extend(tech_news)
            logger.info("fetched_rss", count=len(google_news + substack + medium + tech_news))

            # User-configured feeds from database (added via ThoughtCapture or subscriptions)
            user_feeds = await rss.fetch_user_feeds(limit_per_feed=10)
            all_articles.extend(user_feeds)
            logger.info("fetched_user_feeds", count=len(user_feeds))

        # NewsAPI
        if not sources or "newsapi" in sources:
            if settings.news_api_key:
                newsapi_articles = await newsapi.fetch_trending_news(
                    api_key=settings.news_api_key,
                    categories=["technology", "science", "business"],
                    limit_per_category=20
                )
                all_articles.extend(newsapi_articles)
                logger.info("fetched_newsapi", count=len(newsapi_articles))
            else:
                logger.info("newsapi_skipped", reason="No API key configured")

        # Step 2: Deduplicate
        unique_articles = deduplicator.deduplicate(all_articles)
        logger.info("deduplication_complete", unique=len(unique_articles), original=len(all_articles))

        # Step 3: Extract keywords
        keywords = keyword_extractor.extract_trending_keywords(
            articles=unique_articles,
            top_n=50,
            min_frequency=2
        )
        logger.info("keywords_extracted", count=len(keywords))

        # Step 4: Calculate hot scores
        hot_articles = hot_scorer.calculate_hot_scores(
            articles=unique_articles,
            top_n=100
        )
        logger.info("hot_scores_calculated", count=len(hot_articles))

        # Step 5: Store Hot Now topics in database
        fetched_at = datetime.now()

        # Build hot topics from keywords
        hot_topics = []
        for kw_data in keywords[:10]:  # Top 10 keywords
            # Extract unique sources from sample articles
            sources = list(set(
                art.get("source", "Unknown")
                for art in kw_data.get("sample_articles", [])
            ))

            hot_topics.append({
                "keyword": kw_data.get("keyword", ""),
                "score": float(kw_data.get("frequency", 0) * 10),  # Scale frequency to score
                "mentions": kw_data.get("frequency", 0),
                "summary": f"Trending topic with {kw_data.get('frequency', 0)} mentions across sources",
                "sources": sources if sources else ["Unknown"],
                "sample_articles": kw_data.get("sample_articles", [])[:3]
            })

        # Store for each timeframe (for now all get same data - can filter by date later)
        for timeframe in ["24hr", "3day", "7day"]:
            await database.store_hot_topics(
                topics=hot_topics[:5],  # Top 5 per timeframe
                timeframe=timeframe,
                fetched_at=fetched_at
            )
        logger.info("hot_topics_stored", count=len(hot_topics))

        # Step 6: Create historical snapshot for velocity calculation
        keyword_history = [
            {
                "keyword": kw.get("keyword", ""),
                "mentions": kw.get("frequency", 0),
                "sources": list(set(
                    art.get("source", "Unknown")
                    for art in kw.get("sample_articles", [])
                ))
            }
            for kw in keywords
        ]
        await database.store_keyword_history(keyword_history, date=fetched_at)
        logger.info("keyword_history_stored", count=len(keyword_history))

        # Step 7: Calculate Trending Up (if enough historical data)
        history = await database.get_all_keywords_history(days=14)
        if history and len(history) > 0:
            # Convert keywords list to dict format {keyword: frequency}
            current_keywords_dict = {
                kw.get("keyword", ""): kw.get("frequency", 0)
                for kw in keywords
            }

            trending_up_topics = velocity_calculator.calculate_trending_up(
                current_keywords=current_keywords_dict,
                historical_data=history,
                top_n=5,
                min_growth=50
            )

            if trending_up_topics:
                for timeframe in ["7day", "14day", "30day"]:
                    await database.store_trending_up_topics(
                        topics=trending_up_topics,
                        timeframe=timeframe,
                        fetched_at=fetched_at
                    )
                logger.info("trending_up_topics_stored", count=len(trending_up_topics))

        # Update job status
        fetch_jobs[job_id] = {
            "status": "completed",
            "started_at": fetch_jobs[job_id]["started_at"],
            "completed_at": datetime.now().isoformat(),
            "results": {
                "articles_fetched": len(all_articles),
                "articles_unique": len(unique_articles),
                "keywords_extracted": len(keywords),
                "hot_topics_stored": len(hot_topics[:5]) * 3,  # 3 timeframes
                "keyword_history_stored": len(keyword_history)
            }
        }

        logger.info("fetch_job_completed", job_id=job_id)

    except Exception as e:
        logger.error("fetch_job_failed", job_id=job_id, error=str(e))
        fetch_jobs[job_id] = {
            "status": "failed",
            "error": str(e),
            "started_at": fetch_jobs[job_id]["started_at"],
            "failed_at": datetime.now().isoformat()
        }
