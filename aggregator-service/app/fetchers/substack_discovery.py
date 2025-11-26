"""
Substack Discovery Fetcher

Fetches trending posts from popular Substack newsletters using the substack-api package.
Aggregates top posts across curated tech/business newsletters for content discovery.
"""

import structlog
from datetime import datetime
from typing import List, Dict, Optional
import asyncio

logger = structlog.get_logger()


# Curated list of popular tech/business Substacks for discovery
POPULAR_SUBSTACKS = {
    "technology": [
        {"url": "https://stratechery.com", "name": "Stratechery"},
        {"url": "https://www.platformer.news", "name": "Platformer"},
        {"url": "https://www.theverge.com", "name": "The Verge"},  # Has RSS
        {"url": "https://newsletter.pragmaticengineer.com", "name": "Pragmatic Engineer"},
        {"url": "https://www.lennysnewsletter.com", "name": "Lenny's Newsletter"},
        {"url": "https://www.notboring.co", "name": "Not Boring"},
        {"url": "https://www.semianalysis.com", "name": "SemiAnalysis"},
    ],
    "programming": [
        {"url": "https://newsletter.pragmaticengineer.com", "name": "Pragmatic Engineer"},
        {"url": "https://blog.bytebytego.com", "name": "ByteByteGo"},
        {"url": "https://www.developing.dev", "name": "Developing Dev"},
        {"url": "https://www.theengineeringmanager.com", "name": "The Engineering Manager"},
    ],
    "ai": [
        {"url": "https://www.oneusefulthing.org", "name": "One Useful Thing"},
        {"url": "https://www.importai.net", "name": "Import AI"},
        {"url": "https://simonwillison.substack.com", "name": "Simon Willison"},
        {"url": "https://aisnakeoil.substack.com", "name": "AI Snake Oil"},
    ],
    "startup": [
        {"url": "https://www.notboring.co", "name": "Not Boring"},
        {"url": "https://www.lennysnewsletter.com", "name": "Lenny's Newsletter"},
        {"url": "https://www.growthunhinged.com", "name": "Growth Unhinged"},
        {"url": "https://every.to", "name": "Every"},
    ],
    "finance": [
        {"url": "https://www.thegeneralist.com", "name": "The Generalist"},
        {"url": "https://www.platformer.news", "name": "Platformer"},
        {"url": "https://diff.substack.com", "name": "The Diff"},
    ],
}


class SubstackDiscoveryFetcher:
    """Fetches trending posts from popular Substack newsletters"""

    def __init__(self):
        self._newsletter_cache = {}

    async def fetch_newsletter_top_posts(
        self,
        newsletter_url: str,
        newsletter_name: str,
        limit: int = 5
    ) -> List[Dict]:
        """
        Fetch top posts from a specific Substack newsletter

        Args:
            newsletter_url: Base URL of the Substack newsletter
            newsletter_name: Display name for the newsletter
            limit: Maximum number of posts to return

        Returns:
            List of article dictionaries in standardized format
        """
        try:
            from substack_api import Newsletter

            # Initialize newsletter (using cache to avoid repeated lookups)
            if newsletter_url not in self._newsletter_cache:
                self._newsletter_cache[newsletter_url] = Newsletter(newsletter_url)

            newsletter = self._newsletter_cache[newsletter_url]

            # Fetch top posts sorted by popularity
            posts = newsletter.get_posts(sorting="top", limit=limit)

            articles = []
            for post in posts:
                try:
                    article = {
                        "title": getattr(post, "title", "Untitled"),
                        "url": getattr(post, "canonical_url", newsletter_url),
                        "author": getattr(post, "author_name", newsletter_name),
                        "source": f"substack:{newsletter_name}",
                        "source_type": "substack",
                        "published_at": self._parse_date(getattr(post, "post_date", None)),
                        "summary": self._get_summary(post),
                        "score": self._get_score(post),
                        "engagement_score": self._get_score(post) * 10,  # Normalized
                        "type": "substack_discovery",
                        "newsletter_url": newsletter_url,
                    }
                    articles.append(article)
                except Exception as e:
                    logger.warning(
                        "substack_post_parse_error",
                        newsletter=newsletter_name,
                        error=str(e)
                    )
                    continue

            logger.info(
                "fetched_substack_newsletter",
                newsletter=newsletter_name,
                count=len(articles)
            )
            return articles

        except Exception as e:
            logger.error(
                "substack_newsletter_fetch_failed",
                newsletter=newsletter_name,
                url=newsletter_url,
                error=str(e)
            )
            # Fallback to RSS if substack-api fails
            return await self._fallback_to_rss(newsletter_url, newsletter_name, limit)

    async def _fallback_to_rss(
        self,
        newsletter_url: str,
        newsletter_name: str,
        limit: int
    ) -> List[Dict]:
        """Fallback to RSS feed if substack-api fails"""
        try:
            import feedparser
            import httpx

            # Substack RSS is at /feed
            feed_url = f"{newsletter_url.rstrip('/')}/feed"

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(feed_url)
                if response.status_code != 200:
                    return []

                feed = feedparser.parse(response.content)
                articles = []

                for entry in feed.entries[:limit]:
                    articles.append({
                        "title": entry.get("title", "Untitled"),
                        "url": entry.get("link", newsletter_url),
                        "author": newsletter_name,
                        "source": f"substack:{newsletter_name}",
                        "source_type": "substack",
                        "published_at": self._parse_feed_date(entry),
                        "summary": self._clean_summary(entry.get("summary", "")),
                        "score": 0,  # RSS doesn't provide scores
                        "engagement_score": 0,
                        "type": "substack_discovery",
                        "newsletter_url": newsletter_url,
                        "fallback": True,
                    })

                logger.info(
                    "substack_rss_fallback",
                    newsletter=newsletter_name,
                    count=len(articles)
                )
                return articles

        except Exception as e:
            logger.error(
                "substack_rss_fallback_failed",
                newsletter=newsletter_name,
                error=str(e)
            )
            return []

    async def fetch_category_top_posts(
        self,
        category: str = "technology",
        posts_per_newsletter: int = 3,
        max_total: int = 20
    ) -> List[Dict]:
        """
        Fetch top posts from all newsletters in a category

        Args:
            category: Category to fetch (technology, programming, ai, startup, finance)
            posts_per_newsletter: Number of top posts per newsletter
            max_total: Maximum total posts to return

        Returns:
            List of articles sorted by engagement score
        """
        newsletters = POPULAR_SUBSTACKS.get(category, [])
        if not newsletters:
            logger.warning("unknown_substack_category", category=category)
            return []

        # Fetch from all newsletters concurrently
        tasks = [
            self.fetch_newsletter_top_posts(
                nl["url"],
                nl["name"],
                posts_per_newsletter
            )
            for nl in newsletters
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten and filter out exceptions
        all_articles = []
        for result in results:
            if isinstance(result, list):
                all_articles.extend(result)

        # Sort by engagement score and limit
        all_articles.sort(key=lambda x: x.get("engagement_score", 0), reverse=True)
        return all_articles[:max_total]

    async def fetch_all_trending(
        self,
        categories: Optional[List[str]] = None,
        posts_per_newsletter: int = 3,
        limit: int = 30
    ) -> List[Dict]:
        """
        Fetch trending posts across multiple categories

        Args:
            categories: List of categories to fetch (default: all)
            posts_per_newsletter: Posts per newsletter
            limit: Maximum total posts

        Returns:
            Aggregated list of trending posts
        """
        categories = categories or list(POPULAR_SUBSTACKS.keys())

        # Fetch from all categories concurrently
        tasks = [
            self.fetch_category_top_posts(
                cat,
                posts_per_newsletter,
                max_total=limit // len(categories)
            )
            for cat in categories
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten and deduplicate by URL
        seen_urls = set()
        all_articles = []
        for result in results:
            if isinstance(result, list):
                for article in result:
                    if article["url"] not in seen_urls:
                        seen_urls.add(article["url"])
                        all_articles.append(article)

        # Sort by engagement score
        all_articles.sort(key=lambda x: x.get("engagement_score", 0), reverse=True)
        return all_articles[:limit]

    async def search_publications(
        self,
        query: str,
        limit: int = 5
    ) -> List[Dict]:
        """
        Search for Substack publications by name

        Note: substack-api doesn't have a global search API, so this uses
        a simple substring match against our curated list.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            List of matching publications
        """
        query_lower = query.lower()
        matches = []

        for category, newsletters in POPULAR_SUBSTACKS.items():
            for nl in newsletters:
                if query_lower in nl["name"].lower():
                    matches.append({
                        "name": nl["name"],
                        "platform": "substack",
                        "handle": nl["url"].split("//")[1].split(".")[0],
                        "feed_url": f"{nl['url'].rstrip('/')}/feed",
                        "profile_url": nl["url"],
                        "category": category,
                        "description": f"Popular {category} newsletter on Substack",
                    })

        # Deduplicate by URL
        seen = set()
        unique = []
        for m in matches:
            if m["profile_url"] not in seen:
                seen.add(m["profile_url"])
                unique.append(m)

        return unique[:limit]

    def _parse_date(self, date_value) -> str:
        """Parse date from substack-api post"""
        if date_value is None:
            return datetime.utcnow().isoformat()
        if isinstance(date_value, datetime):
            return date_value.isoformat()
        if isinstance(date_value, str):
            return date_value
        return datetime.utcnow().isoformat()

    def _parse_feed_date(self, entry: Dict) -> str:
        """Parse date from RSS entry"""
        from dateutil import parser as date_parser

        for field in ["published", "updated", "created"]:
            if field in entry:
                try:
                    return date_parser.parse(entry[field]).isoformat()
                except Exception:
                    continue
        return datetime.utcnow().isoformat()

    def _get_summary(self, post) -> str:
        """Extract summary from post"""
        subtitle = getattr(post, "subtitle", None)
        if subtitle:
            return subtitle[:300]

        body = getattr(post, "truncated_body_text", None)
        if body:
            return body[:300]

        return ""

    def _get_score(self, post) -> int:
        """Extract engagement score from post"""
        reactions = getattr(post, "reactions", None)
        if reactions and isinstance(reactions, dict):
            return reactions.get("like", 0) + reactions.get("love", 0)

        likes = getattr(post, "likes", 0)
        if likes:
            return likes

        return 0

    def _clean_summary(self, html: str) -> str:
        """Clean HTML summary"""
        from bs4 import BeautifulSoup
        try:
            soup = BeautifulSoup(html, "html.parser")
            text = soup.get_text(separator=" ", strip=True)
            return text[:300]
        except Exception:
            return html[:300]


# Module-level convenience functions
_fetcher = SubstackDiscoveryFetcher()


async def fetch_substack_trending(
    categories: Optional[List[str]] = None,
    limit: int = 20
) -> List[Dict]:
    """Fetch trending Substack posts"""
    return await _fetcher.fetch_all_trending(categories=categories, limit=limit)


async def search_substack_publications(query: str, limit: int = 5) -> List[Dict]:
    """Search for Substack publications"""
    return await _fetcher.search_publications(query, limit)
