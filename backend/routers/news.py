from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("")
def get_news(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    source: str = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(models.NewsArticle).order_by(models.NewsArticle.published.desc())
    if source:
        query = query.filter(models.NewsArticle.source == source)

    total = query.count()
    articles = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "articles": [
            {
                "id": a.id,
                "title": a.title,
                "url": a.url,
                "summary": a.summary,
                "source": a.source,
                "image_url": a.image_url,
                "published": a.published.isoformat() if a.published else None,
                "category": a.category,
            }
            for a in articles
        ],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }
