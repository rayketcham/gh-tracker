"""Tests for people metrics — stargazers, watchers, forkers, contributors.

These are the metrics that show REAL PEOPLE, not anonymous counts.

Specs:
1. Collect stargazers with timestamps via GitHub API
2. Collect watchers (subscribers) list
3. Collect forkers with timestamps
4. Collect contributors with commit stats
5. Store all in DB with repo association
6. API endpoints return people data
7. Detect new stargazers/watchers since last collection
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import Database
from app.main import create_app


@pytest.fixture
async def db(tmp_path):
    database = Database(str(tmp_path / "test_people.db"))
    await database.initialize()
    yield database
    await database.close()


@pytest.fixture
async def seeded_db(db):
    """DB with people data."""
    await db.upsert_stargazer("owner/repo1", "alice", "2026-03-15T10:00:00Z")
    await db.upsert_stargazer("owner/repo1", "bob", "2026-03-18T14:30:00Z")
    await db.upsert_stargazer("owner/repo1", "charlie", "2026-03-20T09:00:00Z")

    await db.upsert_watcher("owner/repo1", "alice")
    await db.upsert_watcher("owner/repo1", "dave")

    await db.upsert_forker("owner/repo1", "eve", "eve/repo1", "2026-03-19T12:00:00Z")

    await db.upsert_contributor(
        "owner/repo1", "alice", commits=42, additions=1500, deletions=300
    )
    await db.upsert_contributor(
        "owner/repo1", "frank", commits=10, additions=500, deletions=100
    )
    return db


@pytest.fixture
async def client(seeded_db):
    app = create_app(db=seeded_db)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestStargazersDB:
    async def test_upsert_and_retrieve(self, db):
        await db.upsert_stargazer("o/r", "user1", "2026-01-01T00:00:00Z")
        stars = await db.get_stargazers("o/r")
        assert len(stars) == 1
        assert stars[0]["username"] == "user1"
        assert stars[0]["starred_at"] == "2026-01-01T00:00:00Z"

    async def test_upsert_idempotent(self, db):
        await db.upsert_stargazer("o/r", "user1", "2026-01-01T00:00:00Z")
        await db.upsert_stargazer("o/r", "user1", "2026-01-01T00:00:00Z")
        stars = await db.get_stargazers("o/r")
        assert len(stars) == 1

    async def test_sorted_by_date_desc(self, seeded_db):
        stars = await seeded_db.get_stargazers("owner/repo1")
        assert len(stars) == 3
        assert stars[0]["username"] == "charlie"  # Most recent
        assert stars[2]["username"] == "alice"  # Oldest


class TestWatchersDB:
    async def test_upsert_and_retrieve(self, db):
        await db.upsert_watcher("o/r", "user1")
        watchers = await db.get_watchers("o/r")
        assert len(watchers) == 1
        assert watchers[0]["username"] == "user1"

    async def test_idempotent(self, db):
        await db.upsert_watcher("o/r", "user1")
        await db.upsert_watcher("o/r", "user1")
        assert len(await db.get_watchers("o/r")) == 1


class TestForkersDB:
    async def test_upsert_and_retrieve(self, db):
        await db.upsert_forker("o/r", "user1", "user1/r", "2026-01-01T00:00:00Z")
        forks = await db.get_forkers("o/r")
        assert len(forks) == 1
        assert forks[0]["username"] == "user1"
        assert forks[0]["fork_repo"] == "user1/r"


class TestContributorsDB:
    async def test_upsert_and_retrieve(self, db):
        await db.upsert_contributor("o/r", "user1", commits=5, additions=100, deletions=20)
        contribs = await db.get_contributors("o/r")
        assert len(contribs) == 1
        assert contribs[0]["commits"] == 5

    async def test_sorted_by_commits_desc(self, seeded_db):
        contribs = await seeded_db.get_contributors("owner/repo1")
        assert contribs[0]["username"] == "alice"  # 42 commits
        assert contribs[1]["username"] == "frank"  # 10 commits


class TestPeopleEndpoints:
    async def test_stargazers_endpoint(self, client):
        resp = await client.get("/api/repos/owner/repo1/stargazers")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3
        assert data[0]["username"] == "charlie"

    async def test_watchers_endpoint(self, client):
        resp = await client.get("/api/repos/owner/repo1/watchers")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    async def test_forkers_endpoint(self, client):
        resp = await client.get("/api/repos/owner/repo1/forkers")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["username"] == "eve"

    async def test_contributors_endpoint(self, client):
        resp = await client.get("/api/repos/owner/repo1/contributors")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["commits"] == 42

    async def test_people_summary_endpoint(self, client):
        """Combined people count for a repo."""
        resp = await client.get("/api/repos/owner/repo1/people")
        assert resp.status_code == 200
        data = resp.json()
        assert data["stargazers_count"] == 3
        assert data["watchers_count"] == 2
        assert data["forkers_count"] == 1
        assert data["contributors_count"] == 2
        assert len(data["recent_stargazers"]) == 3
        assert len(data["recent_forkers"]) == 1

    async def test_empty_repo_people(self, client):
        resp = await client.get("/api/repos/nobody/empty/people")
        assert resp.status_code == 200
        data = resp.json()
        assert data["stargazers_count"] == 0
