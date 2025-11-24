"""
RSS Feed Fetcher

Fetches content from RSS/Atom feeds including:
- Google News RSS
- Substack newsletters
- Medium publications
- Dev.to
- Tech blogs and news sites

Uses feedparser library for parsing.
"""

import feedparser
import httpx
import structlog
from datetime import datetime, timezone
from typing import List, Dict, Optional
from dateutil import parser as date_parser

logger = structlog.get_logger()


class RSSFetcher:
    """Fetches content from RSS/Atom feeds"""

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; TrendingAggregator/1.0)"
            }
        )

    async def fetch_feed(
        self,
        feed_url: str,
        source_name: str,
        limit: Optional[int] = None
    ) -> List[Dict]:
        """
        Fetch and parse RSS/Atom feed

        Args:
            feed_url: URL of the RSS/Atom feed
            source_name: Display name for this source
            limit: Maximum number of entries to return

        Returns:
            List of article dictionaries in standardized format
        """
        try:
            # Fetch feed content
            response = await self.client.get(feed_url)
            response.raise_for_status()

            # Parse feed
            feed = feedparser.parse(response.content)

            if feed.bozo:  # Feed parsing had errors
                logger.warning(
                    "rss_parse_warning",
                    source=source_name,
                    error=str(feed.bozo_exception)
                )

            # Convert entries to standardized format
            articles = []
            entries = feed.entries[:limit] if limit else feed.entries

            for entry in entries:
                article = self._standardize_entry(entry, source_name, feed_url)
                if article:
                    articles.append(article)

            logger.info(
                "fetched_rss_feed",
                source=source_name,
                count=len(articles)
            )

            return articles

        except Exception as e:
            logger.error(
                "rss_fetch_failed",
                source=source_name,
                url=feed_url,
                error=str(e)
            )
            return []

    def _standardize_entry(
        self,
        entry: Dict,
        source_name: str,
        feed_url: str
    ) -> Optional[Dict]:
        """
        Convert feed entry to standardized format

        Args:
            entry: feedparser entry object
            source_name: Name of the source
            feed_url: Original feed URL

        Returns:
            Standardized article dictionary
        """
        try:
            # Extract title
            title = entry.get("title", "").strip()
            if not title:
                return None

            # Extract URL
            url = entry.get("link", "")
            if not url:
                return None

            # Extract description/summary
            description = ""
            if "summary" in entry:
                description = entry.summary
            elif "description" in entry:
                description = entry.description
            elif "content" in entry and entry.content:
                description = entry.content[0].get("value", "")

            # Extract published date
            published_at = None
            if "published_parsed" in entry and entry.published_parsed:
                published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
            elif "updated_parsed" in entry and entry.updated_parsed:
                published_at = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc).isoformat()
            elif "published" in entry:
                try:
                    published_at = date_parser.parse(entry.published).isoformat()
                except:
                    pass

            if not published_at:
                published_at = datetime.now(timezone.utc).isoformat()

            # Extract author
            author = entry.get("author", "")
            if not author and "authors" in entry and entry.authors:
                author = entry.authors[0].get("name", "")

            return {
                "id": entry.get("id", url),
                "title": title,
                "url": url,
                "text": description,
                "score": 0,  # RSS feeds don't have scores
                "author": author,
                "comments": 0,  # RSS feeds don't have comment counts
                "published_at": published_at,
                "source": source_name,
                "source_id": entry.get("id", url),
                "feed_url": feed_url
            }

        except Exception as e:
            logger.warning("rss_entry_parse_failed", error=str(e))
            return None

    async def fetch_multiple_feeds(
        self,
        feeds: List[Dict[str, str]],
        limit_per_feed: Optional[int] = None
    ) -> List[Dict]:
        """
        Fetch multiple RSS feeds concurrently

        Args:
            feeds: List of dicts with 'url' and 'name' keys
            limit_per_feed: Max entries per feed

        Returns:
            Combined list of articles from all feeds
        """
        all_articles = []

        for feed_info in feeds:
            articles = await self.fetch_feed(
                feed_url=feed_info["url"],
                source_name=feed_info["name"],
                limit=limit_per_feed
            )
            all_articles.extend(articles)

        return all_articles

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Pre-defined feed collections
GOOGLE_NEWS_FEEDS = [
    {"url": "https://news.google.com/rss", "name": "Google News"},
    {"url": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB", "name": "Google News - Technology"},
    {"url": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB", "name": "Google News - Business"},
    {"url": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFpxYW5RU0FtVnVHZ0pWVXlnQVAB", "name": "Google News - Science"},
]

TOP_SUBSTACK_FEEDS = [
    {"url": "https://blog.bytebytego.com/feed", "name": "ByteByteGo"},
    {"url": "https://newsletter.pragmaticengineer.com/feed", "name": "The Pragmatic Engineer"},
    {"url": "https://www.lennysnewsletter.com/feed", "name": "Lenny's Newsletter"},
]

TOP_MEDIUM_FEEDS = [
    {"url": "https://betterprogramming.pub/feed", "name": "Better Programming"},
    {"url": "https://medium.com/feed/swlh", "name": "The Startup"},
    {"url": "https://towardsdatascience.com/feed", "name": "Towards Data Science"},
    {"url": "https://javascript.plainenglish.io/feed", "name": "JavaScript in Plain English"},
    {"url": "https://levelup.gitconnected.com/feed", "name": "Level Up Coding"},
]

TECH_NEWS_FEEDS = [
    {"url": "https://techcrunch.com/feed/", "name": "TechCrunch"},
    {"url": "https://www.theverge.com/rss/index.xml", "name": "The Verge"},
    {"url": "https://feeds.arstechnica.com/arstechnica/index", "name": "Ars Technica"},
]


# Convenience functions
async def fetch_google_news(limit_per_feed: int = 10) -> List[Dict]:
    """Fetch Google News RSS feeds"""
    fetcher = RSSFetcher()
    try:
        return await fetcher.fetch_multiple_feeds(GOOGLE_NEWS_FEEDS, limit_per_feed)
    finally:
        await fetcher.close()


async def fetch_substack_newsletters(limit_per_feed: int = 10) -> List[Dict]:
    """Fetch top Substack newsletters"""
    fetcher = RSSFetcher()
    try:
        return await fetcher.fetch_multiple_feeds(TOP_SUBSTACK_FEEDS, limit_per_feed)
    finally:
        await fetcher.close()


async def fetch_medium_publications(limit_per_feed: int = 10) -> List[Dict]:
    """Fetch top Medium publications"""
    fetcher = RSSFetcher()
    try:
        return await fetcher.fetch_multiple_feeds(TOP_MEDIUM_FEEDS, limit_per_feed)
    finally:
        await fetcher.close()


async def fetch_tech_news(limit_per_feed: int = 10) -> List[Dict]:
    """Fetch tech news RSS feeds"""
    fetcher = RSSFetcher()
    try:
        return await fetcher.fetch_multiple_feeds(TECH_NEWS_FEEDS, limit_per_feed)
    finally:
        await fetcher.close()
