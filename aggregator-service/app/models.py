"""
SQLAlchemy models mirroring Prisma schema

These models provide type-safe database access for the Python aggregator service.
Table names match Prisma's @@map() directives.
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    pass


class Feed(Base):
    """Feed model - RSS/API sources for aggregation"""
    __tablename__ = "feeds"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    # Type & categorization
    type: Mapped[str] = mapped_column(String, default="rss")
    category: Mapped[str] = mapped_column(String, default="tech")

    # Health monitoring
    status: Mapped[str] = mapped_column(String, default="active")
    consecutiveFailures: Mapped[int] = mapped_column(Integer, default=0)
    lastSuccessAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    lastFailureAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    lastErrorMessage: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Scheduling & control
    priority: Mapped[int] = mapped_column(Integer, default=50)
    updateFrequency: Mapped[int] = mapped_column(Integer, default=60)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    lastFetched: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamps
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_feeds_status', 'status'),
        Index('ix_feeds_enabled', 'enabled'),
        Index('ix_feeds_type', 'type'),
        Index('ix_feeds_category', 'category'),
        Index('ix_feeds_enabled_status', 'enabled', 'status'),
    )


class HotTopic(Base):
    """Hot topics - what's popular RIGHT NOW"""
    __tablename__ = "hot_topics"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    keyword: Mapped[str] = mapped_column(String, nullable=False)
    timeframe: Mapped[str] = mapped_column(String, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    mentions: Mapped[int] = mapped_column(Integer, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array
    sampleUrls: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array
    fetchedAt: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_hot_topics_timeframe_rank_fetched', 'timeframe', 'rank', 'fetchedAt'),
        Index('ix_hot_topics_fetched', 'fetchedAt'),
        Index('ix_hot_topics_keyword_timeframe', 'keyword', 'timeframe'),
    )


class TrendingUpTopic(Base):
    """Trending up topics - what's GAINING MOMENTUM"""
    __tablename__ = "trending_up_topics"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    keyword: Mapped[str] = mapped_column(String, nullable=False)
    timeframe: Mapped[str] = mapped_column(String, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    velocity: Mapped[float] = mapped_column(Float, nullable=False)
    currentVolume: Mapped[int] = mapped_column(Integer, nullable=False)
    previousVolume: Mapped[int] = mapped_column(Integer, nullable=False)
    percentGrowth: Mapped[float] = mapped_column(Float, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array
    sampleUrls: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array
    fetchedAt: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_trending_up_timeframe_rank_fetched', 'timeframe', 'rank', 'fetchedAt'),
        Index('ix_trending_up_fetched', 'fetchedAt'),
        Index('ix_trending_up_keyword_timeframe', 'keyword', 'timeframe'),
    )


class KeywordHistory(Base):
    """Historical keyword tracking for velocity calculation"""
    __tablename__ = "keyword_history"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    keyword: Mapped[str] = mapped_column(String, nullable=False)
    mentions: Mapped[int] = mapped_column(Integer, nullable=False)
    sources: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_keyword_history_keyword_date', 'keyword', 'date'),
        Index('ix_keyword_history_date', 'date'),
        Index('ix_keyword_history_keyword', 'keyword'),
    )
