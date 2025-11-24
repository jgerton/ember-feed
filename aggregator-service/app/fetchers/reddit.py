"""
Reddit Fetcher

Fetches content from Reddit using OAuth for higher rate limits.
- No auth: 10 requests/min
- With OAuth: 60-100 requests/min

API Docs: https://www.reddit.com/dev/api
"""

import praw
import structlog
from datetime import datetime, timezone
from typing import List, Dict, Optional

logger = structlog.get_logger()


class RedditFetcher:
    """Fetches content from Reddit using PRAW"""

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        user_agent: str = "trending-aggregator/1.0"
    ):
        """
        Initialize Reddit fetcher

        Args:
            client_id: Reddit OAuth client ID
            client_secret: Reddit OAuth client secret
            user_agent: User agent string
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.user_agent = user_agent
        self.reddit = None

        # Initialize PRAW if credentials provided
        if client_id and client_secret:
            try:
                self.reddit = praw.Reddit(
                    client_id=client_id,
                    client_secret=client_secret,
                    user_agent=user_agent
                )
                logger.info("reddit_oauth_initialized")
            except Exception as e:
                logger.error("reddit_oauth_failed", error=str(e))
                self.reddit = None

    async def fetch_hot_posts(
        self,
        subreddits: List[str],
        limit: int = 25,
        min_score: Optional[int] = None
    ) -> List[Dict]:
        """
        Fetch hot posts from specified subreddits

        Args:
            subreddits: List of subreddit names (without r/)
            limit: Posts per subreddit
            min_score: Minimum upvotes filter

        Returns:
            List of post dictionaries
        """
        all_posts = []

        for subreddit_name in subreddits:
            try:
                posts = await self._fetch_subreddit(
                    subreddit_name,
                    sort="hot",
                    limit=limit,
                    min_score=min_score
                )
                all_posts.extend(posts)
            except Exception as e:
                logger.error(
                    "reddit_subreddit_fetch_failed",
                    subreddit=subreddit_name,
                    error=str(e)
                )

        logger.info("fetched_reddit_posts", count=len(all_posts))
        return all_posts

    async def fetch_top_posts(
        self,
        subreddits: List[str],
        timeframe: str = "day",
        limit: int = 25,
        min_score: Optional[int] = None
    ) -> List[Dict]:
        """
        Fetch top posts from subreddits by timeframe

        Args:
            subreddits: List of subreddit names
            timeframe: "hour", "day", "week", "month", "year", "all"
            limit: Posts per subreddit
            min_score: Minimum upvotes filter

        Returns:
            List of top posts
        """
        all_posts = []

        for subreddit_name in subreddits:
            try:
                posts = await self._fetch_subreddit(
                    subreddit_name,
                    sort="top",
                    timeframe=timeframe,
                    limit=limit,
                    min_score=min_score
                )
                all_posts.extend(posts)
            except Exception as e:
                logger.error(
                    "reddit_top_fetch_failed",
                    subreddit=subreddit_name,
                    error=str(e)
                )

        logger.info(
            "fetched_reddit_top_posts",
            count=len(all_posts),
            timeframe=timeframe
        )
        return all_posts

    async def _fetch_subreddit(
        self,
        subreddit_name: str,
        sort: str = "hot",
        timeframe: Optional[str] = None,
        limit: int = 25,
        min_score: Optional[int] = None
    ) -> List[Dict]:
        """
        Fetch posts from a single subreddit

        Args:
            subreddit_name: Subreddit name (without r/)
            sort: "hot", "new", "rising", "top"
            timeframe: For "top" sort: "hour", "day", "week", etc.
            limit: Number of posts to fetch
            min_score: Minimum score filter

        Returns:
            List of standardized post dictionaries
        """
        if not self.reddit:
            logger.warning("reddit_client_not_initialized")
            return []

        try:
            subreddit = self.reddit.subreddit(subreddit_name)

            # Get posts based on sort type
            if sort == "hot":
                submissions = subreddit.hot(limit=limit)
            elif sort == "new":
                submissions = subreddit.new(limit=limit)
            elif sort == "rising":
                submissions = subreddit.rising(limit=limit)
            elif sort == "top":
                submissions = subreddit.top(
                    time_filter=timeframe or "day",
                    limit=limit
                )
            else:
                submissions = subreddit.hot(limit=limit)

            # Convert to standardized format
            posts = []
            for submission in submissions:
                # Filter by minimum score
                if min_score and submission.score < min_score:
                    continue

                # Skip stickied posts
                if submission.stickied:
                    continue

                post = {
                    "id": submission.id,
                    "title": submission.title,
                    "url": submission.url,
                    "text": submission.selftext if submission.is_self else "",
                    "score": submission.score,
                    "author": str(submission.author) if submission.author else "[deleted]",
                    "comments": submission.num_comments,
                    "published_at": datetime.fromtimestamp(
                        submission.created_utc,
                        tz=timezone.utc
                    ).isoformat(),
                    "subreddit": subreddit_name,
                    "source": "Reddit",
                    "source_id": f"r/{subreddit_name}/{submission.id}",
                    "permalink": f"https://reddit.com{submission.permalink}"
                }

                posts.append(post)

            return posts

        except Exception as e:
            logger.error(
                "reddit_fetch_error",
                subreddit=subreddit_name,
                error=str(e)
            )
            return []


# Convenience function
async def fetch_trending_reddit(
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
    subreddits: Optional[List[str]] = None,
    min_score: int = 50
) -> List[Dict]:
    """
    Fetch trending posts from Reddit

    Args:
        client_id: Reddit OAuth client ID
        client_secret: Reddit OAuth client secret
        subreddits: List of subreddit names (defaults to tech/news subreddits)
        min_score: Minimum score threshold

    Returns:
        List of trending posts
    """
    # Default subreddits for trending tech/news
    if subreddits is None:
        subreddits = [
            "technology",
            "programming",
            "worldnews",
            "business",
            "startups",
            "gadgets",
            "science"
        ]

    fetcher = RedditFetcher(
        client_id=client_id,
        client_secret=client_secret
    )

    # Fetch hot posts (current trending)
    posts = await fetcher.fetch_hot_posts(
        subreddits=subreddits,
        limit=25,
        min_score=min_score
    )

    return posts
