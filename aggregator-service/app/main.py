"""
Trending Topics Aggregator Service

Fetches content from multiple sources (RSS, Reddit, Hacker News, etc.)
and detects trending topics using keyword extraction and velocity analysis.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

# Import API routes and scheduler
from app.api import routes
from app import scheduler as feed_scheduler

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# Create FastAPI app
app = FastAPI(
    title="Trending Topics Aggregator",
    description="Multi-source news aggregator with trending topic detection",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(routes.router)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "trending-topics-aggregator",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    scheduler_status = feed_scheduler.get_scheduler_status()

    return {
        "status": "healthy",
        "services": {
            "api": "ok",
            "database": "pending",  # TODO: Add DB health check
            "redis": "pending",     # TODO: Add Redis health check
            "scheduler": "running" if scheduler_status["running"] else "stopped"
        },
        "scheduler": {
            "running": scheduler_status["running"],
            "paused": scheduler_status["paused"],
            "interval_minutes": scheduler_status["interval_minutes"],
            "next_run": scheduler_status["next_run"],
            "total_runs": scheduler_status["total_runs"]
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
