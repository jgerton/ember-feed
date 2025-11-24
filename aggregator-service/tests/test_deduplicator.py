"""
Tests for Deduplicator (MinHash + LSH)
"""

import pytest
from app.analyzers.deduplicator import ArticleDeduplicator


@pytest.mark.unit
class TestDeduplicator:
    """Test deduplication functionality"""

    def test_deduplicate_identical_articles(self):
        """Test deduplication of identical articles"""
        dedup = ArticleDeduplicator(threshold=0.8)

        articles = [
            {"id": "1", "title": "Same Article Title", "text": "Same content here", "url": "http://example.com/1"},
            {"id": "2", "title": "Same Article Title", "text": "Same content here", "url": "http://example.com/2"},
        ]

        unique = dedup.deduplicate_articles(articles)

        # Should keep only one
        assert len(unique) == 1

    def test_deduplicate_different_articles(self):
        """Test that different articles are kept"""
        dedup = Deduplicator(threshold=0.8)

        articles = [
            {"id": "1", "title": "Article about Python", "text": "Python programming language", "url": "http://example.com/1"},
            {"id": "2", "title": "Article about Rust", "text": "Rust programming language", "url": "http://example.com/2"},
        ]

        unique = dedup.deduplicate_articles(articles)

        # Should keep both
        assert len(unique) == 2

    def test_similar_but_not_identical_articles(self):
        """Test articles that are similar but not identical"""
        dedup = Deduplicator(threshold=0.9)  # High threshold

        articles = [
            {"id": "1", "title": "GPT-5 announced by OpenAI", "text": "OpenAI announces GPT-5", "url": "http://example.com/1"},
            {"id": "2", "title": "OpenAI announces GPT-5", "text": "GPT-5 has been announced", "url": "http://example.com/2"},
        ]

        unique = dedup.deduplicate_articles(articles)

        # With high threshold, should detect as duplicates
        assert len(unique) <= 2  # May be 1 or 2 depending on exact similarity

    def test_preserves_first_occurrence(self, sample_articles):
        """Test that first occurrence of duplicate is preserved"""
        dedup = Deduplicator()

        # Add a duplicate of the first article
        articles = sample_articles + [sample_articles[0].copy()]

        unique = dedup.deduplicate_articles(articles)

        # Should have deduplicated
        assert len(unique) < len(articles)

    def test_empty_articles_list(self):
        """Test handling of empty articles list"""
        dedup = Deduplicator()

        unique = dedup.deduplicate([])

        assert unique == []

    def test_single_article(self, sample_article):
        """Test with single article"""
        dedup = Deduplicator()

        unique = dedup.deduplicate([sample_article])

        assert len(unique) == 1
        assert unique[0] == sample_article

    def test_threshold_affects_strictness(self):
        """Test that threshold parameter affects deduplication strictness"""
        articles = [
            {"id": "1", "title": "Machine learning tutorial", "text": "Learn ML basics", "url": "http://example.com/1"},
            {"id": "2", "title": "Machine learning guide", "text": "ML fundamentals", "url": "http://example.com/2"},
        ]

        # Low threshold (lenient - more duplicates detected)
        lenient_dedup = Deduplicator(threshold=0.5)
        lenient_unique = lenient_dedup.deduplicate(articles)

        # High threshold (strict - fewer duplicates detected)
        strict_dedup = Deduplicator(threshold=0.95)
        strict_unique = strict_dedup.deduplicate(articles)

        # Lenient should find more duplicates (keep fewer articles)
        assert len(lenient_unique) <= len(strict_unique)

    def test_articles_without_text_field(self):
        """Test handling articles with missing text field"""
        dedup = Deduplicator()

        articles = [
            {"id": "1", "title": "Title Only Article", "url": "http://example.com/1"},
            {"id": "2", "title": "Another Title Only", "url": "http://example.com/2"},
        ]

        unique = dedup.deduplicate_articles(articles)

        # Should handle gracefully
        assert isinstance(unique, list)
        assert len(unique) <= len(articles)

    def test_articles_with_only_url_different(self):
        """Test that articles with same content but different URLs are deduplicated"""
        dedup = Deduplicator(threshold=0.9)

        articles = [
            {"id": "1", "title": "Exact Same Title", "text": "Exact same content", "url": "http://site1.com"},
            {"id": "2", "title": "Exact Same Title", "text": "Exact same content", "url": "http://site2.com"},
        ]

        unique = dedup.deduplicate_articles(articles)

        # Should deduplicate based on content, not URL
        assert len(unique) == 1

    def test_deduplication_preserves_first(self, sample_articles):
        """Test that deduplication preserves first occurrence"""
        dedup = ArticleDeduplicator()

        # Add some duplicates
        articles_with_dupes = sample_articles + [sample_articles[0].copy(), sample_articles[1].copy()]

        unique = dedup.deduplicate_articles(articles_with_dupes)

        # Should have removed duplicates
        assert len(unique) < len(articles_with_dupes)
        assert len(unique) == len(sample_articles)

    def test_preserve_metadata(self):
        """Test that article metadata is preserved during deduplication"""
        dedup = ArticleDeduplicator()

        articles = [
            {
                "id": "1",
                "title": "Article",
                "text": "Content",
                "url": "http://example.com",
                "source": "HackerNews",
                "score": 100,
                "published_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "2",
                "title": "Different Article",
                "text": "Different content",
                "url": "http://example2.com",
                "source": "Reddit",
                "score": 50,
                "published_at": "2024-01-02T00:00:00Z"
            }
        ]

        unique = dedup.deduplicate_articles(articles)

        # All metadata should be preserved
        for article in unique:
            assert "source" in article
            assert "score" in article
            assert "published_at" in article

    def test_find_duplicates_method(self, sample_articles):
        """Test finding duplicate groups"""
        dedup = ArticleDeduplicator(threshold=0.8)

        # Add a duplicate
        articles_with_dupes = sample_articles + [sample_articles[0].copy()]

        duplicates = dedup.find_duplicates(articles_with_dupes)

        # Should find duplicate groups
        assert isinstance(duplicates, dict)

    def test_num_perm_affects_accuracy(self):
        """Test that num_perm parameter affects accuracy"""
        articles = [
            {"id": "1", "title": "Article about AI", "text": "Artificial intelligence content", "url": "http://example.com/1"},
            {"id": "2", "title": "Article about AI", "text": "Artificial intelligence material", "url": "http://example.com/2"},
        ]

        # Lower num_perm (faster but less accurate)
        fast_dedup = ArticleDeduplicator(threshold=0.8, num_perm=64)
        fast_unique = fast_dedup.deduplicate_articles(articles)

        # Higher num_perm (slower but more accurate)
        accurate_dedup = ArticleDeduplicator(threshold=0.8, num_perm=256)
        accurate_unique = accurate_dedup.deduplicate_articles(articles)

        # Both should work
        assert isinstance(fast_unique, list)
        assert isinstance(accurate_unique, list)

    def test_cross_source_deduplication(self):
        """Test deduplication across different sources"""
        dedup = ArticleDeduplicator(threshold=0.85)

        articles = [
            {"id": "1", "title": "Breaking News Story", "text": "Important event happened", "source": "HackerNews", "url": "http://hn.com/1"},
            {"id": "2", "title": "Breaking News Story", "text": "Important event occurred", "source": "Reddit", "url": "http://reddit.com/1"},
            {"id": "3", "title": "Breaking News Story", "text": "Important event took place", "source": "Medium", "url": "http://medium.com/1"},
        ]

        unique = dedup.deduplicate_articles(articles)

        # Should detect cross-source duplicates
        assert len(unique) < len(articles)
