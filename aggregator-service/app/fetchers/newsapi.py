"""
NewsAPI Fetcher

Fetches top headlines and news articles from NewsAPI.org.
Free tier: 100 requests/day, headlines only, 24-hour delayed data.

API Docs: https://newsapi.org/docs
"""

import httpx
import structlog
from datetime import datetime, timezone
from typing import List, Dict, Optional
from dateutil import parser as date_parser

logger = structlog.get_logger()

BASE_URL = "https://newsapi.org/v2"


class NewsAPIFetcher:
    """Fetches content from NewsAPI.org"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def fetch_top_headlines(
        self,
        category: Optional[str] = None,
        country: str = "us",
        limit: int = 100
    ) -> List[Dict]:
        """
        Fetch top headlines from NewsAPI

        Args:
            category: business, entertainment, general, health, science, sports, technology
            country: 2-letter ISO country code (default: us)
            limit: Maximum articles to return (max 100 per request)

        Returns:
            List of article dictionaries with standardized format
        """
        try:
            params = {
                "apiKey": self.api_key,
                "country": country,
                "pageSize": min(limit, 100),
            }
            if category:
                params["category"] = category

            response = await self.client.get(
                f"{BASE_URL}/top-headlines",
                params=params
            )
            response.raise_for_status()
            data = response.json()

            if data.get("status") != "ok":
                logger.error("newsapi_error", message=data.get("message"))
                return []

            articles = []
            for article in data.get("articles", []):
                standardized = self._standardize_article(article)
                if standardized:
                    articles.append(standardized)

            logger.info(
                "fetched_newsapi_headlines",
                count=len(articles),
                category=category,
                country=country
            )

            return articles

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.error("newsapi_unauthorized", message="Invalid API key")
            elif e.response.status_code == 429:
                logger.error("newsapi_rate_limited", message="Rate limit exceeded")
            else:
                logger.error("newsapi_http_error", status=e.response.status_code)
            return []
        except Exception as e:
            logger.error("newsapi_fetch_failed", error=str(e))
            return []

    async def fetch_everything(
        self,
        query: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        sort_by: str = "publishedAt",
        limit: int = 100
    ) -> List[Dict]:
        """
        Search all articles (requires paid plan for recent articles)

        Args:
            query: Keywords or phrases to search for
            from_date: ISO date string for oldest article
            to_date: ISO date string for newest article
            sort_by: relevancy, popularity, or publishedAt
            limit: Maximum articles to return

        Returns:
            List of article dictionaries
        """
        try:
            params = {
                "apiKey": self.api_key,
                "q": query,
                "sortBy": sort_by,
                "pageSize": min(limit, 100),
                "language": "en",
            }
            if from_date:
                params["from"] = from_date
            if to_date:
                params["to"] = to_date

            response = await self.client.get(
                f"{BASE_URL}/everything",
                params=params
            )
            response.raise_for_status()
            data = response.json()

            if data.get("status") != "ok":
                logger.error("newsapi_error", message=data.get("message"))
                return []

            articles = []
            for article in data.get("articles", []):
                standardized = self._standardize_article(article)
                if standardized:
                    articles.append(standardized)

            logger.info(
                "fetched_newsapi_everything",
                count=len(articles),
                query=query
            )

            return articles

        except Exception as e:
            logger.error("newsapi_everything_failed", error=str(e))
            return []

    def _standardize_article(self, article: Dict) -> Optional[Dict]:
        """
        Convert NewsAPI article to standardized format

        Args:
            article: Raw NewsAPI article

        Returns:
            Standardized article dictionary or None if invalid
        """
        # Skip articles without URL or title
        if not article.get("url") or not article.get("title"):
            return None

        # Skip removed articles
        if article.get("title") == "[Removed]":
            return None

        # Parse published date
        published_at = None
        if article.get("publishedAt"):
            try:
                published_at = date_parser.parse(article["publishedAt"]).isoformat()
            except Exception:
                published_at = datetime.now(timezone.utc).isoformat()

        # Get source name
        source_name = "NewsAPI"
        if article.get("source") and article["source"].get("name"):
            source_name = article["source"]["name"]

        return {
            "id": article.get("url"),  # Use URL as unique ID
            "title": article.get("title", ""),
            "url": article.get("url", ""),
            "text": article.get("description", "") or article.get("content", ""),
            "score": 0,  # NewsAPI doesn't provide engagement scores
            "author": article.get("author", ""),
            "comments": 0,
            "published_at": published_at,
            "source": source_name,
            "source_id": article.get("url"),
            "image_url": article.get("urlToImage"),
        }

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Convenience function for quick fetching
async def fetch_trending_news(
    api_key: str,
    categories: Optional[List[str]] = None,
    limit_per_category: int = 20
) -> List[Dict]:
    """
    Fetch trending news across multiple categories

    Args:
        api_key: NewsAPI API key
        categories: List of categories to fetch (default: tech-focused)
        limit_per_category: Articles per category

    Returns:
        List of trending articles
    """
    if not api_key:
        logger.warning("newsapi_skipped", reason="No API key configured")
        return []

    if categories is None:
        # Default to tech-related categories
        categories = ["technology", "science", "business"]

    fetcher = NewsAPIFetcher(api_key)
    try:
        all_articles = []

        for category in categories:
            articles = await fetcher.fetch_top_headlines(
                category=category,
                limit=limit_per_category
            )
            all_articles.extend(articles)

        # Also fetch general headlines
        general = await fetcher.fetch_top_headlines(
            category="general",
            limit=limit_per_category
        )
        all_articles.extend(general)

        logger.info("newsapi_fetch_complete", total=len(all_articles))
        return all_articles

    finally:
        await fetcher.close()
