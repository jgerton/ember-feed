"""
Tests for Hacker News Fetcher
"""

import pytest
import respx
import httpx
from datetime import datetime, timezone

from app.fetchers.hackernews import HackerNewsFetcher, fetch_trending_hn, BASE_URL


@pytest.mark.unit
@pytest.mark.asyncio
class TestHackerNewsFetcher:
    """Test HackerNews fetcher functionality"""

    @respx.mock
    async def test_fetch_top_stories_success(self):
        """Test successful fetch of top stories"""
        # Mock the top stories endpoint
        story_ids = [12345, 12346, 12347]
        respx.get(f"{BASE_URL}/topstories.json").mock(
            return_value=httpx.Response(200, json=story_ids)
        )

        # Mock individual story endpoints
        for i, story_id in enumerate(story_ids):
            story_data = {
                "id": story_id,
                "type": "story",
                "title": f"Test Story {i+1}",
                "url": f"https://example.com/story{i+1}",
                "score": 100 + i * 10,
                "by": "testuser",
                "descendants": 50,
                "time": int(datetime.now(timezone.utc).timestamp()),
            }
            respx.get(f"{BASE_URL}/item/{story_id}.json").mock(
                return_value=httpx.Response(200, json=story_data)
            )

        fetcher = HackerNewsFetcher()
        try:
            stories = await fetcher.fetch_top_stories(limit=3)

            assert len(stories) == 3
            assert stories[0]["title"] == "Test Story 1"
            assert stories[0]["source"] == "HackerNews"
            assert stories[0]["score"] == 100
            assert "published_at" in stories[0]
        finally:
            await fetcher.close()

    @respx.mock
    async def test_fetch_top_stories_with_min_score(self):
        """Test fetching stories with minimum score filter"""
        story_ids = [12345, 12346, 12347]
        respx.get(f"{BASE_URL}/topstories.json").mock(
            return_value=httpx.Response(200, json=story_ids)
        )

        # Mock stories with different scores
        scores = [50, 100, 150]
        for story_id, score in zip(story_ids, scores):
            story_data = {
                "id": story_id,
                "type": "story",
                "title": f"Story with score {score}",
                "url": f"https://example.com/story",
                "score": score,
                "by": "testuser",
                "descendants": 10,
                "time": int(datetime.now(timezone.utc).timestamp()),
            }
            respx.get(f"{BASE_URL}/item/{story_id}.json").mock(
                return_value=httpx.Response(200, json=story_data)
            )

        fetcher = HackerNewsFetcher()
        try:
            # Only stories with score >= 100 should be returned
            stories = await fetcher.fetch_top_stories(limit=3, min_score=100)

            assert len(stories) == 2
            assert all(story["score"] >= 100 for story in stories)
        finally:
            await fetcher.close()

    @respx.mock
    async def test_fetch_story_handles_deleted(self):
        """Test that deleted stories are filtered out"""
        story_id = 12345

        # Mock deleted story
        respx.get(f"{BASE_URL}/item/{story_id}.json").mock(
            return_value=httpx.Response(200, json={"id": story_id, "deleted": True})
        )

        fetcher = HackerNewsFetcher()
        try:
            story = await fetcher._fetch_story(story_id)
            assert story is None
        finally:
            await fetcher.close()

    @respx.mock
    async def test_fetch_story_handles_non_story_types(self):
        """Test that non-story items (comments, polls) are filtered out"""
        story_id = 12345

        # Mock comment item
        respx.get(f"{BASE_URL}/item/{story_id}.json").mock(
            return_value=httpx.Response(
                200,
                json={"id": story_id, "type": "comment", "text": "This is a comment"}
            )
        )

        fetcher = HackerNewsFetcher()
        try:
            story = await fetcher._fetch_story(story_id)
            assert story is None
        finally:
            await fetcher.close()

    @respx.mock
    async def test_fetch_story_with_ask_hn_post(self):
        """Test fetching Ask HN posts without URL"""
        story_id = 12345
        story_data = {
            "id": story_id,
            "type": "story",
            "title": "Ask HN: What's your favorite framework?",
            "text": "I'm curious about what frameworks people use...",
            "score": 75,
            "by": "testuser",
            "descendants": 30,
            "time": int(datetime.now(timezone.utc).timestamp()),
        }

        respx.get(f"{BASE_URL}/item/{story_id}.json").mock(
            return_value=httpx.Response(200, json=story_data)
        )

        fetcher = HackerNewsFetcher()
        try:
            story = await fetcher._fetch_story(story_id)

            assert story is not None
            assert story["title"] == "Ask HN: What's your favorite framework?"
            assert story["text"] == "I'm curious about what frameworks people use..."
            # Ask HN posts without URL should use HN item URL
            assert story["url"] == f"https://news.ycombinator.com/item?id={story_id}"
        finally:
            await fetcher.close()

    @respx.mock
    async def test_fetch_best_stories(self):
        """Test fetching best stories"""
        story_ids = [12345, 12346]
        respx.get(f"{BASE_URL}/beststories.json").mock(
            return_value=httpx.Response(200, json=story_ids)
        )

        for i, story_id in enumerate(story_ids):
            story_data = {
                "id": story_id,
                "type": "story",
                "title": f"Best Story {i+1}",
                "url": f"https://example.com/best{i+1}",
                "score": 200,
                "by": "testuser",
                "descendants": 100,
                "time": int(datetime.now(timezone.utc).timestamp()),
            }
            respx.get(f"{BASE_URL}/item/{story_id}.json").mock(
                return_value=httpx.Response(200, json=story_data)
            )

        fetcher = HackerNewsFetcher()
        try:
            stories = await fetcher.fetch_best_stories(limit=2)

            assert len(stories) == 2
            assert stories[0]["title"] == "Best Story 1"
        finally:
            await fetcher.close()

    @respx.mock
    async def test_fetch_handles_api_error(self):
        """Test graceful handling of API errors"""
        respx.get(f"{BASE_URL}/topstories.json").mock(
            return_value=httpx.Response(500, json={"error": "Internal Server Error"})
        )

        fetcher = HackerNewsFetcher()
        try:
            stories = await fetcher.fetch_top_stories()
            # Should return empty list on error
            assert stories == []
        finally:
            await fetcher.close()

    @respx.mock
    async def test_fetch_trending_hn_convenience_function(self):
        """Test the convenience function"""
        story_ids = [12345]
        respx.get(f"{BASE_URL}/topstories.json").mock(
            return_value=httpx.Response(200, json=story_ids)
        )

        story_data = {
            "id": 12345,
            "type": "story",
            "title": "Trending Story",
            "url": "https://example.com/trending",
            "score": 150,
            "by": "testuser",
            "descendants": 50,
            "time": int(datetime.now(timezone.utc).timestamp()),
        }
        respx.get(f"{BASE_URL}/item/12345.json").mock(
            return_value=httpx.Response(200, json=story_data)
        )

        stories = await fetch_trending_hn(min_score=100, limit=1)

        assert len(stories) == 1
        assert stories[0]["score"] >= 100

    @respx.mock
    async def test_story_standardization(self):
        """Test that stories are returned in standardized format"""
        story_id = 12345
        story_data = {
            "id": story_id,
            "type": "story",
            "title": "Test Title",
            "url": "https://example.com",
            "score": 100,
            "by": "author123",
            "descendants": 25,
            "time": 1234567890,
        }

        respx.get(f"{BASE_URL}/item/{story_id}.json").mock(
            return_value=httpx.Response(200, json=story_data)
        )

        fetcher = HackerNewsFetcher()
        try:
            story = await fetcher._fetch_story(story_id)

            # Verify all expected fields are present
            assert "id" in story
            assert "title" in story
            assert "url" in story
            assert "score" in story
            assert "author" in story
            assert "comments" in story
            assert "published_at" in story
            assert "source" in story
            assert "source_id" in story

            # Verify values
            assert story["source"] == "HackerNews"
            assert story["source_id"] == str(story_id)
            assert story["comments"] == 25
        finally:
            await fetcher.close()
