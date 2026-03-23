"""Tests for live GitHub data collection using real token.

Specs covered:
1. Config loads repos and token from environment
2. Live collector can fetch traffic for a real repo
3. Live collector stores data in the database
4. collect_live script processes all configured repos
5. Database contains real data after collection
6. Graceful handling when traffic data is empty (new/inactive repos)
"""


import pytest

from app.collector import GitHubCollector
from app.config import CollectorConfig
from app.database import Database

# --- Spec 1: Config loads from environment ---


class TestConfig:
    def test_config_loads_token(self):
        """Config reads GH_TOKEN from environment."""
        config = CollectorConfig()
        assert config.token, "GH_TOKEN must be set in environment"

    def test_config_loads_repos(self):
        """Config includes at least one repo to track."""
        config = CollectorConfig()
        assert len(config.repos) > 0, "Must have at least one repo configured"

    def test_config_repos_format(self):
        """All repos are in owner/name format."""
        config = CollectorConfig()
        for repo in config.repos:
            parts = repo.split("/")
            assert len(parts) == 2, f"Repo '{repo}' not in owner/name format"
            assert parts[0], f"Repo '{repo}' has empty owner"
            assert parts[1], f"Repo '{repo}' has empty name"

    def test_config_db_path(self):
        """Config has a database path."""
        config = CollectorConfig()
        assert config.db_path, "Must have a db_path configured"


# --- Spec 2: Live collector fetches real traffic ---


class TestLiveTrafficFetch:
    @pytest.fixture
    async def live_setup(self, tmp_path):
        config = CollectorConfig()
        db = Database(str(tmp_path / "live_test.db"))
        await db.initialize()
        collector = GitHubCollector(
            token=config.token,
            db=db,
            repos=config.repos[:1],  # Just first repo
        )
        yield config, db, collector
        await collector.close()
        await db.close()

    async def test_fetch_views_from_github(self, live_setup):
        """Collector successfully calls GitHub traffic/views API."""
        config, db, collector = live_setup
        repo = config.repos[0]

        # Should not raise — even if views are 0
        await collector.collect_views(repo)

    async def test_fetch_clones_from_github(self, live_setup):
        """Collector successfully calls GitHub traffic/clones API."""
        config, db, collector = live_setup
        repo = config.repos[0]
        await collector.collect_clones(repo)

    async def test_fetch_referrers_from_github(self, live_setup):
        """Collector successfully calls GitHub traffic/referrers API."""
        config, db, collector = live_setup
        repo = config.repos[0]
        await collector.collect_referrers(repo)

    async def test_fetch_paths_from_github(self, live_setup):
        """Collector successfully calls GitHub traffic/paths API."""
        config, db, collector = live_setup
        repo = config.repos[0]
        await collector.collect_paths(repo)


# --- Spec 3: Data actually stored ---


class TestLiveDataStorage:
    async def test_views_stored_after_collection(self, tmp_path):
        """After collecting views, database has rows (if any traffic exists)."""
        config = CollectorConfig()
        db = Database(str(tmp_path / "storage_test.db"))
        await db.initialize()
        collector = GitHubCollector(
            token=config.token,
            db=db,
            repos=config.repos[:1],
        )

        repo = config.repos[0]
        await collector.collect_views(repo)

        # Raw response should always be stored
        raw = await db.get_raw_responses(repo, "traffic/views")
        assert len(raw) >= 1, "Raw response should be stored even if no views"

        await collector.close()
        await db.close()


# --- Spec 4: Full collection across multiple repos ---


class TestFullCollection:
    async def test_collect_all_repos(self, tmp_path):
        """collect_all processes multiple repos without crashing."""
        config = CollectorConfig()
        # Test with up to 3 repos to keep it fast
        test_repos = config.repos[:3]
        db = Database(str(tmp_path / "full_test.db"))
        await db.initialize()
        collector = GitHubCollector(
            token=config.token,
            db=db,
            repos=test_repos,
        )

        await collector.collect_all()

        # Rate limit should still be healthy
        assert collector.rate_limit_remaining is None or collector.rate_limit_remaining > 100

        await collector.close()
        await db.close()


# --- Spec 5: Production DB has data after collection ---


class TestProductionCollection:
    async def test_production_db_populated(self, tmp_path):
        """After running against real repos, repos appear in the DB."""
        config = CollectorConfig()
        db = Database(str(tmp_path / "prod_test.db"))
        await db.initialize()
        collector = GitHubCollector(
            token=config.token,
            db=db,
            repos=config.repos[:2],
        )

        await collector.collect_all()

        # At least some repos should have data (views/clones may be 0 for inactive repos)
        # But raw responses should always be stored
        for repo in config.repos[:2]:
            raw = await db.get_raw_responses(repo, "traffic/views")
            assert len(raw) >= 1, f"Should have raw response for {repo}"

        await collector.close()
        await db.close()
