"""
Article Deduplication using MinHash + LSH (Locality-Sensitive Hashing)

Identifies duplicate and near-duplicate articles across different sources.
Typical deduplication rate: ~7% for news aggregation

Based on research showing MinHash + LSH is the industry standard approach
used in GPT-3 and Gopher training data cleanup.
"""

from datasketch import MinHash, MinHashLSH
import structlog
from typing import List, Dict, Set
import re

logger = structlog.get_logger()


class ArticleDeduplicator:
    """Deduplicate articles using MinHash + LSH"""

    def __init__(
        self,
        threshold: float = 0.5,
        num_perm: int = 128
    ):
        """
        Initialize deduplicator

        Args:
            threshold: Similarity threshold (0.0-1.0)
                      0.5 = 50% similar content
            num_perm: Number of permutations for MinHash
                     Higher = more accurate but slower
        """
        self.threshold = threshold
        self.num_perm = num_perm
        self.lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)

    def deduplicate_articles(
        self,
        articles: List[Dict]
    ) -> List[Dict]:
        """
        Remove duplicate articles from list

        Args:
            articles: List of article dictionaries

        Returns:
            List of unique articles (duplicates removed)
        """
        if not articles:
            return []

        unique_articles = []
        seen_urls = set()
        article_signatures = {}

        for idx, article in enumerate(articles):
            url = article.get("url", "")

            # Skip if we've seen this exact URL
            if url and url in seen_urls:
                logger.debug("duplicate_url", url=url)
                continue

            # Create MinHash signature for article content
            signature = self._create_minhash(article)
            article_id = f"article_{idx}"

            # Check if similar article already exists
            similar_articles = self.lsh.query(signature)

            if similar_articles:
                # Found similar article - this is a duplicate
                logger.debug(
                    "duplicate_content",
                    title=article.get("title", "")[:50],
                    similar_to=similar_articles[0]
                )
                continue

            # Not a duplicate - add to results
            self.lsh.insert(article_id, signature)
            article_signatures[article_id] = article

            if url:
                seen_urls.add(url)

            unique_articles.append(article)

        removed_count = len(articles) - len(unique_articles)
        dedup_rate = (removed_count / len(articles) * 100) if articles else 0

        logger.info(
            "deduplication_complete",
            original=len(articles),
            unique=len(unique_articles),
            removed=removed_count,
            dedup_rate=f"{dedup_rate:.1f}%"
        )

        return unique_articles

    def find_duplicates(
        self,
        articles: List[Dict]
    ) -> Dict[str, List[Dict]]:
        """
        Find all duplicate groups in articles

        Args:
            articles: List of articles

        Returns:
            Dict mapping article IDs to lists of duplicate articles
        """
        duplicates = {}
        article_signatures = {}

        for idx, article in enumerate(articles):
            article_id = f"article_{idx}"
            signature = self._create_minhash(article)

            # Check for similar articles
            similar = self.lsh.query(signature)

            if similar:
                # Found duplicates
                duplicates[article_id] = [
                    article_signatures[similar_id]
                    for similar_id in similar
                ]

            # Add to LSH index
            self.lsh.insert(article_id, signature)
            article_signatures[article_id] = article

        return duplicates

    def _create_minhash(self, article: Dict) -> MinHash:
        """
        Create MinHash signature for article

        Args:
            article: Article dictionary

        Returns:
            MinHash signature
        """
        # Extract title and text
        title = article.get("title", "")
        text = article.get("text", "")

        # Combine and clean content
        content = f"{title} {text}"
        content = self._clean_text(content)

        # Create shingles (3-grams of words)
        shingles = self._create_shingles(content, k=3)

        # Create MinHash
        m = MinHash(num_perm=self.num_perm)
        for shingle in shingles:
            m.update(shingle.encode('utf8'))

        return m

    @staticmethod
    def _create_shingles(text: str, k: int = 3) -> Set[str]:
        """
        Create k-shingles (k-grams) from text

        Args:
            text: Input text
            k: Shingle size (number of words)

        Returns:
            Set of shingles
        """
        words = text.lower().split()
        shingles = set()

        for i in range(len(words) - k + 1):
            shingle = " ".join(words[i:i + k])
            shingles.add(shingle)

        return shingles

    @staticmethod
    def _clean_text(text: str) -> str:
        """
        Clean text for deduplication

        Args:
            text: Raw text

        Returns:
            Cleaned text
        """
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Remove URLs
        text = re.sub(r'http[s]?://\S+', '', text)

        # Remove special characters, keep alphanumeric and spaces
        text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)

        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)

        return text.strip()

    def reset(self):
        """Reset the LSH index"""
        self.lsh = MinHashLSH(threshold=self.threshold, num_perm=self.num_perm)


# Convenience function
def deduplicate(
    articles: List[Dict],
    threshold: float = 0.5
) -> List[Dict]:
    """
    Deduplicate a list of articles

    Args:
        articles: List of article dictionaries
        threshold: Similarity threshold (0.0-1.0)

    Returns:
        List of unique articles
    """
    deduplicator = ArticleDeduplicator(threshold=threshold)
    return deduplicator.deduplicate_articles(articles)
