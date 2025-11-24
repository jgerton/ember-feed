"""
Shared test fixtures and configuration for aggregator service tests.
"""

import pytest
from datetime import datetime, timedelta
from typing import Dict, List

# Test data fixtures

@pytest.fixture
def sample_article():
    """Sample article data for testing."""
    return {
        "title": "GPT-5 Release Announcement",
        "url": "https://example.com/gpt5-release",
        "source": "TechNews",
        "published_at": datetime.now().isoformat(),
        "score": 100,
        "comments": 50,
    }


@pytest.fixture
def sample_articles():
    """Multiple sample articles for testing."""
    base_time = datetime.now()
    return [
        {
            "title": "GPT-5 launches with new features",
            "url": "https://example.com/gpt5",
            "source": "HackerNews",
            "published_at": (base_time - timedelta(hours=2)).isoformat(),
            "score": 150,
            "comments": 75,
        },
        {
            "title": "Rust async programming improvements",
            "url": "https://example.com/rust-async",
            "source": "Reddit",
            "published_at": (base_time - timedelta(hours=5)).isoformat(),
            "score": 80,
            "comments": 30,
        },
        {
            "title": "Python 3.13 beta released",
            "url": "https://example.com/python-313",
            "source": "Medium",
            "published_at": (base_time - timedelta(hours=8)).isoformat(),
            "score": 60,
            "comments": 20,
        },
    ]


@pytest.fixture
def sample_keywords():
    """Sample keywords with counts for testing."""
    return {
        "gpt-5 launches": 15,
        "rust async programming": 8,
        "python 3.13 beta": 5,
        "machine learning models": 12,
        "docker container optimization": 7,
    }


@pytest.fixture
def sample_hackernews_story():
    """Sample Hacker News story data."""
    return {
        "id": 12345,
        "title": "Show HN: My New Project",
        "url": "https://example.com/project",
        "score": 100,
        "descendants": 50,
        "time": int(datetime.now().timestamp()),
        "type": "story",
        "by": "username",
    }


@pytest.fixture
def sample_reddit_post():
    """Sample Reddit post data."""
    return {
        "id": "abc123",
        "title": "Interesting development in AI",
        "url": "https://example.com/ai-development",
        "score": 250,
        "num_comments": 75,
        "created_utc": datetime.now().timestamp(),
        "subreddit": "technology",
        "author": "testuser",
        "selftext": "This is the post content...",
    }


@pytest.fixture
def sample_rss_entry():
    """Sample RSS feed entry."""
    return {
        "title": "New Framework Released",
        "link": "https://example.com/framework",
        "published": datetime.now().isoformat(),
        "summary": "A new web framework has been released...",
        "author": "Framework Team",
    }


@pytest.fixture
def mock_keyword_history():
    """Mock historical keyword data for velocity testing."""
    base_date = datetime.now()
    return [
        {
            "keyword": "gpt-5",
            "mentions": 10,
            "date": (base_date - timedelta(days=7)).isoformat(),
        },
        {
            "keyword": "gpt-5",
            "mentions": 15,
            "date": (base_date - timedelta(days=6)).isoformat(),
        },
        {
            "keyword": "gpt-5",
            "mentions": 20,
            "date": (base_date - timedelta(days=5)).isoformat(),
        },
        {
            "keyword": "rust async",
            "mentions": 5,
            "date": (base_date - timedelta(days=7)).isoformat(),
        },
        {
            "keyword": "rust async",
            "mentions": 8,
            "date": (base_date - timedelta(days=5)).isoformat(),
        },
    ]
