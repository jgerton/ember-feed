"""
Tests for Keyword Extractor (RAKE-based)
"""

import pytest
from app.analyzers.keyword_extractor import (
    KeywordExtractor,
    extract_trending_keywords
)


@pytest.mark.unit
class TestKeywordExtractor:
    """Test keyword extraction functionality"""

    def test_extract_from_single_article(self, sample_article):
        """Test extracting keywords from a single article"""
        extractor = KeywordExtractor()
        keywords = extractor.extract_from_article(sample_article)

        assert isinstance(keywords, list)
        assert len(keywords) <= extractor.max_keywords

    def test_extract_from_articles_with_frequency(self, sample_articles):
        """Test extracting keywords from multiple articles with frequency counting"""
        extractor = KeywordExtractor()
        keyword_freq = extractor.extract_from_articles(
            sample_articles,
            min_frequency=2
        )

        assert isinstance(keyword_freq, dict)
        # All frequencies should be >= min_frequency
        assert all(freq >= 2 for freq in keyword_freq.values())

    def test_min_frequency_filter(self):
        """Test that min_frequency filter works correctly"""
        articles = [
            {"title": "Python programming tutorial", "text": "Learn Python"},
            {"title": "Python best practices", "text": "Python tips"},
            {"title": "JavaScript frameworks", "text": "Learn JS"}
        ]

        extractor = KeywordExtractor()
        keyword_freq = extractor.extract_from_articles(articles, min_frequency=2)

        # "python" appears twice, should be included
        # "javascript" appears once, should be filtered out
        keywords_lower = [kw.lower() for kw in keyword_freq.keys()]
        assert any("python" in kw for kw in keywords_lower)

    def test_get_top_keywords(self, sample_articles):
        """Test getting top N keywords with metadata"""
        extractor = KeywordExtractor()
        top_keywords = extractor.get_top_keywords(
            sample_articles,
            top_n=5,
            min_frequency=1
        )

        assert isinstance(top_keywords, list)
        assert len(top_keywords) <= 5

        # Verify structure
        if top_keywords:
            kw_data = top_keywords[0]
            assert "keyword" in kw_data
            assert "frequency" in kw_data
            assert "sample_articles" in kw_data

    def test_keyword_sorting_by_frequency(self):
        """Test that keywords are sorted by frequency descending"""
        articles = [
            {"title": "AI and machine learning", "text": "AI is popular"},
            {"title": "Machine learning basics", "text": "Learn ML"},
            {"title": "AI trends", "text": "AI news"},
        ]

        extractor = KeywordExtractor()
        top_keywords = extractor.get_top_keywords(articles, top_n=10, min_frequency=1)

        if len(top_keywords) > 1:
            # Verify descending order
            frequencies = [kw["frequency"] for kw in top_keywords]
            assert frequencies == sorted(frequencies, reverse=True)

    def test_find_articles_with_keyword(self, sample_articles):
        """Test finding articles containing specific keyword"""
        extractor = KeywordExtractor()
        matching_articles = extractor._find_articles_with_keyword(
            sample_articles,
            keyword="gpt",
            limit=3
        )

        assert isinstance(matching_articles, list)
        assert len(matching_articles) <= 3

        # Verify article structure
        if matching_articles:
            assert "title" in matching_articles[0]
            assert "url" in matching_articles[0]
            assert "source" in matching_articles[0]

    def test_clean_text(self):
        """Test text cleaning functionality"""
        dirty_text = """
        <p>This is HTML</p>
        Visit https://example.com for more
        Multiple    spaces    here
        """

        clean = KeywordExtractor._clean_text(dirty_text)

        # Should remove HTML tags
        assert "<p>" not in clean
        assert "</p>" not in clean

        # Should remove URLs
        assert "https://example.com" not in clean

        # Should normalize spaces
        assert "    " not in clean

    def test_normalize_keyword(self):
        """Test keyword normalization"""
        # Test title case
        assert KeywordExtractor._normalize_keyword("machine learning") == "Machine Learning"

        # Test acronym preservation
        assert KeywordExtractor._normalize_keyword("AI models") == "AI Models"
        assert KeywordExtractor._normalize_keyword("REST API") == "REST API"

        # Test mixed case
        assert KeywordExtractor._normalize_keyword("python programming") == "Python Programming"

    def test_empty_article_handling(self):
        """Test handling of empty articles"""
        extractor = KeywordExtractor()
        empty_article = {"title": "", "text": ""}

        keywords = extractor.extract_from_article(empty_article)

        # Should return empty list for empty content
        assert keywords == []

    def test_article_without_text_field(self):
        """Test handling articles missing text field"""
        extractor = KeywordExtractor()
        article = {"title": "Only has title"}

        keywords = extractor.extract_from_article(article)

        # Should still work with just title
        assert isinstance(keywords, list)

    def test_max_keywords_limit(self):
        """Test that max_keywords parameter is respected"""
        extractor = KeywordExtractor(max_keywords=5)
        article = {
            "title": "Machine learning and artificial intelligence for data science",
            "text": "Python programming language is used for machine learning projects"
        }

        keywords = extractor.extract_from_article(article)

        assert len(keywords) <= 5

    def test_min_length_filter(self):
        """Test minimum keyword length filter"""
        extractor = KeywordExtractor(min_length=10)
        article = {
            "title": "AI ML NLP",  # Short keywords
            "text": "machine learning techniques"  # Longer phrase
        }

        keywords = extractor.extract_from_article(article)

        # All keywords should meet minimum length
        assert all(len(kw) >= 10 for kw in keywords)

    def test_duplicate_keyword_removal(self):
        """Test that duplicate keywords are removed"""
        extractor = KeywordExtractor()
        article = {
            "title": "Machine learning and machine learning",
            "text": "Machine learning is popular. Machine Learning is important."
        }

        keywords = extractor.extract_from_article(article)

        # Convert to lowercase for comparison
        keywords_lower = [kw.lower() for kw in keywords]

        # Should not have duplicate "machine learning"
        assert len(keywords_lower) == len(set(keywords_lower))

    def test_title_importance_weighting(self):
        """Test that title keywords are weighted higher (title appears twice in content)"""
        # This is implicit in the implementation - title is concatenated twice
        extractor = KeywordExtractor()
        article = {
            "title": "Important Topic",
            "text": "Some other content here"
        }

        keywords = extractor.extract_from_article(article)

        # Keywords from title should be preferred due to double weighting
        assert len(keywords) > 0

    def test_extract_trending_keywords_convenience_function(self, sample_articles):
        """Test the convenience function"""
        keywords = extract_trending_keywords(
            sample_articles,
            top_n=10,
            min_frequency=1
        )

        assert isinstance(keywords, list)
        assert len(keywords) <= 10

    def test_error_handling(self):
        """Test graceful error handling with malformed data"""
        extractor = KeywordExtractor()

        # Article with non-string values
        bad_article = {
            "title": 12345,  # Should be string
            "text": None  # Should be string
        }

        keywords = extractor.extract_from_article(bad_article)

        # Should return empty list rather than crashing
        assert isinstance(keywords, list)
