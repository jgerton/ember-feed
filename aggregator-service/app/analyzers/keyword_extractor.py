"""
Keyword Extraction using RAKE (Rapid Automatic Keyword Extraction)

RAKE is fast and provides good accuracy for identifying key phrases in text.
Performance: ~160ms for 500 abstracts (fastest among common algorithms)

Outputs phrases rather than single words, which is better for trending topics.
"""

from rake_nltk import Rake
import structlog
from typing import List, Dict, Set
from collections import Counter
import re

logger = structlog.get_logger()


class KeywordExtractor:
    """Extract keywords and phrases from article content"""

    def __init__(
        self,
        min_length: int = 3,
        max_words: int = 3,
        max_keywords: int = 10
    ):
        """
        Initialize RAKE keyword extractor

        Args:
            min_length: Minimum keyword length (characters)
            max_words: Maximum words in a phrase
            max_keywords: Maximum keywords to extract per article
        """
        self.min_length = min_length
        self.max_words = max_words
        self.max_keywords = max_keywords

        # Initialize RAKE
        self.rake = Rake(
            min_length=min_length,
            max_length=max_words
        )

    def extract_from_article(self, article: Dict) -> List[str]:
        """
        Extract keywords from a single article

        Args:
            article: Article dictionary with title and text

        Returns:
            List of keyword phrases
        """
        # Combine title and text for better keyword extraction
        title = article.get("title", "")
        text = article.get("text", "")

        # Title is more important, so we include it twice
        content = f"{title} {title} {text}"

        # Clean content
        content = self._clean_text(content)

        if not content:
            return []

        try:
            # Extract keywords
            self.rake.extract_keywords_from_text(content)
            keywords = self.rake.get_ranked_phrases()[:self.max_keywords]

            # Filter and clean keywords
            keywords = [
                self._normalize_keyword(kw)
                for kw in keywords
                if len(kw) >= self.min_length
            ]

            # Remove duplicates while preserving order
            seen = set()
            unique_keywords = []
            for kw in keywords:
                kw_lower = kw.lower()
                if kw_lower not in seen:
                    seen.add(kw_lower)
                    unique_keywords.append(kw)

            return unique_keywords[:self.max_keywords]

        except Exception as e:
            logger.warning("keyword_extraction_failed", error=str(e))
            return []

    def extract_from_articles(
        self,
        articles: List[Dict],
        min_frequency: int = 2
    ) -> Dict[str, int]:
        """
        Extract keywords from multiple articles and count frequencies

        Args:
            articles: List of article dictionaries
            min_frequency: Minimum frequency to include keyword

        Returns:
            Dictionary of {keyword: frequency}
        """
        all_keywords = []

        for article in articles:
            keywords = self.extract_from_article(article)
            all_keywords.extend(keywords)

        # Count keyword frequencies
        keyword_counts = Counter(
            kw.lower() for kw in all_keywords
        )

        # Filter by minimum frequency
        filtered_keywords = {
            kw: count
            for kw, count in keyword_counts.items()
            if count >= min_frequency
        }

        logger.info(
            "extracted_keywords",
            total_keywords=len(filtered_keywords),
            total_articles=len(articles)
        )

        return filtered_keywords

    def get_top_keywords(
        self,
        articles: List[Dict],
        top_n: int = 20,
        min_frequency: int = 2
    ) -> List[Dict[str, any]]:
        """
        Get top N keywords from articles with metadata

        Args:
            articles: List of articles
            top_n: Number of top keywords to return
            min_frequency: Minimum frequency threshold

        Returns:
            List of dicts with keyword, frequency, and sample articles
        """
        keyword_freq = self.extract_from_articles(articles, min_frequency)

        # Sort by frequency
        sorted_keywords = sorted(
            keyword_freq.items(),
            key=lambda x: x[1],
            reverse=True
        )[:top_n]

        # Build result with metadata
        results = []
        for keyword, frequency in sorted_keywords:
            # Find articles mentioning this keyword
            sample_articles = self._find_articles_with_keyword(
                articles,
                keyword,
                limit=3
            )

            results.append({
                "keyword": keyword,
                "frequency": frequency,
                "sample_articles": sample_articles
            })

        return results

    def _find_articles_with_keyword(
        self,
        articles: List[Dict],
        keyword: str,
        limit: int = 3
    ) -> List[Dict]:
        """
        Find articles that mention a specific keyword

        Args:
            articles: List of articles
            keyword: Keyword to search for
            limit: Maximum articles to return

        Returns:
            List of article metadata (title, url, source)
        """
        matching_articles = []
        keyword_lower = keyword.lower()

        for article in articles:
            title = article.get("title", "").lower()
            text = article.get("text", "").lower()

            if keyword_lower in title or keyword_lower in text:
                matching_articles.append({
                    "title": article.get("title", ""),
                    "url": article.get("url", ""),
                    "source": article.get("source", "")
                })

                if len(matching_articles) >= limit:
                    break

        return matching_articles

    @staticmethod
    def _clean_text(text: str) -> str:
        """
        Clean text for keyword extraction

        Args:
            text: Raw text

        Returns:
            Cleaned text
        """
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Remove URLs
        text = re.sub(r'http[s]?://\S+', '', text)

        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)

        return text.strip()

    @staticmethod
    def _normalize_keyword(keyword: str) -> str:
        """
        Normalize keyword (proper casing, remove extra spaces)

        Args:
            keyword: Raw keyword

        Returns:
            Normalized keyword
        """
        # Title case for better readability
        # But preserve all-caps acronyms like AI, ML, API
        words = keyword.split()
        normalized = []

        for word in words:
            if word.isupper() and len(word) <= 5:
                # Likely acronym, keep uppercase
                normalized.append(word)
            else:
                # Title case
                normalized.append(word.capitalize())

        return " ".join(normalized)


# Convenience function
def extract_trending_keywords(
    articles: List[Dict],
    top_n: int = 20,
    min_frequency: int = 3
) -> List[Dict]:
    """
    Extract trending keywords from articles

    Args:
        articles: List of article dictionaries
        top_n: Number of top keywords to return
        min_frequency: Minimum mentions required

    Returns:
        List of trending keywords with metadata
    """
    extractor = KeywordExtractor(
        min_length=3,
        max_words=3,
        max_keywords=10
    )

    return extractor.get_top_keywords(
        articles=articles,
        top_n=top_n,
        min_frequency=min_frequency
    )
