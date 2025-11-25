"""
Feed Refresh Scheduler

Uses APScheduler to automatically trigger feed fetching at configurable intervals.
Supports:
- Configurable refresh interval (default: 30 minutes)
- Manual start/stop/pause
- Status monitoring
- Per-source scheduling (future enhancement)
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import structlog
import asyncio

logger = structlog.get_logger()

# Global scheduler instance
scheduler: AsyncIOScheduler | None = None

# Scheduler state tracking
scheduler_state = {
    "running": False,
    "paused": False,
    "interval_minutes": 30,
    "last_run": None,
    "next_run": None,
    "total_runs": 0,
    "last_error": None
}


def get_scheduler() -> AsyncIOScheduler:
    """Get or create the global scheduler instance"""
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler()
    return scheduler


async def scheduled_fetch_job():
    """
    The scheduled job that triggers feed fetching.
    This is called by APScheduler at the configured interval.
    """
    from app.api.routes import fetch_and_process_content
    import uuid

    job_id = f"scheduled-{uuid.uuid4().hex[:8]}"

    try:
        logger.info("scheduled_fetch_started", job_id=job_id)
        scheduler_state["last_run"] = datetime.now().isoformat()
        scheduler_state["total_runs"] += 1

        # Run the fetch job
        await fetch_and_process_content(job_id=job_id, sources=None)

        logger.info("scheduled_fetch_completed", job_id=job_id)
        scheduler_state["last_error"] = None

    except Exception as e:
        logger.error("scheduled_fetch_failed", job_id=job_id, error=str(e))
        scheduler_state["last_error"] = str(e)


def start_scheduler(interval_minutes: int = 30) -> dict:
    """
    Start the scheduler with the specified interval.

    Args:
        interval_minutes: Minutes between each fetch (default: 30)

    Returns:
        Status dict with scheduler info
    """
    global scheduler_state

    sched = get_scheduler()

    # Remove existing job if any
    if sched.get_job("feed_refresh"):
        sched.remove_job("feed_refresh")

    # Add the job with interval trigger
    sched.add_job(
        scheduled_fetch_job,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id="feed_refresh",
        name="Feed Refresh Job",
        replace_existing=True,
        max_instances=1,  # Prevent overlapping runs
        coalesce=True     # Combine missed runs
    )

    # Start scheduler if not running
    if not sched.running:
        sched.start()

    scheduler_state["running"] = True
    scheduler_state["paused"] = False
    scheduler_state["interval_minutes"] = interval_minutes

    # Get next run time
    job = sched.get_job("feed_refresh")
    if job and job.next_run_time:
        scheduler_state["next_run"] = job.next_run_time.isoformat()

    logger.info("scheduler_started", interval_minutes=interval_minutes)

    return get_scheduler_status()


def stop_scheduler() -> dict:
    """
    Stop the scheduler completely.

    Returns:
        Status dict with scheduler info
    """
    global scheduler_state

    sched = get_scheduler()

    if sched.running:
        sched.shutdown(wait=False)
        # Reset the global scheduler so a new one is created on next start
        global scheduler
        scheduler = None

    scheduler_state["running"] = False
    scheduler_state["paused"] = False
    scheduler_state["next_run"] = None

    logger.info("scheduler_stopped")

    return get_scheduler_status()


def pause_scheduler() -> dict:
    """
    Pause the scheduler (keeps it running but pauses the job).

    Returns:
        Status dict with scheduler info
    """
    global scheduler_state

    sched = get_scheduler()

    job = sched.get_job("feed_refresh")
    if job:
        job.pause()
        scheduler_state["paused"] = True
        scheduler_state["next_run"] = None
        logger.info("scheduler_paused")

    return get_scheduler_status()


def resume_scheduler() -> dict:
    """
    Resume a paused scheduler.

    Returns:
        Status dict with scheduler info
    """
    global scheduler_state

    sched = get_scheduler()

    job = sched.get_job("feed_refresh")
    if job:
        job.resume()
        scheduler_state["paused"] = False
        if job.next_run_time:
            scheduler_state["next_run"] = job.next_run_time.isoformat()
        logger.info("scheduler_resumed")

    return get_scheduler_status()


def update_interval(interval_minutes: int) -> dict:
    """
    Update the scheduler interval.

    Args:
        interval_minutes: New interval in minutes

    Returns:
        Status dict with scheduler info
    """
    if scheduler_state["running"] and not scheduler_state["paused"]:
        # Restart with new interval
        return start_scheduler(interval_minutes)

    # Just update the stored value for next start
    scheduler_state["interval_minutes"] = interval_minutes
    return get_scheduler_status()


def get_scheduler_status() -> dict:
    """
    Get current scheduler status.

    Returns:
        Dict with full scheduler status
    """
    sched = get_scheduler()

    job = sched.get_job("feed_refresh") if sched.running else None

    return {
        "running": scheduler_state["running"],
        "paused": scheduler_state["paused"],
        "interval_minutes": scheduler_state["interval_minutes"],
        "last_run": scheduler_state["last_run"],
        "next_run": job.next_run_time.isoformat() if job and job.next_run_time else scheduler_state["next_run"],
        "total_runs": scheduler_state["total_runs"],
        "last_error": scheduler_state["last_error"],
        "job_exists": job is not None
    }


async def trigger_immediate_fetch() -> dict:
    """
    Trigger an immediate fetch without waiting for the schedule.

    Returns:
        Dict with job info
    """
    import uuid
    job_id = f"immediate-{uuid.uuid4().hex[:8]}"

    # Run in background
    asyncio.create_task(scheduled_fetch_job())

    return {
        "message": "Immediate fetch triggered",
        "job_id": job_id
    }
