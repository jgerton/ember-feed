"""
Hot Now Scoring using Hacker News Algorithm

Ranks content by "hotness" based on engagement and time decay.

Formula: Score = (Engagement - 1) / (Hours_Elapsed + 2)^Gravity
- Gravity: 1.8 (default) - higher values = faster decay
- Recent posts with high engagement rank higher

Based on proven Hacker News ranking algorithm.
"""

import structlog
from datetime import datetime, timezone
from typing import List, Dict
from dateutil import parser as date_parser

logger = structlog.get_logger()


class HotScorer:
    """Calculate hotness scores for articles"""

    def __init__(self, gravity: float = 1.8):
        """
        Initialize hot scorer

        Args:
            gravity: Time decay factor (higher = faster decay)
                    1.8 is Hacker News default
        """
        self.gravity = gravity

    def calculate_score(
        self,
        engagement: int,
        published_at: str,
        source_weight: float = 1.0
    ) -> float:
        """
        Calculate hotness score for an article

        Args:
            engagement: Engagement metric (upvotes, score, etc.)
            published_at: ISO timestamp of publication
            source_weight: Weight multiplier for this source (0.0-2.0)

        Returns:
            Hotness score (higher = hotter)
        """
        try:
            # Parse publication time
            pub_time = date_parser.parse(published_at)

            # Calculate hours elapsed
            now = datetime.now(timezone.utc)
            hours_elapsed = (now - pub_time).total_seconds() / 3600

            # Prevent negative hours
            hours_elapsed = max(0, hours_elapsed)

            # Apply Hacker News formula
            # Score = (Engagement - 1) / (Hours + 2)^Gravity
            score = (engagement - 1) / pow(hours_elapsed + 2, self.gravity)

            # Apply source weight
            score *= source_weight

            return max(0, score)  # Prevent negative scores

        except Exception as e:
            logger.warning("hot_score_calculation_failed", error=str(e))
            return 0.0

    def score_articles(
        self,
        articles: List[Dict],
        source_weights: Dict[str, float] = None
    ) -> List[Dict]:
        """
        Calculate hotness scores for all articles

        Args:
            articles: List of article dictionaries
            source_weights: Optional dict of {source_name: weight}

        Returns:
            Articles with added 'hot_score' field, sorted by score
        """
        source_weights = source_weights or {}

        scored_articles = []

        for article in articles:
            # Get engagement metric
            engagement = article.get("score", 0)

            # If no score, use comment count as proxy
            if engagement == 0:
                engagement = article.get("comments", 0)

            # If still no engagement, use minimum value
            if engagement == 0:
                engagement = 1

            # Get published timestamp
            published_at = article.get("published_at")
            if not published_at:
                # No timestamp - use very low score
                hot_score = 0.0
            else:
                # Get source weight
                source = article.get("source", "")
                source_weight = source_weights.get(source, 1.0)

                # Calculate score
                hot_score = self.calculate_score(
                    engagement=engagement,
                    published_at=published_at,
                    source_weight=source_weight
                )

            # Add score to article
            article_with_score = article.copy()
            article_with_score["hot_score"] = hot_score
            scored_articles.append(article_with_score)

        # Sort by hot score (descending)
        scored_articles.sort(
            key=lambda x: x["hot_score"],
            reverse=True
        )

        logger.info(
            "scored_articles",
            count=len(scored_articles),
            top_score=scored_articles[0]["hot_score"] if scored_articles else 0
        )

        return scored_articles

    def get_top_hot_articles(
        self,
        articles: List[Dict],
        top_n: int = 10,
        min_score: float = 0.1
    ) -> List[Dict]:
        """
        Get top N hottest articles

        Args:
            articles: List of articles
            top_n: Number of top articles to return
            min_score: Minimum hot score threshold

        Returns:
            Top N hottest articles
        """
        scored = self.score_articles(articles)

        # Filter by minimum score
        filtered = [
            article for article in scored
            if article["hot_score"] >= min_score
        ]

        return filtered[:top_n]


# Source weight recommendations based on research
DEFAULT_SOURCE_WEIGHTS = {
    "HackerNews": 1.5,      # High-quality, tech-focused
    "Reddit": 1.0,           # Standard weight
    "Medium": 0.8,           # Lower engagement metrics
    "Substack": 1.2,         # Quality newsletters
    "Google News": 1.0,      # Mainstream news
    "TechCrunch": 1.3,       # Tech news authority
    "The Verge": 1.2,        # Tech news
    "Ars Technica": 1.2,     # Tech news
}


# Convenience function
def calculate_hot_scores(
    articles: List[Dict],
    top_n: int = 20,
    gravity: float = 1.8,
    source_weights: Dict[str, float] = None
) -> List[Dict]:
    """
    Calculate and return top hot articles

    Args:
        articles: List of articles
        top_n: Number of top articles to return
        gravity: Time decay factor
        source_weights: Optional source weights

    Returns:
        Top N hottest articles with scores
    """
    # Use default weights if not provided
    if source_weights is None:
        source_weights = DEFAULT_SOURCE_WEIGHTS

    scorer = HotScorer(gravity=gravity)
    return scorer.get_top_hot_articles(
        articles=articles,
        top_n=top_n,
        min_score=0.1
    )
