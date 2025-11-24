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
from app.fetchers import hackernews, reddit, rss
from app.analyzers import (
    keyword_extractor,
    deduplicator,
    hot_scorer,
    velocity_calculator,
    historical_snapshot
)
from app.config import settings

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
        # TODO: Query HotTopic table from database
        # For now, return mock data
        return {
            "timeframe": timeframe,
            "topics": [
                {
                    "rank": 1,
                    "keyword": "GPT-5",
                    "score": 94.5,
                    "mentions": 47,
                    "sources": ["HackerNews", "Reddit", "Medium"],
                    "summary": "OpenAI announces GPT-5 with major improvements in reasoning...",
                    "sample_articles": [
                        {
                            "title": "OpenAI announces GPT-5",
                            "url": "https://example.com/gpt5",
                            "source": "HackerNews"
                        }
                    ],
                    "fetched_at": datetime.now().isoformat()
                }
            ],
            "note": "Database integration pending"
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
        # TODO: Query TrendingUpTopic table from database
        # For now, return mock data
        return {
            "timeframe": timeframe,
            "topics": [
                {
                    "rank": 1,
                    "keyword": "Rust async",
                    "velocity": 12.5,
                    "current_volume": 150,
                    "previous_volume": 12,
                    "percent_growth": 1150.0,
                    "summary": "Rapid adoption of async Rust in production systems...",
                    "sources": ["Reddit", "Medium", "HackerNews"],
                    "sample_articles": [
                        {
                            "title": "Why we switched to async Rust",
                            "url": "https://example.com/async-rust",
                            "source": "Medium"
                        }
                    ],
                    "fetched_at": datetime.now().isoformat()
                }
            ],
            "note": "Requires 1-2 weeks of historical data. Database integration pending."
        }

    except Exception as e:
        logger.error("get_trending_up_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch trending up topics")


@router.get("/feeds")
async def list_feeds(category: Optional[str] = None):
    """
    List available feed sources

    Args:
        category: Filter by category (tech, business, science, etc.)

    Returns:
        List of available feeds with metadata
    """
    try:
        # TODO: Query FeedSource table from database
        # For now, return curated list
        feeds = [
            {
                "id": "hn",
                "name": "Hacker News",
                "type": "api",
                "category": "tech",
                "enabled": True
            },
            {
                "id": "reddit-tech",
                "name": "Reddit - r/technology",
                "type": "reddit",
                "category": "tech",
                "enabled": True
            },
            # Add more...
        ]

        if category:
            feeds = [f for f in feeds if f["category"] == category]

        return {"feeds": feeds, "total": len(feeds)}

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
        # TODO: Implement database storage
        # For each timeframe (24hr, 3day, 7day):
        #   - Filter articles by timeframe
        #   - Extract top 5 keywords
        #   - Store in HotTopic table

        # Step 6: Create historical snapshot
        # TODO: Implement snapshot storage
        # snapshot_data = historical_snapshot.prepare_snapshot_data(keywords)
        # await snapshot_service.create_snapshot(snapshot_data)

        # Step 7: Calculate Trending Up (if enough historical data)
        # TODO: Implement trending up calculation
        # historical_data = await snapshot_service.get_all_keywords_history(days=30)
        # trending_up = velocity_calculator.calculate_trending_up(...)

        # Update job status
        fetch_jobs[job_id] = {
            "status": "completed",
            "started_at": fetch_jobs[job_id]["started_at"],
            "completed_at": datetime.now().isoformat(),
            "results": {
                "articles_fetched": len(all_articles),
                "articles_unique": len(unique_articles),
                "keywords_extracted": len(keywords)
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
