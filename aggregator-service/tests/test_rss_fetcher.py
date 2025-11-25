"""
Tests for RSS Feed Fetcher
"""

import pytest
import respx
import httpx
from unittest.mock import Mock, patch
from datetime import datetime, timezone
from time import struct_time

from app.fetchers.rss import (
    RSSFetcher,
    fetch_google_news,
    fetch_substack_newsletters,
    fetch_medium_publications,
    fetch_tech_news
)


class MockFeedEntry:
    """Mock feedparser entry for testing"""

    def __init__(
        self,
        title="Test Article",
        link="https://example.com/article",
        summary="Test summary",
        author="Test Author",
        published_parsed=None,
        entry_id=None
    ):
        self.title = title
        self.link = link
        self.summary = summary
        self.author = author
        self.published_parsed = published_parsed or datetime.now(timezone.utc).timetuple()
        self.id = entry_id or link

    def get(self, key, default=None):
        return getattr(self, key, default)


class MockFeed:
    """Mock feedparser feed for testing"""

    def __init__(self, entries=None, bozo=False, bozo_exception=None):
        self.entries = entries or []
        self.bozo = bozo
        self.bozo_exception = bozo_exception


@pytest.mark.unit
@pytest.mark.asyncio
class TestRSSFetcher:
    """Test RSS fetcher functionality"""

    @respx.mock
    @patch("app.fetchers.rss.feedparser.parse")
    async def test_fetch_feed_success(self, mock_parse):
        """Test successfully fetching an RSS feed"""
        # Mock HTTP response
        feed_url = "https://example.com/feed.xml"
        respx.get(feed_url).mock(
            return_value=httpx.Response(
                200,
                content=b"<rss>...</rss>"
            )
        )

        # Mock feedparser response
        mock_entries = [
            MockFeedEntry(
                title="Article 1",
                link="https://example.com/article1",
                summary="Summary 1"
            ),
            MockFeedEntry(
                title="Article 2",
                link="https://example.com/article2",
                summary="Summary 2"
            ),
        ]
        mock_parse.return_value = MockFeed(entries=mock_entries)

        fetcher = RSSFetcher()
        try:
            articles = await fetcher.fetch_feed(
                feed_url=feed_url,
                source_name="Test Source"
            )

            assert len(articles) == 2
            assert articles[0]["title"] == "Article 1"
            assert articles[0]["source"] == "Test Source"
            assert "published_at" in articles[0]
        finally:
            await fetcher.close()

    @respx.mock
    @patch("app.fetchers.rss.feedparser.parse")
    async def test_fetch_feed_with_limit(self, mock_parse):
        """Test fetching feed with entry limit"""
        feed_url = "https://example.com/feed.xml"
        respx.get(feed_url).mock(
            return_value=httpx.Response(200, content=b"<rss>...</rss>")
        )

        mock_entries = [
            MockFeedEntry(title=f"Article {i}") for i in range(10)
        ]
        mock_parse.return_value = MockFeed(entries=mock_entries)

        fetcher = RSSFetcher()
        try:
            articles = await fetcher.fetch_feed(
                feed_url=feed_url,
                source_name="Test Source",
                limit=5
            )

            # Should only return 5 articles
            assert len(articles) == 5
        finally:
            await fetcher.close()

    @respx.mock
    @patch("app.fetchers.rss.feedparser.parse")
    async def test_feed_parse_warning(self, mock_parse):
        """Test handling of feed parsing warnings"""
        feed_url = "https://example.com/feed.xml"
        respx.get(feed_url).mock(
            return_value=httpx.Response(200, content=b"<rss>...</rss>")
        )

        # Feed with parsing error (bozo=True)
        mock_parse.return_value = MockFeed(
            entries=[],
            bozo=True,
            bozo_exception=Exception("Parse error")
        )

        fetcher = RSSFetcher()
        try:
            articles = await fetcher.fetch_feed(
                feed_url=feed_url,
                source_name="Test Source"
            )

            # Should still return results even with warning
            assert isinstance(articles, list)
        finally:
            await fetcher.close()

    @respx.mock
    async def test_fetch_feed_http_error(self, mock_parse):
        """Test handling HTTP errors"""
        feed_url = "https://example.com/feed.xml"
        respx.get(feed_url).mock(
            return_value=httpx.Response(500, content=b"Server Error")
        )

        fetcher = RSSFetcher()
        try:
            articles = await fetcher.fetch_feed(
                feed_url=feed_url,
                source_name="Test Source"
            )

            # Should return empty list on error
            assert articles == []
        finally:
            await fetcher.close()

    @patch("app.fetchers.rss.feedparser.parse")
    async def test_standardize_entry_with_all_fields(self, mock_parse):
        """Test entry standardization with all fields present"""
        entry = {
            "title": "Full Article",
            "link": "https://example.com/full",
            "summary": "Full summary text",
            "author": "John Doe",
            "published_parsed": datetime(2024, 1, 1, 12, 0, 0).timetuple(),
            "id": "article-123"
        }

        fetcher = RSSFetcher()
        article = fetcher._standardize_entry(
            entry,
            source_name="Test Source",
            feed_url="https://example.com/feed"
        )

        assert article is not None
        assert article["title"] == "Full Article"
        assert article["url"] == "https://example.com/full"
        assert article["text"] == "Full summary text"
        assert article["author"] == "John Doe"
        assert article["source"] == "Test Source"
        assert article["id"] == "article-123"

    @patch("app.fetchers.rss.feedparser.parse")
    async def test_standardize_entry_missing_title(self, mock_parse):
        """Test that entries without title are filtered out"""
        entry = {
            "link": "https://example.com/article",
            "summary": "Summary without title"
        }

        fetcher = RSSFetcher()
        article = fetcher._standardize_entry(
            entry,
            source_name="Test Source",
            feed_url="https://example.com/feed"
        )

        # Should return None for entries without title
        assert article is None

    @patch("app.fetchers.rss.feedparser.parse")
    async def test_standardize_entry_missing_url(self, mock_parse):
        """Test that entries without URL are filtered out"""
        entry = {
            "title": "Article without URL",
            "summary": "Summary text"
        }

        fetcher = RSSFetcher()
        article = fetcher._standardize_entry(
            entry,
            source_name="Test Source",
            feed_url="https://example.com/feed"
        )

        # Should return None for entries without URL
        assert article is None

    @patch("app.fetchers.rss.feedparser.parse")
    async def test_standardize_entry_fallback_description(self, mock_parse):
        """Test description field fallback logic"""
        # Test with 'description' instead of 'summary'
        entry = {
            "title": "Test Article",
            "link": "https://example.com/article",
            "description": "Description text"
        }

        fetcher = RSSFetcher()
        article = fetcher._standardize_entry(
            entry,
            source_name="Test Source",
            feed_url="https://example.com/feed"
        )

        assert article["text"] == "Description text"

    @patch("app.fetchers.rss.feedparser.parse")
    async def test_standardize_entry_content_field(self, mock_parse):
        """Test using 'content' field for description"""
        entry = {
            "title": "Test Article",
            "link": "https://example.com/article",
            "content": [{"value": "Content text"}]
        }

        fetcher = RSSFetcher()
        article = fetcher._standardize_entry(
            entry,
            source_name="Test Source",
            feed_url="https://example.com/feed"
        )

        assert article["text"] == "Content text"

    @patch("app.fetchers.rss.feedparser.parse")
    async def test_standardize_entry_fallback_date(self, mock_parse):
        """Test date field fallback to current time"""
        entry = {
            "title": "Test Article",
            "link": "https://example.com/article"
            # No date fields
        }

        fetcher = RSSFetcher()
        article = fetcher._standardize_entry(
            entry,
            source_name="Test Source",
            feed_url="https://example.com/feed"
        )

        # Should have a published_at field (current time)
        assert "published_at" in article
        assert article["published_at"] is not None

    @patch("app.fetchers.rss.feedparser.parse")
    async def test_standardize_entry_author_fallback(self, mock_parse):
        """Test author field with authors array fallback"""
        entry = {
            "title": "Test Article",
            "link": "https://example.com/article",
            "authors": [{"name": "Jane Smith"}]
        }

        fetcher = RSSFetcher()
        article = fetcher._standardize_entry(
            entry,
            source_name="Test Source",
            feed_url="https://example.com/feed"
        )

        assert article["author"] == "Jane Smith"

    @respx.mock
    @patch("app.fetchers.rss.feedparser.parse")
    async def test_fetch_multiple_feeds(self, mock_parse):
        """Test fetching multiple feeds concurrently"""
        feeds = [
            {"url": "https://feed1.com/rss", "name": "Feed 1"},
            {"url": "https://feed2.com/rss", "name": "Feed 2"}
        ]

        # Mock HTTP responses
        for feed in feeds:
            respx.get(feed["url"]).mock(
                return_value=httpx.Response(200, content=b"<rss>...</rss>")
            )

        # Mock feedparser responses
        mock_parse.return_value = MockFeed(entries=[
            MockFeedEntry(title="Article from feed")
        ])

        fetcher = RSSFetcher()
        try:
            articles = await fetcher.fetch_multiple_feeds(feeds, limit_per_feed=10)

            # Should get articles from both feeds
            assert len(articles) == 2
        finally:
            await fetcher.close()

    @respx.mock
    @patch("app.fetchers.rss.feedparser.parse")
    async def test_fetch_google_news_convenience(self, mock_parse):
        """Test Google News convenience function"""
        # Mock all Google News feed URLs
        respx.get(url__regex=r"https://news\.google\.com/.*").mock(
            return_value=httpx.Response(200, content=b"<rss>...</rss>")
        )

        mock_parse.return_value = MockFeed(entries=[
            MockFeedEntry(title="Google News Article")
        ])

        articles = await fetch_google_news(limit_per_feed=5)

        assert isinstance(articles, list)
        assert len(articles) > 0

    @respx.mock
    @patch("app.fetchers.rss.feedparser.parse")
    async def test_fetch_substack_convenience(self, mock_parse):
        """Test Substack convenience function"""
        respx.get(url__regex=r".*\.substack\.com/.*|.*bytebytego.*|.*pragmaticengineer.*|.*lennysnewsletter.*").mock(
            return_value=httpx.Response(200, content=b"<rss>...</rss>")
        )

        mock_parse.return_value = MockFeed(entries=[
            MockFeedEntry(title="Substack Article")
        ])

        articles = await fetch_substack_newsletters(limit_per_feed=5)

        assert isinstance(articles, list)

    @respx.mock
    @patch("app.fetchers.rss.feedparser.parse")
    async def test_fetch_medium_convenience(self, mock_parse):
        """Test Medium convenience function"""
        respx.get(url__regex=r".*medium\.com/.*").mock(
            return_value=httpx.Response(200, content=b"<rss>...</rss>")
        )

        mock_parse.return_value = MockFeed(entries=[
            MockFeedEntry(title="Medium Article")
        ])

        articles = await fetch_medium_publications(limit_per_feed=5)

        assert isinstance(articles, list)

    @respx.mock
    @patch("app.fetchers.rss.feedparser.parse")
    async def test_fetch_tech_news_convenience(self, mock_parse):
        """Test tech news convenience function"""
        respx.get(url__regex=r".*(techcrunch|theverge|arstechnica).*").mock(
            return_value=httpx.Response(200, content=b"<rss>...</rss>")
        )

        mock_parse.return_value = MockFeed(entries=[
            MockFeedEntry(title="Tech News Article")
        ])

        articles = await fetch_tech_news(limit_per_feed=5)

        assert isinstance(articles, list)

    @patch("app.fetchers.rss.feedparser.parse")
    async def test_rss_articles_standardization(self, mock_parse):
        """Test that RSS articles have standardized format matching other sources"""
        entry = {
            "title": "Test Article",
            "link": "https://example.com/article",
            "summary": "Article summary",
            "author": "Author Name",
            "published_parsed": datetime(2024, 1, 1).timetuple(),
            "id": "article-id"
        }

        fetcher = RSSFetcher()
        article = fetcher._standardize_entry(
            entry,
            source_name="RSS Source",
            feed_url="https://example.com/feed"
        )

        # Verify all expected standardized fields
        assert "id" in article
        assert "title" in article
        assert "url" in article
        assert "text" in article
        assert "score" in article
        assert "author" in article
        assert "comments" in article
        assert "published_at" in article
        assert "source" in article
        assert "source_id" in article

        # RSS-specific defaults
        assert article["score"] == 0
        assert article["comments"] == 0
        assert article["source"] == "RSS Source"
