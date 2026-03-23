"""Tests for the unique visitors endpoint and aggregation.

Specs covered:
1. GET /api/visitors returns daily unique visitor breakdown across all repos
2. Response includes repo_name, date, unique_visitors, views
3. Sorted by date descending (most recent first)
4. Can filter by repo
5. Only includes days with actual visitors (>0)
6. GET /api/visitors/summary returns aggregate stats per repo
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import Database
from app.main import create_app


@pytest.fixture
async def db(tmp_path):
    database = Database(str(tmp_path / "test_visitors.db"))
    await database.initialize()
    yield database
    await database.close()


@pytest.fixture
async def seeded_db(db):
    """DB with visitor data across multiple repos."""
    await db.upsert_daily_metrics(
        "owner/repo1", "2026-03-20", views=50, unique_visitors=20, clones=5, unique_cloners=2
    )
    await db.upsert_daily_metrics(
        "owner/repo1", "2026-03-21", views=80, unique_visitors=35, clones=10, unique_cloners=4
    )
    await db.upsert_daily_metrics(
        "owner/repo1", "2026-03-22", views=0, unique_visitors=0, clones=0, unique_cloners=0
    )
    await db.upsert_daily_metrics(
        "owner/repo2", "2026-03-20", views=30, unique_visitors=15, clones=3, unique_cloners=1
    )
    await db.upsert_daily_metrics(
        "owner/repo2", "2026-03-21", views=0, unique_visitors=0, clones=0, unique_cloners=0
    )
    return db


@pytest.fixture
async def client(seeded_db):
    app = create_app(db=seeded_db)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestVisitorsEndpoint:
    async def test_returns_daily_visitors(self, client):
        """GET /api/visitors returns daily breakdown."""
        resp = await client.get("/api/visitors")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        # Each entry has required fields
        entry = data[0]
        assert "repo_name" in entry
        assert "date" in entry
        assert "unique_visitors" in entry
        assert "views" in entry

    async def test_sorted_by_date_descending(self, client):
        """Results are sorted most recent first."""
        resp = await client.get("/api/visitors")
        data = resp.json()
        dates = [d["date"] for d in data]
        assert dates == sorted(dates, reverse=True)

    async def test_excludes_zero_visitor_days(self, client):
        """Days with 0 unique visitors are excluded."""
        resp = await client.get("/api/visitors")
        data = resp.json()
        for entry in data:
            assert entry["unique_visitors"] > 0

    async def test_filter_by_repo(self, client):
        """Can filter visitors to a specific repo."""
        resp = await client.get("/api/visitors?repo=owner/repo1")
        assert resp.status_code == 200
        data = resp.json()
        assert all(d["repo_name"] == "owner/repo1" for d in data)
        assert len(data) == 2  # Only 2 days with visitors for repo1

    async def test_includes_all_repos_by_default(self, client):
        """Without filter, includes visitors from all repos."""
        resp = await client.get("/api/visitors")
        data = resp.json()
        repos = {d["repo_name"] for d in data}
        assert "owner/repo1" in repos
        assert "owner/repo2" in repos


class TestVisitorsSummaryEndpoint:
    async def test_returns_per_repo_summary(self, client):
        """GET /api/visitors/summary returns aggregate per repo."""
        resp = await client.get("/api/visitors/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2

        # Find repo1 summary
        repo1 = next(d for d in data if d["repo_name"] == "owner/repo1")
        assert repo1["total_unique_visitors"] == 55  # 20 + 35
        assert repo1["total_views"] == 130  # 50 + 80
        assert repo1["days_with_traffic"] == 2

    async def test_summary_sorted_by_visitors_descending(self, client):
        """Summary sorted by total unique visitors, highest first."""
        resp = await client.get("/api/visitors/summary")
        data = resp.json()
        visitors = [d["total_unique_visitors"] for d in data]
        assert visitors == sorted(visitors, reverse=True)
