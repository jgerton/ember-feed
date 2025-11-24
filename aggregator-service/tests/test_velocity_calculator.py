"""
Tests for Velocity Calculator (Trending Up Detection)
"""

import pytest
from datetime import datetime, timedelta, timezone
from app.analyzers.velocity_calculator import (
    VelocityCalculator,
    calculate_trending_up
)


@pytest.mark.unit
class TestVelocityCalculator:
    """Test velocity calculation functionality"""

    def test_calculate_velocity_basic(self):
        """Test basic velocity calculation"""
        calc = VelocityCalculator()

        velocity = calc.calculate_velocity(
            current_volume=100,
            previous_volume=50,
            time_period_days=7
        )

        assert velocity > 0
        assert isinstance(velocity, float)

    def test_calculate_velocity_zero_previous(self):
        """Test velocity with zero previous volume (infinite growth)"""
        calc = VelocityCalculator()

        velocity = calc.calculate_velocity(
            current_volume=50,
            previous_volume=0,
            time_period_days=7
        )

        # Should return high velocity score (current * 10)
        assert velocity == 50 * 10.0

    def test_calculate_velocity_negative_growth(self):
        """Test velocity with declining volume"""
        calc = VelocityCalculator()

        velocity = calc.calculate_velocity(
            current_volume=50,
            previous_volume=100,
            time_period_days=7
        )

        # Should be negative for declining trends
        assert velocity < 0

    def test_calculate_percent_growth(self):
        """Test percent growth calculation"""
        calc = VelocityCalculator()

        # 100% growth (doubled)
        growth = calc.calculate_percent_growth(
            current_volume=100,
            previous_volume=50
        )

        assert growth == 100.0

    def test_percent_growth_zero_previous(self):
        """Test percent growth with zero previous"""
        calc = VelocityCalculator()

        growth = calc.calculate_percent_growth(
            current_volume=50,
            previous_volume=0
        )

        # Should return 1000% for infinite growth
        assert growth == 1000.0

    def test_percent_growth_zero_both(self):
        """Test percent growth when both are zero"""
        calc = VelocityCalculator()

        growth = calc.calculate_percent_growth(
            current_volume=0,
            previous_volume=0
        )

        # Should return 0
        assert growth == 0.0

    def test_find_trending_up_keywords(self):
        """Test finding trending up keywords from current and historical data"""
        calc = VelocityCalculator(min_growth_percent=50.0, min_current_volume=5)

        current_keywords = {
            "ai models": 150,
            "python async": 75,
            "docker containers": 30
        }

        # Create historical data
        base_date = datetime.now(timezone.utc) - timedelta(days=10)
        historical_data = {
            "ai models": [
                {"date": (base_date + timedelta(days=i)).isoformat(), "mentions": 50 + i}
                for i in range(5)
            ],
            "python async": [
                {"date": (base_date + timedelta(days=i)).isoformat(), "mentions": 30 + i}
                for i in range(5)
            ]
        }

        trending = calc.find_trending_up_keywords(
            current_keywords=current_keywords,
            historical_data=historical_data,
            timeframe_days=7
        )

        assert isinstance(trending, list)
        # Should have at least some trending keywords
        assert len(trending) > 0

        # Verify structure
        for kw in trending:
            assert "keyword" in kw
            assert "current_volume" in kw
            assert "previous_volume" in kw
            assert "velocity" in kw
            assert "percent_growth" in kw
            assert "is_new" in kw

    def test_min_current_volume_filter(self):
        """Test minimum current volume filter"""
        calc = VelocityCalculator(min_current_volume=10)

        current_keywords = {
            "high volume": 50,
            "low volume": 3  # Below threshold
        }

        historical_data = {
            "high volume": [{"date": datetime.now(timezone.utc).isoformat(), "mentions": 10}],
            "low volume": [{"date": datetime.now(timezone.utc).isoformat(), "mentions": 1}]
        }

        trending = calc.find_trending_up_keywords(
            current_keywords=current_keywords,
            historical_data=historical_data
        )

        # Low volume keyword should be filtered out
        keywords_list = [kw["keyword"] for kw in trending]
        assert "low volume" not in keywords_list

    def test_min_growth_percent_filter(self):
        """Test minimum growth percent filter"""
        calc = VelocityCalculator(min_growth_percent=100.0, min_current_volume=5)

        current_keywords = {
            "high growth": 100,
            "low growth": 55
        }

        historical_data = {
            "high growth": [
                {"date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(), "mentions": 40}
            ],
            "low growth": [
                {"date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(), "mentions": 50}
            ]
        }

        trending = calc.find_trending_up_keywords(
            current_keywords=current_keywords,
            historical_data=historical_data
        )

        keywords_list = [kw["keyword"] for kw in trending]

        # high growth: (100-40)/40 = 150% - should pass
        # low growth: (55-50)/50 = 10% - should fail
        assert "high growth" in keywords_list
        assert "low growth" not in keywords_list

    def test_new_keyword_detection(self):
        """Test detection of completely new keywords"""
        calc = VelocityCalculator(min_current_volume=5)

        current_keywords = {
            "brand new keyword": 15  # No historical data
        }

        historical_data = {}  # Empty

        trending = calc.find_trending_up_keywords(
            current_keywords=current_keywords,
            historical_data=historical_data
        )

        # Should detect as new trend if volume is high enough
        if trending:
            assert trending[0]["is_new"] is True
            assert trending[0]["previous_volume"] == 0
            assert trending[0]["percent_growth"] == 1000.0

    def test_get_top_trending_up_limits_results(self):
        """Test that get_top_trending_up limits to top_n"""
        calc = VelocityCalculator(min_growth_percent=0, min_current_volume=1)

        current_keywords = {f"keyword{i}": 100 + i for i in range(10)}

        historical_data = {
            f"keyword{i}": [
                {"date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(), "mentions": 50}
            ]
            for i in range(10)
        }

        trending = calc.get_top_trending_up(
            current_keywords=current_keywords,
            historical_data=historical_data,
            top_n=5
        )

        assert len(trending) == 5

    def test_sorting_by_velocity(self):
        """Test that results are sorted by velocity descending"""
        calc = VelocityCalculator(min_growth_percent=0, min_current_volume=1)

        current_keywords = {
            "fast growth": 200,
            "slow growth": 60,
            "medium growth": 100
        }

        historical_data = {
            "fast growth": [
                {"date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(), "mentions": 50}
            ],
            "slow growth": [
                {"date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(), "mentions": 50}
            ],
            "medium growth": [
                {"date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(), "mentions": 50}
            ]
        }

        trending = calc.find_trending_up_keywords(
            current_keywords=current_keywords,
            historical_data=historical_data
        )

        # Verify descending velocity order
        velocities = [kw["velocity"] for kw in trending]
        assert velocities == sorted(velocities, reverse=True)

    def test_calculate_previous_volume(self, mock_keyword_history):
        """Test calculating previous period volume from history"""
        calc = VelocityCalculator()

        # Filter history for specific keyword
        gpt5_history = [h for h in mock_keyword_history if h["keyword"] == "gpt-5"]

        previous_vol = calc._calculate_previous_volume(
            history=gpt5_history,
            timeframe_days=7
        )

        assert isinstance(previous_vol, int)
        assert previous_vol >= 0

    def test_detect_spike_normal(self):
        """Test spike detection with normal data"""
        calc = VelocityCalculator()

        history = [
            {"date": datetime.now(timezone.utc).isoformat(), "mentions": 50 + i}
            for i in range(10)
        ]

        is_spike, z_score = calc.detect_spike(
            current_volume=55,  # Normal variation
            history=history,
            spike_threshold=3.0
        )

        # Should not be a spike
        assert is_spike is False

    def test_detect_spike_anomalous(self):
        """Test spike detection with anomalous data"""
        calc = VelocityCalculator()

        history = [
            {"date": datetime.now(timezone.utc).isoformat(), "mentions": 50}
            for _ in range(10)
        ]

        is_spike, z_score = calc.detect_spike(
            current_volume=500,  # Huge spike
            history=history,
            spike_threshold=3.0
        )

        # Should detect as spike
        assert is_spike is True
        assert z_score > 3.0

    def test_detect_spike_insufficient_history(self):
        """Test spike detection with insufficient history"""
        calc = VelocityCalculator()

        history = [
            {"date": datetime.now(timezone.utc).isoformat(), "mentions": 50}
        ]  # Only 1 data point

        is_spike, z_score = calc.detect_spike(
            current_volume=100,
            history=history
        )

        # Should return False with insufficient data
        assert is_spike is False
        assert z_score == 0.0

    def test_detect_spike_zero_std_dev(self):
        """Test spike detection when all historical values are identical"""
        calc = VelocityCalculator()

        history = [
            {"date": datetime.now(timezone.utc).isoformat(), "mentions": 50}
            for _ in range(10)
        ]

        is_spike, z_score = calc.detect_spike(
            current_volume=150,  # 3x the normal
            history=history
        )

        # Should detect as spike based on 2x mean threshold
        assert is_spike is True

    def test_magnitude_weighting(self):
        """Test that velocity is weighted by magnitude"""
        calc = VelocityCalculator()

        # Same growth rate, different absolute volumes
        low_vol = calc.calculate_velocity(20, 10, 7)  # +10 over 7 days
        high_vol = calc.calculate_velocity(200, 100, 7)  # +100 over 7 days

        # Higher absolute change should have higher velocity due to magnitude weighting
        assert high_vol > low_vol

    def test_calculate_trending_up_convenience_function(self):
        """Test the convenience function"""
        current_keywords = {
            "trending keyword": 100
        }

        historical_data = {
            "trending keyword": [
                {"date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(), "mentions": 30}
            ]
        }

        trending = calculate_trending_up(
            current_keywords=current_keywords,
            historical_data=historical_data,
            timeframe_days=7,
            top_n=5,
            min_growth=50.0
        )

        assert isinstance(trending, list)
        assert len(trending) <= 5

    def test_empty_historical_data(self):
        """Test handling of empty historical data"""
        calc = VelocityCalculator()

        current_keywords = {"new topic": 20}
        historical_data = {}

        trending = calc.find_trending_up_keywords(
            current_keywords=current_keywords,
            historical_data=historical_data
        )

        # Should handle gracefully
        assert isinstance(trending, list)

    def test_timeframe_variations(self):
        """Test different timeframe periods (7, 14, 30 days)"""
        calc = VelocityCalculator(min_growth_percent=0, min_current_volume=1)

        current_keywords = {"keyword": 100}

        historical_data = {
            "keyword": [
                {"date": (datetime.now(timezone.utc) - timedelta(days=20 - i)).isoformat(), "mentions": 40 + i}
                for i in range(20)
            ]
        }

        # Test different timeframes
        for timeframe in [7, 14, 30]:
            trending = calc.find_trending_up_keywords(
                current_keywords=current_keywords,
                historical_data=historical_data,
                timeframe_days=timeframe
            )

            assert isinstance(trending, list)
