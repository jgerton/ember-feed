"""
Tests for Reddit Fetcher
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, AsyncMock
from datetime import datetime, timezone

from app.fetchers.reddit import RedditFetcher, fetch_trending_reddit


class MockSubmission:
    """Mock Reddit submission for testing"""

    def __init__(
        self,
        id="test123",
        title="Test Post",
        url="https://example.com",
        score=100,
        num_comments=50,
        created_utc=None,
        is_self=False,
        selftext="",
        author="testuser",
        stickied=False,
        permalink="/r/test/comments/test123/test_post/"
    ):
        self.id = id
        self.title = title
        self.url = url
        self.score = score
        self.num_comments = num_comments
        self.created_utc = created_utc or datetime.now(timezone.utc).timestamp()
        self.is_self = is_self
        self.selftext = selftext
        self.author = author
        self.stickied = stickied
        self.permalink = permalink


@pytest.mark.unit
@pytest.mark.asyncio
class TestRedditFetcher:
    """Test Reddit fetcher functionality"""

    @patch("app.fetchers.reddit.praw.Reddit")
    async def test_initialization_with_oauth(self, mock_reddit_class):
        """Test fetcher initializes correctly with OAuth credentials"""
        mock_reddit = Mock()
        mock_reddit_class.return_value = mock_reddit

        fetcher = RedditFetcher(
            client_id="test_client_id",
            client_secret="test_client_secret"
        )

        assert fetcher.reddit is not None
        mock_reddit_class.assert_called_once()

    async def test_initialization_without_oauth(self):
        """Test fetcher initializes without OAuth credentials"""
        fetcher = RedditFetcher()

        assert fetcher.reddit is None

    @patch("app.fetchers.reddit.praw.Reddit")
    async def test_fetch_hot_posts_success(self, mock_reddit_class):
        """Test successfully fetching hot posts"""
        # Create mock submissions
        mock_submissions = [
            MockSubmission(id="post1", title="Hot Post 1", score=150),
            MockSubmission(id="post2", title="Hot Post 2", score=120),
        ]

        # Mock the subreddit and hot method
        mock_subreddit = Mock()
        mock_subreddit.hot.return_value = iter(mock_submissions)

        mock_reddit = Mock()
        mock_reddit.subreddit.return_value = mock_subreddit
        mock_reddit_class.return_value = mock_reddit

        fetcher = RedditFetcher(
            client_id="test_id",
            client_secret="test_secret"
        )

        posts = await fetcher.fetch_hot_posts(
            subreddits=["technology"],
            limit=25
        )

        assert len(posts) == 2
        assert posts[0]["title"] == "Hot Post 1"
        assert posts[0]["source"] == "Reddit"
        assert posts[0]["score"] == 150
        assert "published_at" in posts[0]

    @patch("app.fetchers.reddit.praw.Reddit")
    async def test_fetch_posts_with_min_score_filter(self, mock_reddit_class):
        """Test filtering posts by minimum score"""
        mock_submissions = [
            MockSubmission(id="post1", score=50),
            MockSubmission(id="post2", score=100),
            MockSubmission(id="post3", score=150),
        ]

        mock_subreddit = Mock()
        mock_subreddit.hot.return_value = iter(mock_submissions)

        mock_reddit = Mock()
        mock_reddit.subreddit.return_value = mock_subreddit
        mock_reddit_class.return_value = mock_reddit

        fetcher = RedditFetcher(
            client_id="test_id",
            client_secret="test_secret"
        )

        posts = await fetcher.fetch_hot_posts(
            subreddits=["technology"],
            limit=25,
            min_score=100
        )

        # Only posts with score >= 100 should be returned
        assert len(posts) == 2
        assert all(post["score"] >= 100 for post in posts)

    @patch("app.fetchers.reddit.praw.Reddit")
    async def test_skip_stickied_posts(self, mock_reddit_class):
        """Test that stickied posts are filtered out"""
        mock_submissions = [
            MockSubmission(id="post1", title="Normal Post", stickied=False),
            MockSubmission(id="post2", title="Stickied Post", stickied=True),
        ]

        mock_subreddit = Mock()
        mock_subreddit.hot.return_value = iter(mock_submissions)

        mock_reddit = Mock()
        mock_reddit.subreddit.return_value = mock_subreddit
        mock_reddit_class.return_value = mock_reddit

        fetcher = RedditFetcher(
            client_id="test_id",
            client_secret="test_secret"
        )

        posts = await fetcher.fetch_hot_posts(subreddits=["technology"])

        # Stickied post should be filtered out
        assert len(posts) == 1
        assert posts[0]["title"] == "Normal Post"

    @patch("app.fetchers.reddit.praw.Reddit")
    async def test_fetch_self_posts(self, mock_reddit_class):
        """Test fetching self (text) posts"""
        mock_submissions = [
            MockSubmission(
                id="post1",
                title="Ask: What framework?",
                is_self=True,
                selftext="I'm looking for a good framework...",
                url="https://reddit.com/r/programming/..."
            )
        ]

        mock_subreddit = Mock()
        mock_subreddit.hot.return_value = iter(mock_submissions)

        mock_reddit = Mock()
        mock_reddit.subreddit.return_value = mock_subreddit
        mock_reddit_class.return_value = mock_reddit

        fetcher = RedditFetcher(
            client_id="test_id",
            client_secret="test_secret"
        )

        posts = await fetcher.fetch_hot_posts(subreddits=["programming"])

        assert len(posts) == 1
        assert posts[0]["text"] == "I'm looking for a good framework..."
        assert posts[0]["is_self"] is True

    @patch("app.fetchers.reddit.praw.Reddit")
    async def test_fetch_top_posts(self, mock_reddit_class):
        """Test fetching top posts by timeframe"""
        mock_submissions = [
            MockSubmission(id="post1", title="Top Post 1", score=500),
            MockSubmission(id="post2", title="Top Post 2", score=450),
        ]

        mock_subreddit = Mock()
        mock_subreddit.top.return_value = iter(mock_submissions)

        mock_reddit = Mock()
        mock_reddit.subreddit.return_value = mock_subreddit
        mock_reddit_class.return_value = mock_reddit

        fetcher = RedditFetcher(
            client_id="test_id",
            client_secret="test_secret"
        )

        posts = await fetcher.fetch_top_posts(
            subreddits=["technology"],
            timeframe="week",
            limit=10
        )

        assert len(posts) == 2
        mock_subreddit.top.assert_called_once()
        # Verify timeframe parameter was passed
        call_kwargs = mock_subreddit.top.call_args.kwargs
        assert call_kwargs["time_filter"] == "week"

    @patch("app.fetchers.reddit.praw.Reddit")
    async def test_fetch_multiple_subreddits(self, mock_reddit_class):
        """Test fetching from multiple subreddits"""
        mock_submissions_tech = [
            MockSubmission(id="tech1", title="Tech Post")
        ]
        mock_submissions_prog = [
            MockSubmission(id="prog1", title="Programming Post")
        ]

        mock_reddit = Mock()

        def mock_subreddit(name):
            subreddit = Mock()
            if name == "technology":
                subreddit.hot.return_value = iter(mock_submissions_tech)
            else:
                subreddit.hot.return_value = iter(mock_submissions_prog)
            return subreddit

        mock_reddit.subreddit = mock_subreddit
        mock_reddit_class.return_value = mock_reddit

        fetcher = RedditFetcher(
            client_id="test_id",
            client_secret="test_secret"
        )

        posts = await fetcher.fetch_hot_posts(
            subreddits=["technology", "programming"]
        )

        # Should get posts from both subreddits
        assert len(posts) == 2

    @patch("app.fetchers.reddit.praw.Reddit")
    async def test_handles_deleted_author(self, mock_reddit_class):
        """Test handling posts with deleted authors"""
        mock_submission = MockSubmission(
            id="post1",
            title="Post with deleted author",
            author=None
        )

        mock_subreddit = Mock()
        mock_subreddit.hot.return_value = iter([mock_submission])

        mock_reddit = Mock()
        mock_reddit.subreddit.return_value = mock_subreddit
        mock_reddit_class.return_value = mock_reddit

        fetcher = RedditFetcher(
            client_id="test_id",
            client_secret="test_secret"
        )

        posts = await fetcher.fetch_hot_posts(subreddits=["technology"])

        assert len(posts) == 1
        assert posts[0]["author"] == "[deleted]"

    @patch("app.fetchers.reddit.praw.Reddit")
    async def test_handles_fetch_error(self, mock_reddit_class):
        """Test graceful error handling when fetch fails"""
        mock_reddit = Mock()
        mock_reddit.subreddit.side_effect = Exception("API Error")
        mock_reddit_class.return_value = mock_reddit

        fetcher = RedditFetcher(
            client_id="test_id",
            client_secret="test_secret"
        )

        posts = await fetcher.fetch_hot_posts(subreddits=["technology"])

        # Should return empty list on error, not raise exception
        assert posts == []

    async def test_returns_empty_when_not_initialized(self):
        """Test that fetcher returns empty list when Reddit client not initialized"""
        fetcher = RedditFetcher()  # No credentials

        posts = await fetcher.fetch_hot_posts(subreddits=["technology"])

        assert posts == []

    @patch("app.fetchers.reddit.praw.Reddit")
    async def test_post_standardization(self, mock_reddit_class):
        """Test that posts are returned in standardized format"""
        mock_submission = MockSubmission(
            id="test123",
            title="Test Title",
            url="https://example.com",
            score=100,
            num_comments=25,
            created_utc=1234567890,
            author="testuser",
            permalink="/r/technology/comments/test123/test_title/"
        )

        mock_subreddit = Mock()
        mock_subreddit.hot.return_value = iter([mock_submission])

        mock_reddit = Mock()
        mock_reddit.subreddit.return_value = mock_subreddit
        mock_reddit_class.return_value = mock_reddit

        fetcher = RedditFetcher(
            client_id="test_id",
            client_secret="test_secret"
        )

        posts = await fetcher.fetch_hot_posts(subreddits=["technology"])

        post = posts[0]

        # Verify all expected fields
        assert "id" in post
        assert "title" in post
        assert "url" in post
        assert "score" in post
        assert "author" in post
        assert "comments" in post
        assert "published_at" in post
        assert "subreddit" in post
        assert "source" in post
        assert "source_id" in post
        assert "permalink" in post

        # Verify values
        assert post["source"] == "Reddit"
        assert post["subreddit"] == "technology"
        assert post["source_id"] == "r/technology/test123"
        assert "reddit.com" in post["permalink"]

    @patch("app.fetchers.reddit.RedditFetcher")
    async def test_fetch_trending_reddit_convenience(self, mock_fetcher_class):
        """Test the convenience function"""
        mock_fetcher = Mock()
        mock_fetcher.fetch_hot_posts = AsyncMock(return_value=[
            {"title": "Trending Post", "score": 150}
        ])
        mock_fetcher_class.return_value = mock_fetcher

        posts = await fetch_trending_reddit(
            client_id="test_id",
            client_secret="test_secret",
            min_score=100
        )

        assert len(posts) == 1
        # Verify default subreddits are used
        call_kwargs = mock_fetcher.fetch_hot_posts.call_args.kwargs
        assert "technology" in call_kwargs["subreddits"]
        assert "programming" in call_kwargs["subreddits"]
