"""Collect live GitHub traffic data for all repos."""

import asyncio
import logging

from app.collector import GitHubCollector
from app.config import CollectorConfig
from app.database import Database

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def main() -> None:
    config = CollectorConfig()
    logger.info("Collecting traffic data for %d repos", len(config.repos))

    db = Database(config.db_path)
    await db.initialize()

    collector = GitHubCollector(
        token=config.token,
        db=db,
        repos=config.repos,
    )

    await collector.collect_all()

    repos_with_data = await db.list_repos()
    logger.info(
        "Collection complete. Rate limit remaining: %s. Repos with data: %d",
        collector.rate_limit_remaining,
        len(repos_with_data),
    )
    for repo in repos_with_data:
        metrics = await db.get_daily_metrics(repo, "2000-01-01", "2099-12-31")
        logger.info("  %s: %d days of traffic data", repo, len(metrics))

    await collector.close()
    await db.close()


if __name__ == "__main__":
    asyncio.run(main())
