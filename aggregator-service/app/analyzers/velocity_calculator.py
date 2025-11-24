"""
Trending Up Velocity Calculator

Identifies keywords that are GAINING MOMENTUM by comparing current volume
to historical baselines. This detects emerging trends before they peak.

Velocity Formula: (Current_Volume - Historical_Average) / Time_Period
Percent Growth: ((Current - Previous) / Previous) * 100

Based on MIT research (95% accuracy, 1.5-5 hour lead time) and BuzzSumo's
velocity-based trending detection.
"""

import structlog
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Tuple

logger = structlog.get_logger()


class VelocityCalculator:
    """Calculate trending velocity for keywords"""

    def __init__(
        self,
        min_growth_percent: float = 50.0,
        min_current_volume: int = 5
    ):
        """
        Initialize velocity calculator

        Args:
            min_growth_percent: Minimum % growth to be considered trending up
            min_current_volume: Minimum current mentions to avoid noise
        """
        self.min_growth_percent = min_growth_percent
        self.min_current_volume = min_current_volume

    def calculate_velocity(
        self,
        current_volume: int,
        previous_volume: int,
        time_period_days: int
    ) -> float:
        """
        Calculate velocity score

        Args:
            current_volume: Mentions in current period
            previous_volume: Mentions in previous period
            time_period_days: Length of period in days

        Returns:
            Velocity score (higher = faster growth)
        """
        if previous_volume == 0:
            # Avoid division by zero
            # If previous was 0 and current > 0, it's infinite growth
            return current_volume * 10.0  # High velocity score

        # Basic velocity: change per day
        velocity = (current_volume - previous_volume) / time_period_days

        # Weight by magnitude (larger absolute changes matter more)
        magnitude_weight = 1 + (current_volume / 100)

        return velocity * magnitude_weight

    def calculate_percent_growth(
        self,
        current_volume: int,
        previous_volume: int
    ) -> float:
        """
        Calculate percent growth

        Args:
            current_volume: Current mentions
            previous_volume: Previous mentions

        Returns:
            Percent growth (e.g., 150.0 for 150% increase)
        """
        if previous_volume == 0:
            # Infinite growth - return large number
            return 1000.0 if current_volume > 0 else 0.0

        growth = ((current_volume - previous_volume) / previous_volume) * 100
        return growth

    def find_trending_up_keywords(
        self,
        current_keywords: Dict[str, int],
        historical_data: Dict[str, List[Dict]],
        timeframe_days: int = 7
    ) -> List[Dict]:
        """
        Find keywords that are trending up

        Args:
            current_keywords: {keyword: current_mentions}
            historical_data: {keyword: [{date, mentions, sources}]}
            timeframe_days: Comparison timeframe (7, 14, or 30 days)

        Returns:
            List of trending up keywords with metadata
        """
        trending_keywords = []

        for keyword, current_volume in current_keywords.items():
            # Skip if below minimum volume
            if current_volume < self.min_current_volume:
                continue

            # Get historical data for this keyword
            history = historical_data.get(keyword, [])

            if not history:
                # No historical data - treat as potentially new trend
                if current_volume >= self.min_current_volume * 2:
                    trending_keywords.append({
                        "keyword": keyword,
                        "current_volume": current_volume,
                        "previous_volume": 0,
                        "velocity": current_volume * 10.0,
                        "percent_growth": 1000.0,
                        "is_new": True
                    })
                continue

            # Calculate previous period volume
            previous_volume = self._calculate_previous_volume(
                history,
                timeframe_days
            )

            # Calculate metrics
            velocity = self.calculate_velocity(
                current_volume=current_volume,
                previous_volume=previous_volume,
                time_period_days=timeframe_days
            )

            percent_growth = self.calculate_percent_growth(
                current_volume=current_volume,
                previous_volume=previous_volume
            )

            # Filter by minimum growth threshold
            if percent_growth >= self.min_growth_percent:
                trending_keywords.append({
                    "keyword": keyword,
                    "current_volume": current_volume,
                    "previous_volume": previous_volume,
                    "velocity": velocity,
                    "percent_growth": percent_growth,
                    "is_new": False
                })

        # Sort by velocity (highest first)
        trending_keywords.sort(key=lambda x: x["velocity"], reverse=True)

        logger.info(
            "found_trending_up_keywords",
            count=len(trending_keywords),
            timeframe_days=timeframe_days
        )

        return trending_keywords

    def get_top_trending_up(
        self,
        current_keywords: Dict[str, int],
        historical_data: Dict[str, List[Dict]],
        timeframe_days: int = 7,
        top_n: int = 5
    ) -> List[Dict]:
        """
        Get top N keywords trending up

        Args:
            current_keywords: Current keyword frequencies
            historical_data: Historical data by keyword
            timeframe_days: Comparison period
            top_n: Number of top keywords to return

        Returns:
            Top N trending up keywords
        """
        trending = self.find_trending_up_keywords(
            current_keywords=current_keywords,
            historical_data=historical_data,
            timeframe_days=timeframe_days
        )

        return trending[:top_n]

    def _calculate_previous_volume(
        self,
        history: List[Dict],
        timeframe_days: int
    ) -> int:
        """
        Calculate volume from previous period

        Args:
            history: List of {date, mentions, sources}
            timeframe_days: Days to look back

        Returns:
            Average daily mentions in previous period
        """
        if not history:
            return 0

        # Calculate date range for previous period
        # If timeframe is 7 days, previous period is days 8-14 ago
        end_date = datetime.now(timezone.utc) - timedelta(days=timeframe_days)
        start_date = end_date - timedelta(days=timeframe_days)

        # Filter history to previous period
        previous_mentions = []
        for entry in history:
            # Parse date
            entry_date = datetime.fromisoformat(entry["date"].replace('Z', '+00:00'))

            if start_date <= entry_date <= end_date:
                previous_mentions.append(entry["mentions"])

        # Return average
        if previous_mentions:
            return int(sum(previous_mentions) / len(previous_mentions))

        return 0

    def detect_spike(
        self,
        current_volume: int,
        history: List[Dict],
        spike_threshold: float = 3.0
    ) -> Tuple[bool, float]:
        """
        Detect if current volume is an anomalous spike

        Args:
            current_volume: Current mentions
            history: Historical data
            spike_threshold: Multiple of standard deviation to flag as spike

        Returns:
            (is_spike, z_score)
        """
        if not history or len(history) < 3:
            return False, 0.0

        # Calculate mean and std dev of historical mentions
        historical_volumes = [entry["mentions"] for entry in history]
        mean = sum(historical_volumes) / len(historical_volumes)

        # Standard deviation
        variance = sum((x - mean) ** 2 for x in historical_volumes) / len(historical_volumes)
        std_dev = variance ** 0.5

        if std_dev == 0:
            return current_volume > mean * 2, 0.0

        # Calculate z-score
        z_score = (current_volume - mean) / std_dev

        # Is it a spike?
        is_spike = z_score >= spike_threshold

        return is_spike, z_score


# Convenience function
def calculate_trending_up(
    current_keywords: Dict[str, int],
    historical_data: Dict[str, List[Dict]],
    timeframe_days: int = 7,
    top_n: int = 5,
    min_growth: float = 50.0
) -> List[Dict]:
    """
    Calculate trending up keywords

    Args:
        current_keywords: {keyword: current_frequency}
        historical_data: {keyword: historical_data}
        timeframe_days: Comparison period (7, 14, or 30)
        top_n: Number of top results
        min_growth: Minimum % growth threshold

    Returns:
        Top N trending up keywords with velocity metrics
    """
    calculator = VelocityCalculator(min_growth_percent=min_growth)

    return calculator.get_top_trending_up(
        current_keywords=current_keywords,
        historical_data=historical_data,
        timeframe_days=timeframe_days,
        top_n=top_n
    )
