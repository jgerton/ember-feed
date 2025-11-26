"""
Discovery Fetcher - Content Discovery Aggregator

Aggregates trending content from Substack and Medium for serendipitous discovery.
Provides unified APIs for discovering trending content and searching for authors.
"""

import structlog
from typing import List, Dict, Optional
import asyncio

from .substack_discovery import SubstackDiscoveryFetcher, fetch_substack_trending, search_substack_publications
from .medium_discovery import MediumDiscoveryFetcher, fetch_medium_trending, search_medium_authors, is_medium_api_available

logger = structlog.get_logger()


class DiscoveryFetcher:
    """
    Aggregate trending content across Substack and Medium platforms.

    Provides unified discovery of:
    - Trending articles from popular newsletters and publications
    - Author/publication search across platforms
    - Category-based content discovery
    """

    def __init__(self):
        self.substack = SubstackDiscoveryFetcher()
        self.medium = MediumDiscoveryFetcher()

    async def fetch_all_trending(
        self,
        categories: Optional[List[str]] = None,
        limit: int = 30
    ) -> List[Dict]:
        """
        Fetch trending content from all supported platforms

        Args:
            categories: Categories to fetch (technology, programming, ai, startup, finance)
            limit: Maximum total articles to return

        Returns:
            List of trending articles sorted by engagement score
        """
        categories = categories or ["technology", "programming", "startup"]

        # Fetch from both platforms concurrently
        substack_limit = limit // 2 + 5  # Fetch extra to account for dedup
        medium_limit = limit // 2 + 5

        substack_task = self.substack.fetch_all_trending(
            categories=categories,
            limit=substack_limit
        )
        medium_task = self.medium.fetch_all_trending(
            categories=categories,
            limit=medium_limit
        )

        results = await asyncio.gather(
            substack_task,
            medium_task,
            return_exceptions=True
        )

        # Combine results
        all_articles = []

        for result in results:
            if isinstance(result, list):
                all_articles.extend(result)
            elif isinstance(result, Exception):
                logger.warning("discovery_platform_error", error=str(result))

        # Deduplicate by URL
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            if article["url"] not in seen_urls:
                seen_urls.add(article["url"])
                unique_articles.append(article)

        # Sort by normalized engagement score
        unique_articles = self._rank_articles(unique_articles)

        logger.info(
            "discovery_fetch_complete",
            total=len(unique_articles),
            sources=["substack", "medium"]
        )

        return unique_articles[:limit]

    async def discover_authors(
        self,
        category: str = "technology"
    ) -> Dict:
        """
        Discover popular authors across platforms

        Args:
            category: Category to discover authors for

        Returns:
            Dict with substack_authors and medium_writers lists
        """
        # Fetch author recommendations from both platforms
        substack_task = self.substack.fetch_category_top_posts(
            category=category,
            posts_per_newsletter=1,
            max_total=10
        )
        medium_task = self.medium.get_top_writers(
            tag=self._category_to_tag(category)
        )

        results = await asyncio.gather(
            substack_task,
            medium_task,
            return_exceptions=True
        )

        # Extract unique authors from Substack posts
        substack_posts = results[0] if isinstance(results[0], list) else []
        substack_authors = self._extract_authors_from_posts(substack_posts, "substack")

        # Medium writers
        medium_writers = results[1] if isinstance(results[1], list) else []

        return {
            "substack_authors": substack_authors[:10],
            "medium_writers": medium_writers[:10],
            "category": category
        }

    async def search_authors(
        self,
        query: str,
        platform: str = "all",
        limit: int = 10
    ) -> List[Dict]:
        """
        Search for authors/publications across platforms

        Args:
            query: Search query (author name or publication name)
            platform: Platform to search ("all", "substack", "medium")
            limit: Maximum results

        Returns:
            List of matching authors/publications
        """
        results = []

        if platform in ["all", "substack"]:
            try:
                substack_results = await self.substack.search_publications(
                    query,
                    limit=limit // 2 if platform == "all" else limit
                )
                results.extend(substack_results)
            except Exception as e:
                logger.warning("substack_search_error", error=str(e))

        if platform in ["all", "medium"]:
            try:
                medium_results = await self.medium.search_authors(
                    query,
                    limit=limit // 2 if platform == "all" else limit
                )
                results.extend(medium_results)
            except Exception as e:
                logger.warning("medium_search_error", error=str(e))

        # Sort by relevance (exact matches first)
        query_lower = query.lower()
        results.sort(key=lambda x: (
            0 if query_lower == x.get("name", "").lower() else
            1 if query_lower in x.get("name", "").lower() else
            2
        ))

        return results[:limit]

    def _rank_articles(self, articles: List[Dict]) -> List[Dict]:
        """
        Rank articles by normalized engagement score

        Normalizes scores across platforms:
        - Substack: likes * 10 (typically 10-500 likes)
        - Medium: claps directly (typically 50-5000 claps)
        """
        for article in articles:
            source_type = article.get("source_type", "")

            if source_type == "substack":
                # Substack likes are typically lower, normalize
                raw_score = article.get("score", 0) or article.get("engagement_score", 0)
                article["normalized_score"] = raw_score * 10
            elif source_type == "medium":
                # Medium claps are already in a good range
                article["normalized_score"] = article.get("claps", 0) or article.get("engagement_score", 0)
            else:
                article["normalized_score"] = article.get("engagement_score", 0)

        return sorted(articles, key=lambda x: x.get("normalized_score", 0), reverse=True)

    def _category_to_tag(self, category: str) -> str:
        """Convert category to Medium tag"""
        mapping = {
            "technology": "technology",
            "programming": "programming",
            "ai": "artificial-intelligence",
            "startup": "startup",
            "finance": "fintech",
        }
        return mapping.get(category, category)

    def _extract_authors_from_posts(
        self,
        posts: List[Dict],
        platform: str
    ) -> List[Dict]:
        """Extract unique authors from posts"""
        seen = set()
        authors = []

        for post in posts:
            author_name = post.get("author", "")
            if author_name and author_name not in seen:
                seen.add(author_name)
                authors.append({
                    "name": author_name,
                    "platform": platform,
                    "feed_url": post.get("newsletter_url", "") + "/feed" if platform == "substack" else "",
                    "profile_url": post.get("newsletter_url", ""),
                    "source": post.get("source", ""),
                    "top_score": post.get("engagement_score", 0),
                })

        return sorted(authors, key=lambda x: x.get("top_score", 0), reverse=True)

    def get_platform_status(self) -> Dict:
        """Get status of discovery platforms"""
        return {
            "substack": {
                "available": True,
                "method": "substack-api + RSS fallback"
            },
            "medium": {
                "available": True,
                "method": "RapidAPI" if is_medium_api_available() else "RSS fallback",
                "api_configured": is_medium_api_available()
            }
        }


# Module-level singleton and convenience functions
_discovery = DiscoveryFetcher()


async def discover_trending(
    categories: Optional[List[str]] = None,
    limit: int = 30
) -> Dict:
    """
    Discover trending content across platforms

    Returns:
        Dict with articles, sources, and categories
    """
    articles = await _discovery.fetch_all_trending(
        categories=categories,
        limit=limit
    )

    return {
        "articles": articles,
        "sources": ["substack", "medium"],
        "categories": categories or ["technology", "programming", "startup"],
        "platform_status": _discovery.get_platform_status()
    }


async def discover_authors(category: str = "technology") -> Dict:
    """Discover popular authors in a category"""
    return await _discovery.discover_authors(category)


async def search_all_authors(
    query: str,
    platform: str = "all",
    limit: int = 10
) -> Dict:
    """Search for authors across platforms"""
    results = await _discovery.search_authors(query, platform, limit)
    return {
        "results": results,
        "query": query,
        "platform": platform
    }
