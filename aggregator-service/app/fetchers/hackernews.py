"""
Hacker News Fetcher

Fetches stories from Hacker News using the Firebase API.
No rate limits, free to use.

API Docs: https://github.com/HackerNews/API
"""

import httpx
import structlog
from datetime import datetime, timezone
from typing import List, Dict, Optional

logger = structlog.get_logger()

BASE_URL = "https://hacker-news.firebaseio.com/v0"


class HackerNewsFetcher:
    """Fetches content from Hacker News"""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    async def fetch_top_stories(
        self,
        limit: int = 100,
        min_score: Optional[int] = None
    ) -> List[Dict]:
        """
        Fetch top stories from Hacker News

        Args:
            limit: Maximum number of stories to fetch (default 100)
            min_score: Minimum score (points) required (optional filter)

        Returns:
            List of story dictionaries with standardized format
        """
        try:
            # Get list of top story IDs
            response = await self.client.get(f"{BASE_URL}/topstories.json")
            response.raise_for_status()
            story_ids = response.json()[:limit]

            logger.info("fetched_hn_story_ids", count=len(story_ids))

            # Fetch individual stories
            stories = []
            for story_id in story_ids:
                story = await self._fetch_story(story_id)
                if story:
                    # Filter by minimum score if specified
                    if min_score is None or story.get("score", 0) >= min_score:
                        stories.append(story)

            logger.info(
                "fetched_hn_stories",
                total=len(stories),
                min_score=min_score
            )

            return stories

        except Exception as e:
            logger.error("hn_fetch_failed", error=str(e))
            return []

    async def fetch_best_stories(self, limit: int = 100) -> List[Dict]:
        """
        Fetch best stories from Hacker News

        Args:
            limit: Maximum number of stories to fetch

        Returns:
            List of story dictionaries
        """
        try:
            response = await self.client.get(f"{BASE_URL}/beststories.json")
            response.raise_for_status()
            story_ids = response.json()[:limit]

            stories = []
            for story_id in story_ids:
                story = await self._fetch_story(story_id)
                if story:
                    stories.append(story)

            logger.info("fetched_hn_best_stories", count=len(stories))
            return stories

        except Exception as e:
            logger.error("hn_best_fetch_failed", error=str(e))
            return []

    async def _fetch_story(self, story_id: int) -> Optional[Dict]:
        """
        Fetch individual story details

        Args:
            story_id: Hacker News story ID

        Returns:
            Standardized story dictionary or None if failed
        """
        try:
            response = await self.client.get(f"{BASE_URL}/item/{story_id}.json")
            response.raise_for_status()
            item = response.json()

            # Skip if not a story or deleted
            if not item or item.get("type") != "story" or item.get("deleted"):
                return None

            # Return standardized format
            return {
                "id": str(item.get("id")),
                "title": item.get("title", ""),
                "url": item.get("url", f"https://news.ycombinator.com/item?id={item.get('id')}"),
                "text": item.get("text", ""),  # For Ask HN posts
                "score": item.get("score", 0),
                "author": item.get("by", ""),
                "comments": item.get("descendants", 0),
                "published_at": datetime.fromtimestamp(
                    item.get("time", 0),
                    tz=timezone.utc
                ).isoformat(),
                "source": "HackerNews",
                "source_id": str(story_id)
            }

        except Exception as e:
            logger.warning("hn_story_fetch_failed", story_id=story_id, error=str(e))
            return None

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Convenience function for quick fetching
async def fetch_trending_hn(min_score: int = 50, limit: int = 100) -> List[Dict]:
    """
    Fetch trending stories from Hacker News

    Args:
        min_score: Minimum score to be considered trending
        limit: Maximum stories to fetch

    Returns:
        List of trending stories
    """
    fetcher = HackerNewsFetcher()
    try:
        stories = await fetcher.fetch_top_stories(limit=limit, min_score=min_score)
        return stories
    finally:
        await fetcher.close()
