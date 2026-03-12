import logging
from datetime import datetime

import feedparser
from sqlalchemy.orm import Session

from backend import models

logger = logging.getLogger("f1-dashboard.news")

RSS_FEEDS = {
    "Formula1.com": "https://www.formula1.com/en/latest/all.xml",
    "Autosport": "https://www.autosport.com/rss/f1/news",
    "Motorsport.com": "https://www.motorsport.com/rss/f1/news/",
}


class NewsFetcher:
    def __init__(self, session_factory):
        self.session_factory = session_factory

    def register_jobs(self, scheduler):
        scheduler.add_job(
            self.fetch_all_feeds,
            "interval",
            minutes=15,
            id="news_fetch",
            replace_existing=True,
        )
        # Also run once on startup (delay to avoid misfire)
        from datetime import timedelta
        scheduler.add_job(
            self.fetch_all_feeds,
            "date",
            run_date=datetime.now() + timedelta(seconds=8),
            id="news_fetch_startup",
            replace_existing=True,
            misfire_grace_time=30,
        )

    async def fetch_all_feeds(self):
        logger.info("Fetching news feeds...")
        db = self.session_factory()
        total_new = 0
        try:
            for source, url in RSS_FEEDS.items():
                try:
                    articles = self._parse_feed(url, source)
                    for article in articles:
                        existing = (
                            db.query(models.NewsArticle)
                            .filter(models.NewsArticle.url == article["url"])
                            .first()
                        )
                        if not existing:
                            na = models.NewsArticle(
                                title=article["title"],
                                url=article["url"],
                                summary=article.get("summary", ""),
                                source=source,
                                image_url=article.get("image_url", ""),
                                published=article.get("published"),
                                category=article.get("category", ""),
                            )
                            db.add(na)
                            total_new += 1
                except Exception as e:
                    logger.warning(f"Error fetching {source}: {e}")
            db.commit()
            logger.info(f"News fetch complete. {total_new} new articles.")
        except Exception as e:
            db.rollback()
            logger.error(f"Error in news fetch: {e}")
        finally:
            db.close()

    def _parse_feed(self, url: str, source: str) -> list[dict]:
        feed = feedparser.parse(url)
        articles = []
        for entry in feed.entries[:30]:
            published = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    published = datetime(*entry.published_parsed[:6])
                except Exception:
                    pass

            image_url = ""
            if hasattr(entry, "media_content") and entry.media_content:
                image_url = entry.media_content[0].get("url", "")
            elif hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
                image_url = entry.media_thumbnail[0].get("url", "")

            category = ""
            if hasattr(entry, "tags") and entry.tags:
                category = entry.tags[0].get("term", "")

            articles.append({
                "title": entry.get("title", ""),
                "url": entry.get("link", ""),
                "summary": entry.get("summary", "")[:500],
                "image_url": image_url,
                "published": published,
                "category": category,
            })
        return articles
