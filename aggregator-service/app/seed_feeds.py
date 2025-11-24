"""
Seed database with curated feed sources

This script populates the database with high-quality feeds across:
- Technology news and blogs
- Developer newsletters (Substack)
- Programming platforms
- Business and startup news
- Science and research
- Design and UX
"""

import asyncio
import sqlite3
from datetime import datetime
from typing import List, Dict
import secrets

# Database path
DB_PATH = "../../prisma/data/dashboard.db"

def generate_cuid():
    """Generate a simple unique ID (simplified cuid)"""
    return f"cl{secrets.token_hex(12)}"

# Curated feed sources organized by category
FEED_SOURCES = [
    # === TECH NEWS (Major Publications) ===
    {
        "name": "TechCrunch",
        "url": "https://techcrunch.com/feed/",
        "type": "rss",
        "category": "tech",
        "update_frequency": 30
    },
    {
        "name": "The Verge",
        "url": "https://www.theverge.com/rss/index.xml",
        "type": "rss",
        "category": "tech",
        "update_frequency": 30
    },
    {
        "name": "Ars Technica",
        "url": "https://feeds.arstechnica.com/arstechnica/index",
        "type": "rss",
        "category": "tech",
        "update_frequency": 60
    },
    {
        "name": "Wired",
        "url": "https://www.wired.com/feed/rss",
        "type": "rss",
        "category": "tech",
        "update_frequency": 60
    },
    {
        "name": "MIT Technology Review",
        "url": "https://www.technologyreview.com/feed/",
        "type": "rss",
        "category": "tech",
        "update_frequency": 120
    },
    {
        "name": "Engadget",
        "url": "https://www.engadget.com/rss.xml",
        "type": "rss",
        "category": "tech",
        "update_frequency": 60
    },
    {
        "name": "VentureBeat",
        "url": "https://venturebeat.com/feed/",
        "type": "rss",
        "category": "tech",
        "update_frequency": 60
    },
    {
        "name": "The Next Web",
        "url": "https://thenextweb.com/feed/",
        "type": "rss",
        "category": "tech",
        "update_frequency": 60
    },

    # === DEVELOPER PLATFORMS ===
    {
        "name": "Hacker News",
        "url": "https://hacker-news.firebaseio.com/v0",
        "type": "hackernews",
        "category": "developer",
        "update_frequency": 30
    },
    {
        "name": "Dev.to",
        "url": "https://dev.to/feed",
        "type": "rss",
        "category": "developer",
        "update_frequency": 60
    },
    {
        "name": "Hashnode",
        "url": "https://hashnode.com/rss",
        "type": "rss",
        "category": "developer",
        "update_frequency": 60
    },
    {
        "name": "InfoQ",
        "url": "https://www.infoq.com/feed",
        "type": "rss",
        "category": "developer",
        "update_frequency": 120
    },

    # === REDDIT (Tech Subreddits) ===
    {
        "name": "r/technology",
        "url": "https://www.reddit.com/r/technology.json",
        "type": "reddit",
        "category": "tech",
        "update_frequency": 60
    },
    {
        "name": "r/programming",
        "url": "https://www.reddit.com/r/programming.json",
        "type": "reddit",
        "category": "developer",
        "update_frequency": 60
    },
    {
        "name": "r/webdev",
        "url": "https://www.reddit.com/r/webdev.json",
        "type": "reddit",
        "category": "developer",
        "update_frequency": 60
    },
    {
        "name": "r/machinelearning",
        "url": "https://www.reddit.com/r/machinelearning.json",
        "type": "reddit",
        "category": "science",
        "update_frequency": 120
    },
    {
        "name": "r/datascience",
        "url": "https://www.reddit.com/r/datascience.json",
        "type": "reddit",
        "category": "science",
        "update_frequency": 120
    },
    {
        "name": "r/artificial",
        "url": "https://www.reddit.com/r/artificial.json",
        "type": "reddit",
        "category": "science",
        "update_frequency": 120
    },
    {
        "name": "r/startups",
        "url": "https://www.reddit.com/r/startups.json",
        "type": "reddit",
        "category": "business",
        "update_frequency": 120
    },

    # === GOOGLE NEWS (Topics) ===
    {
        "name": "Google News - Technology",
        "url": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB",
        "type": "rss",
        "category": "tech",
        "update_frequency": 60
    },
    {
        "name": "Google News - Business",
        "url": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB",
        "type": "rss",
        "category": "business",
        "update_frequency": 60
    },
    {
        "name": "Google News - Science",
        "url": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFpxYW5RU0FtVnVHZ0pWVXlnQVAB",
        "type": "rss",
        "category": "science",
        "update_frequency": 120
    },

    # === SUBSTACK NEWSLETTERS (Developer-Focused) ===
    {
        "name": "ByteByteGo",
        "url": "https://blog.bytebytego.com/feed",
        "type": "substack",
        "category": "developer",
        "update_frequency": 1440  # Daily
    },
    {
        "name": "The Pragmatic Engineer",
        "url": "https://newsletter.pragmaticengineer.com/feed",
        "type": "substack",
        "category": "developer",
        "update_frequency": 1440
    },
    {
        "name": "Lenny's Newsletter",
        "url": "https://www.lennysnewsletter.com/feed",
        "type": "substack",
        "category": "business",
        "update_frequency": 1440
    },
    {
        "name": "Stratechery",
        "url": "https://stratechery.com/feed/",
        "type": "substack",
        "category": "business",
        "update_frequency": 1440
    },
    {
        "name": "Not Boring",
        "url": "https://www.notboring.co/feed",
        "type": "substack",
        "category": "business",
        "update_frequency": 1440
    },
    {
        "name": "platformer",
        "url": "https://www.platformer.news/feed",
        "type": "substack",
        "category": "tech",
        "update_frequency": 1440
    },

    # === MEDIUM PUBLICATIONS ===
    {
        "name": "Better Programming",
        "url": "https://betterprogramming.pub/feed",
        "type": "medium",
        "category": "developer",
        "update_frequency": 120
    },
    {
        "name": "The Startup",
        "url": "https://medium.com/feed/swlh",
        "type": "medium",
        "category": "business",
        "update_frequency": 120
    },
    {
        "name": "Towards Data Science",
        "url": "https://towardsdatascience.com/feed",
        "type": "medium",
        "category": "science",
        "update_frequency": 120
    },
    {
        "name": "JavaScript in Plain English",
        "url": "https://javascript.plainenglish.io/feed",
        "type": "medium",
        "category": "developer",
        "update_frequency": 120
    },
    {
        "name": "Level Up Coding",
        "url": "https://levelup.gitconnected.com/feed",
        "type": "medium",
        "category": "developer",
        "update_frequency": 120
    },
    {
        "name": "UX Collective",
        "url": "https://uxdesign.cc/feed",
        "type": "medium",
        "category": "design",
        "update_frequency": 120
    },
    {
        "name": "Bootcamp",
        "url": "https://bootcamp.uxdesign.cc/feed",
        "type": "medium",
        "category": "design",
        "update_frequency": 120
    },

    # === INDIVIDUAL TECH BLOGS ===
    {
        "name": "Dan Abramov (overreacted.io)",
        "url": "https://overreacted.io/rss.xml",
        "type": "rss",
        "category": "developer",
        "update_frequency": 1440
    },
    {
        "name": "Kent C. Dodds",
        "url": "https://kentcdodds.com/blog/rss.xml",
        "type": "rss",
        "category": "developer",
        "update_frequency": 1440
    },
    {
        "name": "Martin Fowler",
        "url": "https://martinfowler.com/feed.atom",
        "type": "rss",
        "category": "developer",
        "update_frequency": 1440
    },
    {
        "name": "Joel on Software",
        "url": "https://www.joelonsoftware.com/feed/",
        "type": "rss",
        "category": "developer",
        "update_frequency": 1440
    },
    {
        "name": "CSS-Tricks",
        "url": "https://css-tricks.com/feed/",
        "type": "rss",
        "category": "developer",
        "update_frequency": 120
    },
    {
        "name": "Smashing Magazine",
        "url": "https://www.smashingmagazine.com/feed/",
        "type": "rss",
        "category": "developer",
        "update_frequency": 120
    },

    # === PROGRAMMING LANGUAGES ===
    {
        "name": "The Rust Blog",
        "url": "https://blog.rust-lang.org/feed.xml",
        "type": "rss",
        "category": "developer",
        "update_frequency": 1440
    },
    {
        "name": "Go Blog",
        "url": "https://go.dev/blog/feed.atom",
        "type": "rss",
        "category": "developer",
        "update_frequency": 1440
    },
    {
        "name": "Python Insider",
        "url": "https://blog.python.org/feeds/posts/default",
        "type": "rss",
        "category": "developer",
        "update_frequency": 1440
    },
    {
        "name": "Node.js Blog",
        "url": "https://nodejs.org/en/feed/blog.xml",
        "type": "rss",
        "category": "developer",
        "update_frequency": 1440
    },

    # === AI/ML FOCUSED ===
    {
        "name": "OpenAI Blog",
        "url": "https://openai.com/blog/rss/",
        "type": "rss",
        "category": "science",
        "update_frequency": 1440
    },
    {
        "name": "DeepMind Blog",
        "url": "https://deepmind.google/blog/rss.xml",
        "type": "rss",
        "category": "science",
        "update_frequency": 1440
    },
    {
        "name": "Anthropic News",
        "url": "https://www.anthropic.com/news/rss",
        "type": "rss",
        "category": "science",
        "update_frequency": 1440
    },
    {
        "name": "AI News (Google)",
        "url": "https://ai.googleblog.com/feeds/posts/default",
        "type": "rss",
        "category": "science",
        "update_frequency": 1440
    },

    # === CLOUD & DEVOPS ===
    {
        "name": "AWS News Blog",
        "url": "https://aws.amazon.com/blogs/aws/feed/",
        "type": "rss",
        "category": "developer",
        "update_frequency": 120
    },
    {
        "name": "Google Cloud Blog",
        "url": "https://cloud.google.com/blog/rss",
        "type": "rss",
        "category": "developer",
        "update_frequency": 120
    },
    {
        "name": "Azure Blog",
        "url": "https://azure.microsoft.com/en-us/blog/feed/",
        "type": "rss",
        "category": "developer",
        "update_frequency": 120
    },
    {
        "name": "Docker Blog",
        "url": "https://www.docker.com/blog/feed/",
        "type": "rss",
        "category": "developer",
        "update_frequency": 1440
    },
    {
        "name": "Kubernetes Blog",
        "url": "https://kubernetes.io/feed.xml",
        "type": "rss",
        "category": "developer",
        "update_frequency": 1440
    },

    # === SECURITY ===
    {
        "name": "Krebs on Security",
        "url": "https://krebsonsecurity.com/feed/",
        "type": "rss",
        "category": "tech",
        "update_frequency": 1440
    },
    {
        "name": "The Hacker News",
        "url": "https://feeds.feedburner.com/TheHackersNews",
        "type": "rss",
        "category": "tech",
        "update_frequency": 120
    },
    {
        "name": "BleepingComputer",
        "url": "https://www.bleepingcomputer.com/feed/",
        "type": "rss",
        "category": "tech",
        "update_frequency": 120
    },

    # === BUSINESS & STARTUPS ===
    {
        "name": "Y Combinator Blog",
        "url": "https://www.ycombinator.com/blog/feed",
        "type": "rss",
        "category": "business",
        "update_frequency": 1440
    },
    {
        "name": "First Round Review",
        "url": "https://review.firstround.com/feed",
        "type": "rss",
        "category": "business",
        "update_frequency": 1440
    },
    {
        "name": "a16z",
        "url": "https://a16z.com/feed/",
        "type": "rss",
        "category": "business",
        "update_frequency": 1440
    },
    {
        "name": "Product Hunt",
        "url": "https://www.producthunt.com/feed",
        "type": "rss",
        "category": "business",
        "update_frequency": 60
    },

    # === DESIGN ===
    {
        "name": "Nielsen Norman Group",
        "url": "https://www.nngroup.com/feed/rss/",
        "type": "rss",
        "category": "design",
        "update_frequency": 1440
    },
    {
        "name": "A List Apart",
        "url": "https://alistapart.com/main/feed/",
        "type": "rss",
        "category": "design",
        "update_frequency": 1440
    },
    {
        "name": "Sidebar",
        "url": "https://sidebar.io/feed",
        "type": "rss",
        "category": "design",
        "update_frequency": 1440
    },
]


async def seed_database():
    """Seed the database with curated feed sources"""

    print(f"Seeding database with {len(FEED_SOURCES)} feed sources...")

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='feed_sources'
    """)

    if not cursor.fetchone():
        print("Error: feed_sources table does not exist. Please run migrations first.")
        conn.close()
        return

    # Clear existing seeds (optional - comment out to keep existing)
    cursor.execute("DELETE FROM feed_sources")
    print("Cleared existing feed sources")

    # Insert feed sources
    inserted_count = 0
    skipped_count = 0

    for feed in FEED_SOURCES:
        try:
            cursor.execute("""
                INSERT INTO feed_sources (
                    id, name, url, type, category, updateFrequency,
                    enabled, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                generate_cuid(),  # Generate unique ID
                feed["name"],
                feed["url"],
                feed["type"],
                feed["category"],
                feed["update_frequency"],
                1,  # enabled = true
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            inserted_count += 1
        except sqlite3.IntegrityError as e:
            print(f"WARNING: Skipped duplicate: {feed['name']}")
            skipped_count += 1
        except Exception as e:
            print(f"ERROR inserting {feed['name']}: {e}")
            skipped_count += 1

    # Commit changes
    conn.commit()
    conn.close()

    # Print summary
    print(f"\nDatabase seeding complete!")
    print(f"   Inserted: {inserted_count} feeds")
    print(f"   Skipped: {skipped_count} feeds")
    print(f"\nCategory breakdown:")

    category_counts = {}
    for feed in FEED_SOURCES:
        category = feed["category"]
        category_counts[category] = category_counts.get(category, 0) + 1

    for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {category.capitalize()}: {count} feeds")


if __name__ == "__main__":
    asyncio.run(seed_database())
