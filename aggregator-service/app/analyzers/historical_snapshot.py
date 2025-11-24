"""
Historical Snapshot Service

Stores daily snapshots of keyword frequencies for velocity calculation.
This enables "Trending Up" detection by comparing current vs historical volume.

Snapshots are stored in KeywordHistory table daily.
"""

import structlog
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
import json

logger = structlog.get_logger()


class HistoricalSnapshotService:
    """Manage historical keyword snapshots"""

    def __init__(self, db_connection):
        """
        Initialize historical snapshot service

        Args:
            db_connection: Database connection (SQLite/PostgreSQL)
        """
        self.db = db_connection

    async def create_snapshot(
        self,
        keyword_data: Dict[str, Dict]
    ) -> bool:
        """
        Create a daily snapshot of keyword frequencies

        Args:
            keyword_data: Dict of {keyword: {frequency, sources}}
                         Example: {
                             "GPT-5": {"frequency": 47, "sources": ["HN", "Reddit"]},
                             "Rust async": {"frequency": 23, "sources": ["Medium"]}
                         }

        Returns:
            True if successful
        """
        try:
            today = datetime.now(timezone.utc).date()
            timestamp = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)

            inserted_count = 0

            for keyword, data in keyword_data.items():
                frequency = data.get("frequency", 0)
                sources = data.get("sources", [])

                # Check if snapshot already exists for this keyword today
                existing = await self._get_snapshot(keyword, timestamp)

                if existing:
                    # Update existing snapshot
                    await self._update_snapshot(
                        keyword=keyword,
                        date=timestamp,
                        mentions=frequency,
                        sources=sources
                    )
                else:
                    # Create new snapshot
                    await self._insert_snapshot(
                        keyword=keyword,
                        date=timestamp,
                        mentions=frequency,
                        sources=sources
                    )
                    inserted_count += 1

            logger.info(
                "snapshot_created",
                date=today.isoformat(),
                keywords=len(keyword_data),
                new_entries=inserted_count
            )

            return True

        except Exception as e:
            logger.error("snapshot_creation_failed", error=str(e))
            return False

    async def get_keyword_history(
        self,
        keyword: str,
        days: int = 30
    ) -> List[Dict]:
        """
        Get historical data for a specific keyword

        Args:
            keyword: Keyword to query
            days: Number of days of history to retrieve

        Returns:
            List of {date, mentions, sources} dicts
        """
        try:
            end_date = datetime.now(timezone.utc).date()
            start_date = end_date - timedelta(days=days)

            query = """
                SELECT keyword, mentions, sources, date
                FROM keyword_history
                WHERE keyword = ? AND date >= ? AND date <= ?
                ORDER BY date ASC
            """

            # Execute query (this is pseudo-code, adapt to your DB driver)
            cursor = await self.db.execute(
                query,
                (keyword.lower(), start_date, end_date)
            )
            rows = await cursor.fetchall()

            history = []
            for row in rows:
                history.append({
                    "date": row[3].isoformat() if hasattr(row[3], 'isoformat') else str(row[3]),
                    "mentions": row[1],
                    "sources": json.loads(row[2]) if isinstance(row[2], str) else row[2]
                })

            return history

        except Exception as e:
            logger.error("get_history_failed", keyword=keyword, error=str(e))
            return []

    async def get_average_volume(
        self,
        keyword: str,
        start_date: datetime,
        end_date: datetime
    ) -> float:
        """
        Calculate average daily volume for a keyword in a time period

        Args:
            keyword: Keyword to analyze
            start_date: Start of period
            end_date: End of period

        Returns:
            Average daily mentions
        """
        try:
            query = """
                SELECT AVG(mentions) as avg_mentions
                FROM keyword_history
                WHERE keyword = ? AND date >= ? AND date <= ?
            """

            cursor = await self.db.execute(
                query,
                (keyword.lower(), start_date.date(), end_date.date())
            )
            row = await cursor.fetchone()

            return float(row[0]) if row and row[0] else 0.0

        except Exception as e:
            logger.error("average_volume_failed", keyword=keyword, error=str(e))
            return 0.0

    async def get_all_keywords_history(
        self,
        days: int = 7
    ) -> Dict[str, List[Dict]]:
        """
        Get history for all keywords

        Args:
            days: Number of days to retrieve

        Returns:
            Dict of {keyword: [{date, mentions, sources}, ...]}
        """
        try:
            end_date = datetime.now(timezone.utc).date()
            start_date = end_date - timedelta(days=days)

            query = """
                SELECT keyword, mentions, sources, date
                FROM keyword_history
                WHERE date >= ? AND date <= ?
                ORDER BY keyword, date ASC
            """

            cursor = await self.db.execute(query, (start_date, end_date))
            rows = await cursor.fetchall()

            # Group by keyword
            history_by_keyword = {}
            for row in rows:
                keyword = row[0]
                if keyword not in history_by_keyword:
                    history_by_keyword[keyword] = []

                history_by_keyword[keyword].append({
                    "date": row[3].isoformat() if hasattr(row[3], 'isoformat') else str(row[3]),
                    "mentions": row[1],
                    "sources": json.loads(row[2]) if isinstance(row[2], str) else row[2]
                })

            logger.info(
                "retrieved_all_history",
                keywords=len(history_by_keyword),
                days=days
            )

            return history_by_keyword

        except Exception as e:
            logger.error("get_all_history_failed", error=str(e))
            return {}

    async def cleanup_old_snapshots(self, keep_days: int = 90):
        """
        Delete snapshots older than specified days

        Args:
            keep_days: Number of days of history to keep

        Returns:
            Number of deleted records
        """
        try:
            cutoff_date = datetime.now(timezone.utc).date() - timedelta(days=keep_days)

            query = "DELETE FROM keyword_history WHERE date < ?"
            cursor = await self.db.execute(query, (cutoff_date,))
            deleted_count = cursor.rowcount

            logger.info(
                "cleaned_old_snapshots",
                deleted=deleted_count,
                cutoff_date=cutoff_date.isoformat()
            )

            return deleted_count

        except Exception as e:
            logger.error("cleanup_failed", error=str(e))
            return 0

    async def _get_snapshot(
        self,
        keyword: str,
        date: datetime
    ) -> Optional[Dict]:
        """Get existing snapshot for keyword on specific date"""
        try:
            query = """
                SELECT id, keyword, mentions, sources, date
                FROM keyword_history
                WHERE keyword = ? AND date = ?
            """

            cursor = await self.db.execute(query, (keyword.lower(), date.date()))
            row = await cursor.fetchone()

            if row:
                return {
                    "id": row[0],
                    "keyword": row[1],
                    "mentions": row[2],
                    "sources": json.loads(row[3]) if isinstance(row[3], str) else row[3],
                    "date": row[4]
                }

            return None

        except Exception as e:
            logger.warning("get_snapshot_failed", error=str(e))
            return None

    async def _insert_snapshot(
        self,
        keyword: str,
        date: datetime,
        mentions: int,
        sources: List[str]
    ):
        """Insert new snapshot"""
        query = """
            INSERT INTO keyword_history (id, keyword, mentions, sources, date, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
        """

        # Generate cuid (simplified - use proper cuid generator in production)
        import random
        import string
        cuid = 'c' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=24))

        await self.db.execute(
            query,
            (
                cuid,
                keyword.lower(),
                mentions,
                json.dumps(sources),
                date.date(),
                datetime.now(timezone.utc)
            )
        )
        await self.db.commit()

    async def _update_snapshot(
        self,
        keyword: str,
        date: datetime,
        mentions: int,
        sources: List[str]
    ):
        """Update existing snapshot"""
        query = """
            UPDATE keyword_history
            SET mentions = ?, sources = ?
            WHERE keyword = ? AND date = ?
        """

        await self.db.execute(
            query,
            (mentions, json.dumps(sources), keyword.lower(), date.date())
        )
        await self.db.commit()


# Convenience function for creating snapshots from keyword extractor output
def prepare_snapshot_data(
    keyword_results: List[Dict]
) -> Dict[str, Dict]:
    """
    Convert keyword extractor results to snapshot format

    Args:
        keyword_results: Output from KeywordExtractor.get_top_keywords()
                        [{keyword, frequency, sample_articles}, ...]

    Returns:
        Dict ready for create_snapshot()
        {keyword: {frequency, sources}}
    """
    snapshot_data = {}

    for result in keyword_results:
        keyword = result["keyword"]
        frequency = result["frequency"]

        # Extract unique sources from sample articles
        sources = list(set(
            article["source"]
            for article in result.get("sample_articles", [])
        ))

        snapshot_data[keyword] = {
            "frequency": frequency,
            "sources": sources
        }

    return snapshot_data
