"""Configuration settings for the aggregator service"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database
    database_url: str = "sqlite:///./data/dashboard.db"

    # Redis
    redis_url: str = "redis://redis:6379"
    redis_cache_ttl: int = 900  # 15 minutes in seconds

    # Reddit API (OAuth)
    reddit_client_id: Optional[str] = None
    reddit_client_secret: Optional[str] = None
    reddit_user_agent: str = "trending-aggregator/1.0"

    # Update frequencies (minutes)
    hackernews_update_freq: int = 30
    reddit_update_freq: int = 30
    rss_update_freq: int = 60

    # Trending detection
    hot_now_cache_ttl: int = 900  # 15 minutes
    trending_up_cache_ttl: int = 1800  # 30 minutes
    min_keyword_length: int = 3
    max_keywords_per_article: int = 10

    # Deduplication
    minhash_num_perm: int = 128
    lsh_threshold: float = 0.5

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
