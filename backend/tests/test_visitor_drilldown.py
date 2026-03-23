"""Tests for visitor drill-down — daily breakdown for a specific repo.

Specs:
1. GET /api/repos/{owner}/{repo}/visitors returns daily visitor data
2. Sorted by date descending (most recent first)
3. Excludes zero-visitor days
4. Includes views, unique_visitors, clones, unique_cloners per day
5. Returns empty list for repos with no traffic
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import Database
from app.main import create_app


@pytest.fixture
async def db(tmp_path):
    database = Database(str(tmp_path / "test_drilldown.db"))
    await database.initialize()
    yield database
    await database.close()


@pytest.fixture
async def seeded_db(db):
    await db.upsert_daily_metrics(
        "owner/repo1", "2026-03-18", views=10, unique_visitors=5, clones=2, unique_cloners=1
    )
    await db.upsert_daily_metrics(
        "owner/repo1", "2026-03-19", views=0, unique_visitors=0, clones=0, unique_cloners=0
    )
    await db.upsert_daily_metrics(
        "owner/repo1", "2026-03-20", views=50, unique_visitors=20, clones=5, unique_cloners=3
    )
    await db.upsert_daily_metrics(
        "owner/repo1", "2026-03-21", views=80, unique_visitors=35, clones=10, unique_cloners=4
    )
    return db


@pytest.fixture
async def client(seeded_db):
    app = create_app(db=seeded_db)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestVisitorDrilldown:
    async def test_returns_daily_breakdown(self, client):
        """Returns daily visitor data for a repo."""
        resp = await client.get("/api/repos/owner/repo1/visitors")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        assert "date" in data[0]
        assert "unique_visitors" in data[0]
        assert "views" in data[0]
        assert "clones" in data[0]
        assert "unique_cloners" in data[0]

    async def test_sorted_date_descending(self, client):
        """Most recent day first."""
        resp = await client.get("/api/repos/owner/repo1/visitors")
        data = resp.json()
        dates = [d["date"] for d in data]
        assert dates == sorted(dates, reverse=True)

    async def test_excludes_zero_visitor_days(self, client):
        """Days with 0 visitors and 0 views are excluded."""
        resp = await client.get("/api/repos/owner/repo1/visitors")
        data = resp.json()
        for entry in data:
            assert entry["unique_visitors"] > 0 or entry["views"] > 0

    async def test_correct_values(self, client):
        """Data matches what was stored."""
        resp = await client.get("/api/repos/owner/repo1/visitors")
        data = resp.json()
        # Most recent first
        assert data[0]["date"] == "2026-03-21"
        assert data[0]["unique_visitors"] == 35
        assert data[0]["views"] == 80
        assert data[0]["clones"] == 10

    async def test_empty_repo(self, client):
        """Unknown repo returns empty list."""
        resp = await client.get("/api/repos/nobody/empty/visitors")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_three_active_days(self, client):
        """Only 3 of 4 days have traffic."""
        resp = await client.get("/api/repos/owner/repo1/visitors")
        data = resp.json()
        assert len(data) == 3  # Mar 18, 20, 21 — not 19
