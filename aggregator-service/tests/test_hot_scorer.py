"""
Tests for Hot Scorer (Hacker News Algorithm)
"""

import pytest
from datetime import datetime, timedelta, timezone
from app.analyzers.hot_scorer import (
    HotScorer,
    calculate_hot_scores,
    DEFAULT_SOURCE_WEIGHTS
)


@pytest.mark.unit
class TestHotScorer:
    """Test hot scoring functionality"""

    def test_calculate_score_basic(self):
        """Test basic hot score calculation"""
        scorer = HotScorer(gravity=1.8)

        # Recent article with good engagement
        published_at = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        score = scorer.calculate_score(
            engagement=100,
            published_at=published_at
        )

        assert score > 0
        assert isinstance(score, float)

    def test_recent_article_scores_higher(self):
        """Test that more recent articles score higher with same engagement"""
        scorer = HotScorer()

        recent_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        old_time = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

        recent_score = scorer.calculate_score(100, recent_time)
        old_score = scorer.calculate_score(100, old_time)

        # Recent should score higher
        assert recent_score > old_score

    def test_higher_engagement_scores_higher(self):
        """Test that higher engagement scores higher"""
        scorer = HotScorer()
        published_at = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()

        high_engagement = scorer.calculate_score(200, published_at)
        low_engagement = scorer.calculate_score(50, published_at)

        assert high_engagement > low_engagement

    def test_source_weight_multiplier(self):
        """Test that source weight multiplies the score"""
        scorer = HotScorer()
        published_at = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()

        base_score = scorer.calculate_score(100, published_at, source_weight=1.0)
        weighted_score = scorer.calculate_score(100, published_at, source_weight=1.5)

        # Weighted should be 1.5x the base
        assert weighted_score == pytest.approx(base_score * 1.5, rel=0.01)

    def test_gravity_affects_time_decay(self):
        """Test that gravity parameter affects time decay rate"""
        low_gravity = HotScorer(gravity=1.0)
        high_gravity = HotScorer(gravity=2.5)

        old_time = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

        low_g_score = low_gravity.calculate_score(100, old_time)
        high_g_score = high_gravity.calculate_score(100, old_time)

        # Higher gravity = faster decay = lower score for old content
        assert high_g_score < low_g_score

    def test_prevent_negative_hours(self):
        """Test that future timestamps don't cause negative hours"""
        scorer = HotScorer()

        # Future timestamp (should be treated as 0 hours)
        future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()

        score = scorer.calculate_score(100, future_time)

        # Should return a valid positive score
        assert score > 0

    def test_score_articles_with_hot_score_field(self, sample_articles):
        """Test scoring multiple articles and adding hot_score field"""
        scorer = HotScorer()
        scored = scorer.score_articles(sample_articles)

        assert len(scored) == len(sample_articles)

        # All articles should have hot_score field
        assert all("hot_score" in article for article in scored)

        # Should be sorted by score descending
        scores = [article["hot_score"] for article in scored]
        assert scores == sorted(scores, reverse=True)

    def test_score_articles_with_source_weights(self):
        """Test applying source weights when scoring articles"""
        articles = [
            {
                "title": "HN Article",
                "source": "HackerNews",
                "score": 100,
                "published_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
            },
            {
                "title": "Medium Article",
                "source": "Medium",
                "score": 100,
                "published_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
            }
        ]

        source_weights = {
            "HackerNews": 1.5,
            "Medium": 0.8
        }

        scorer = HotScorer()
        scored = scorer.score_articles(articles, source_weights=source_weights)

        # HackerNews should score higher due to weight
        hn_article = [a for a in scored if a["source"] == "HackerNews"][0]
        medium_article = [a for a in scored if a["source"] == "Medium"][0]

        assert hn_article["hot_score"] > medium_article["hot_score"]

    def test_fallback_to_comments_for_engagement(self):
        """Test using comment count when score is 0"""
        scorer = HotScorer()

        article = {
            "title": "Test",
            "score": 0,  # No score
            "comments": 50,  # Has comments
            "published_at": datetime.now(timezone.utc).isoformat()
        }

        scored = scorer.score_articles([article])

        # Should use comments as engagement metric
        assert scored[0]["hot_score"] > 0

    def test_minimum_engagement_value(self):
        """Test that articles with no metrics get minimum engagement"""
        scorer = HotScorer()

        article = {
            "title": "Test",
            "score": 0,
            "comments": 0,
            "published_at": datetime.now(timezone.utc).isoformat()
        }

        scored = scorer.score_articles([article])

        # Should get a score based on minimum engagement (1)
        assert scored[0]["hot_score"] >= 0

    def test_missing_timestamp_gets_zero_score(self):
        """Test that articles without timestamp get zero score"""
        scorer = HotScorer()

        article = {
            "title": "Test",
            "score": 100
            # No published_at field
        }

        scored = scorer.score_articles([article])

        assert scored[0]["hot_score"] == 0.0

    def test_get_top_hot_articles(self, sample_articles):
        """Test getting top N hottest articles"""
        scorer = HotScorer()

        top_articles = scorer.get_top_hot_articles(
            sample_articles,
            top_n=2,
            min_score=0.1
        )

        assert len(top_articles) <= 2
        assert all(article["hot_score"] >= 0.1 for article in top_articles)

    def test_min_score_filter(self):
        """Test minimum score filtering"""
        # Create articles with very different timestamps for score variation
        articles = [
            {
                "title": "Hot Article",
                "score": 200,
                "published_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            },
            {
                "title": "Old Article",
                "score": 50,
                "published_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            }
        ]

        scorer = HotScorer()
        top_articles = scorer.get_top_hot_articles(
            articles,
            top_n=10,
            min_score=5.0  # High threshold
        )

        # Old article should be filtered out
        assert all(article["hot_score"] >= 5.0 for article in top_articles)

    def test_score_calculation_error_handling(self):
        """Test graceful error handling with invalid data"""
        scorer = HotScorer()

        # Invalid timestamp
        score = scorer.calculate_score(
            engagement=100,
            published_at="invalid-timestamp"
        )

        # Should return 0 instead of crashing
        assert score == 0.0

    def test_article_copy_not_mutation(self, sample_article):
        """Test that scoring doesn't mutate original articles"""
        scorer = HotScorer()
        original_keys = set(sample_article.keys())

        scored = scorer.score_articles([sample_article])

        # Original should not have hot_score
        assert "hot_score" not in sample_article
        assert set(sample_article.keys()) == original_keys

        # Scored copy should have hot_score
        assert "hot_score" in scored[0]

    def test_default_source_weights_exist(self):
        """Test that default source weights are defined"""
        assert isinstance(DEFAULT_SOURCE_WEIGHTS, dict)
        assert "HackerNews" in DEFAULT_SOURCE_WEIGHTS
        assert "Reddit" in DEFAULT_SOURCE_WEIGHTS
        assert all(isinstance(w, (int, float)) for w in DEFAULT_SOURCE_WEIGHTS.values())

    def test_calculate_hot_scores_convenience_function(self, sample_articles):
        """Test the convenience function"""
        hot_articles = calculate_hot_scores(
            sample_articles,
            top_n=5,
            gravity=1.8
        )

        assert len(hot_articles) <= 5
        assert all("hot_score" in article for article in hot_articles)

    def test_zero_engagement_handling(self):
        """Test handling of zero engagement gracefully"""
        scorer = HotScorer()
        published_at = datetime.now(timezone.utc).isoformat()

        # Engagement of 0 should still produce a score
        score = scorer.calculate_score(0, published_at)

        # Formula: (0 - 1) / (hours + 2)^1.8
        # This will be negative, but clamped to 0
        assert score >= 0

    def test_very_old_content_low_score(self):
        """Test that very old content gets very low scores"""
        scorer = HotScorer()

        old_time = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()

        score = scorer.calculate_score(1000, old_time)  # Even with high engagement

        # Should be very low due to time decay
        assert score < 1.0
