"""
Medium Discovery Fetcher

Fetches trending articles from Medium using the RapidAPI Medium2 endpoint.
Also supports RSS fallback for specific author feeds.
"""

import httpx
import structlog
import os
from datetime import datetime
from typing import List, Dict, Optional
import asyncio

logger = structlog.get_logger()


# Curated list of popular Medium publications/authors for discovery
POPULAR_MEDIUM_AUTHORS = {
    "technology": [
        {"username": "Netflix_Techblog", "name": "Netflix Technology Blog"},
        {"username": "Airbnb-Engineering", "name": "Airbnb Engineering"},
        {"username": "UXDesign.cc", "name": "UX Collective"},
        {"username": "better-programming", "name": "Better Programming"},
        {"username": "hackernoon", "name": "HackerNoon"},
    ],
    "programming": [
        {"username": "javascript-scene", "name": "JavaScript Scene"},
        {"username": "better-programming", "name": "Better Programming"},
        {"username": "codeburst", "name": "codeburst"},
        {"username": "level-up-coding", "name": "Level Up Coding"},
    ],
    "ai": [
        {"username": "towards-artificial-intelligence", "name": "Towards AI"},
        {"username": "towards-data-science", "name": "Towards Data Science"},
        {"username": "becominghuman-ai", "name": "Becoming Human"},
    ],
    "startup": [
        {"username": "swlh", "name": "The Startup"},
        {"username": "entrepreneur-handbook", "name": "Entrepreneur's Handbook"},
        {"username": "building-the-startup", "name": "Building the Startup"},
    ],
}

# Trending tags to explore
TRENDING_TAGS = [
    "programming", "technology", "artificial-intelligence",
    "software-development", "startup", "data-science",
    "machine-learning", "javascript", "python", "web-development"
]


class MediumDiscoveryFetcher:
    """Fetches trending articles from Medium via RapidAPI or RSS"""

    RAPIDAPI_BASE_URL = "https://medium2.p.rapidapi.com"

    def __init__(self):
        self.api_key = os.getenv("RAPIDAPI_KEY")
        self.headers = {}
        if self.api_key:
            self.headers = {
                "X-RapidAPI-Key": self.api_key,
                "X-RapidAPI-Host": "medium2.p.rapidapi.com"
            }

    def is_api_available(self) -> bool:
        """Check if RapidAPI key is configured"""
        return bool(self.api_key)

    async def fetch_trending_by_tag(
        self,
        tag: str,
        limit: int = 10
    ) -> List[Dict]:
        """
        Fetch trending articles for a specific tag using RapidAPI

        Args:
            tag: Medium tag to fetch (e.g., "programming", "technology")
            limit: Maximum number of articles

        Returns:
            List of articles in standardized format
        """
        if not self.is_api_available():
            logger.info("medium_api_unavailable", reason="No RAPIDAPI_KEY configured")
            return []

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Fetch trending articles for tag
                response = await client.get(
                    f"{self.RAPIDAPI_BASE_URL}/topfeeds/{tag}/hot",
                    headers=self.headers
                )

                if response.status_code != 200:
                    logger.warning(
                        "medium_api_error",
                        tag=tag,
                        status=response.status_code
                    )
                    return []

                data = response.json()
                article_ids = data.get("topfeeds", [])[:limit]

                # Fetch article details for each ID
                articles = []
                for article_id in article_ids:
                    article = await self._fetch_article_details(client, article_id)
                    if article:
                        articles.append(article)

                logger.info(
                    "fetched_medium_trending",
                    tag=tag,
                    count=len(articles)
                )
                return articles

        except Exception as e:
            logger.error(
                "medium_trending_fetch_failed",
                tag=tag,
                error=str(e)
            )
            return []

    async def _fetch_article_details(
        self,
        client: httpx.AsyncClient,
        article_id: str
    ) -> Optional[Dict]:
        """Fetch detailed information about a specific article"""
        try:
            response = await client.get(
                f"{self.RAPIDAPI_BASE_URL}/article/{article_id}",
                headers=self.headers
            )

            if response.status_code != 200:
                return None

            data = response.json()

            return {
                "title": data.get("title", "Untitled"),
                "url": f"https://medium.com/@{data.get('author', {}).get('username', '')}/{data.get('unique_slug', article_id)}",
                "author": data.get("author", {}).get("fullname", "Unknown"),
                "author_username": data.get("author", {}).get("username", ""),
                "source": "medium:trending",
                "source_type": "medium",
                "published_at": self._format_timestamp(data.get("published_at")),
                "summary": data.get("subtitle", "")[:300],
                "claps": data.get("claps", 0),
                "reading_time": data.get("reading_time", 0),
                "engagement_score": data.get("claps", 0),
                "type": "medium_discovery",
                "tags": data.get("tags", []),
            }

        except Exception as e:
            logger.warning("medium_article_fetch_failed", article_id=article_id, error=str(e))
            return None

    async def fetch_author_articles(
        self,
        username: str,
        display_name: str,
        limit: int = 5
    ) -> List[Dict]:
        """
        Fetch recent articles from a specific Medium author via RSS

        Args:
            username: Medium username
            display_name: Display name for the author
            limit: Maximum articles to fetch

        Returns:
            List of articles
        """
        try:
            import feedparser

            feed_url = f"https://medium.com/feed/@{username}"

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(feed_url)
                if response.status_code != 200:
                    return []

                feed = feedparser.parse(response.content)
                articles = []

                for entry in feed.entries[:limit]:
                    articles.append({
                        "title": entry.get("title", "Untitled"),
                        "url": entry.get("link", ""),
                        "author": display_name,
                        "author_username": username,
                        "source": f"medium:@{username}",
                        "source_type": "medium",
                        "published_at": self._parse_feed_date(entry),
                        "summary": self._clean_summary(entry.get("summary", "")),
                        "claps": 0,  # RSS doesn't provide claps
                        "engagement_score": 0,
                        "type": "medium_discovery",
                        "fallback": True,
                    })

                logger.info(
                    "fetched_medium_author_rss",
                    author=display_name,
                    count=len(articles)
                )
                return articles

        except Exception as e:
            logger.error(
                "medium_author_rss_failed",
                username=username,
                error=str(e)
            )
            return []

    async def fetch_category_trending(
        self,
        category: str = "technology",
        limit: int = 20
    ) -> List[Dict]:
        """
        Fetch trending articles for a category

        Uses RapidAPI if available, falls back to curated author RSS feeds.

        Args:
            category: Category to fetch
            limit: Maximum articles

        Returns:
            List of trending articles
        """
        if self.is_api_available():
            # Map category to Medium tags
            tag_mapping = {
                "technology": "technology",
                "programming": "programming",
                "ai": "artificial-intelligence",
                "startup": "startup",
                "finance": "fintech",
            }
            tag = tag_mapping.get(category, category)
            return await self.fetch_trending_by_tag(tag, limit)

        # Fallback: fetch from curated authors via RSS
        authors = POPULAR_MEDIUM_AUTHORS.get(category, [])
        if not authors:
            return []

        tasks = [
            self.fetch_author_articles(
                author["username"],
                author["name"],
                limit=limit // len(authors)
            )
            for author in authors
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        articles = []
        for result in results:
            if isinstance(result, list):
                articles.extend(result)

        return articles[:limit]

    async def fetch_all_trending(
        self,
        categories: Optional[List[str]] = None,
        limit: int = 30
    ) -> List[Dict]:
        """
        Fetch trending articles across multiple categories

        Args:
            categories: Categories to fetch (default: all)
            limit: Maximum total articles

        Returns:
            Aggregated trending articles
        """
        categories = categories or list(POPULAR_MEDIUM_AUTHORS.keys())

        if self.is_api_available():
            # Use RapidAPI for multiple tags
            tasks = [
                self.fetch_category_trending(cat, limit // len(categories))
                for cat in categories
            ]
        else:
            # Use RSS fallback for curated authors
            tasks = [
                self.fetch_category_trending(cat, limit // len(categories))
                for cat in categories
            ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten and deduplicate
        seen_urls = set()
        all_articles = []
        for result in results:
            if isinstance(result, list):
                for article in result:
                    if article["url"] not in seen_urls:
                        seen_urls.add(article["url"])
                        all_articles.append(article)

        # Sort by engagement
        all_articles.sort(key=lambda x: x.get("engagement_score", 0), reverse=True)
        return all_articles[:limit]

    async def search_authors(
        self,
        query: str,
        limit: int = 5
    ) -> List[Dict]:
        """
        Search for Medium authors

        Uses RapidAPI if available, otherwise searches curated list.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            List of matching authors
        """
        if self.is_api_available():
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        f"{self.RAPIDAPI_BASE_URL}/search/users",
                        params={"q": query},
                        headers=self.headers
                    )

                    if response.status_code == 200:
                        data = response.json()
                        users = data.get("users", [])[:limit]

                        return [
                            {
                                "name": user.get("fullname", user.get("username", "")),
                                "platform": "medium",
                                "handle": user.get("username", ""),
                                "feed_url": f"https://medium.com/feed/@{user.get('username', '')}",
                                "profile_url": f"https://medium.com/@{user.get('username', '')}",
                                "description": user.get("bio", "")[:200],
                                "follower_count": user.get("followers_count", 0),
                            }
                            for user in users
                        ]
            except Exception as e:
                logger.error("medium_search_failed", error=str(e))

        # Fallback: search curated list
        query_lower = query.lower()
        matches = []

        for category, authors in POPULAR_MEDIUM_AUTHORS.items():
            for author in authors:
                if query_lower in author["name"].lower() or query_lower in author["username"].lower():
                    matches.append({
                        "name": author["name"],
                        "platform": "medium",
                        "handle": author["username"],
                        "feed_url": f"https://medium.com/feed/@{author['username']}",
                        "profile_url": f"https://medium.com/@{author['username']}",
                        "category": category,
                        "description": f"Popular {category} publication on Medium",
                    })

        # Deduplicate
        seen = set()
        unique = []
        for m in matches:
            if m["handle"] not in seen:
                seen.add(m["handle"])
                unique.append(m)

        return unique[:limit]

    async def get_top_writers(self, tag: str = "technology") -> List[Dict]:
        """
        Get top writers for a specific tag

        Args:
            tag: Medium tag

        Returns:
            List of top writers
        """
        if not self.is_api_available():
            # Return curated list for the tag
            category_mapping = {
                "technology": "technology",
                "programming": "programming",
                "artificial-intelligence": "ai",
                "startup": "startup",
            }
            category = category_mapping.get(tag, "technology")
            authors = POPULAR_MEDIUM_AUTHORS.get(category, [])

            return [
                {
                    "name": author["name"],
                    "platform": "medium",
                    "handle": author["username"],
                    "feed_url": f"https://medium.com/feed/@{author['username']}",
                    "profile_url": f"https://medium.com/@{author['username']}",
                }
                for author in authors
            ]

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.RAPIDAPI_BASE_URL}/top_writers/{tag}",
                    headers=self.headers
                )

                if response.status_code != 200:
                    return []

                data = response.json()
                return data.get("top_writers", [])

        except Exception as e:
            logger.error("medium_top_writers_failed", tag=tag, error=str(e))
            return []

    def _format_timestamp(self, timestamp) -> str:
        """Format Unix timestamp to ISO string"""
        if timestamp is None:
            return datetime.utcnow().isoformat()
        try:
            if isinstance(timestamp, int):
                return datetime.fromtimestamp(timestamp / 1000).isoformat()
            return str(timestamp)
        except Exception:
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
_fetcher = MediumDiscoveryFetcher()


async def fetch_medium_trending(
    categories: Optional[List[str]] = None,
    limit: int = 20
) -> List[Dict]:
    """Fetch trending Medium articles"""
    return await _fetcher.fetch_all_trending(categories=categories, limit=limit)


async def search_medium_authors(query: str, limit: int = 5) -> List[Dict]:
    """Search for Medium authors"""
    return await _fetcher.search_authors(query, limit)


def is_medium_api_available() -> bool:
    """Check if Medium RapidAPI is configured"""
    return _fetcher.is_api_available()
