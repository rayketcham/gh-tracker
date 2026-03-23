"""Tests for GitHub issues tracking — open/closed issues and PRs per repo.

Specs:
1. Collect and store open/closed issue counts
2. Collect and store open/closed PR counts
3. Store individual issues with title, state, author, labels, timestamps
4. API endpoint returns issue summary per repo
5. API endpoint returns issue list for a repo
6. Track issues over time (daily snapshots)
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import Database
from app.main import create_app


@pytest.fixture
async def db(tmp_path):
    database = Database(str(tmp_path / "test_issues.db"))
    await database.initialize()
    yield database
    await database.close()


@pytest.fixture
async def seeded_db(db):
    await db.upsert_issue(
        "owner/repo1", 1, "Bug: login broken", "open", "alice",
        "bug,urgent", "2026-03-10T10:00:00Z", None,
    )
    await db.upsert_issue(
        "owner/repo1", 2, "Add dark mode", "closed", "bob",
        "enhancement", "2026-03-05T08:00:00Z", "2026-03-15T16:00:00Z",
    )
    await db.upsert_issue(
        "owner/repo1", 3, "Fix typo in README", "open", "charlie",
        "documentation", "2026-03-20T12:00:00Z", None,
    )
    await db.upsert_issue(
        "owner/repo1", 10, "Refactor auth module", "open", "alice",
        "enhancement", "2026-03-18T09:00:00Z", None, is_pr=True,
    )
    await db.upsert_issue(
        "owner/repo1", 11, "Fix CI pipeline", "closed", "dave",
        "ci", "2026-03-12T14:00:00Z", "2026-03-13T10:00:00Z", is_pr=True,
    )
    return db


@pytest.fixture
async def client(seeded_db):
    app = create_app(db=seeded_db)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestIssuesDB:
    async def test_upsert_and_retrieve(self, db):
        await db.upsert_issue(
            "o/r", 1, "Test issue", "open", "user1",
            "bug", "2026-01-01T00:00:00Z", None,
        )
        issues = await db.get_issues("o/r")
        assert len(issues) == 1
        assert issues[0]["title"] == "Test issue"
        assert issues[0]["state"] == "open"
        assert issues[0]["author"] == "user1"

    async def test_upsert_updates_existing(self, db):
        await db.upsert_issue(
            "o/r", 1, "Test", "open", "user1",
            "", "2026-01-01T00:00:00Z", None,
        )
        await db.upsert_issue(
            "o/r", 1, "Test", "closed", "user1",
            "", "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z",
        )
        issues = await db.get_issues("o/r")
        assert len(issues) == 1
        assert issues[0]["state"] == "closed"

    async def test_separate_issues_and_prs(self, seeded_db):
        issues = await seeded_db.get_issues("owner/repo1", is_pr=False)
        prs = await seeded_db.get_issues("owner/repo1", is_pr=True)
        assert len(issues) == 3
        assert len(prs) == 2


class TestIssuesEndpoints:
    async def test_issues_summary(self, client):
        """GET /api/repos/{owner}/{repo}/issues/summary returns counts."""
        resp = await client.get("/api/repos/owner/repo1/issues/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["open_issues"] == 2
        assert data["closed_issues"] == 1
        assert data["open_prs"] == 1
        assert data["closed_prs"] == 1
        assert data["total"] == 5

    async def test_issues_list(self, client):
        """GET /api/repos/{owner}/{repo}/issues returns all issues."""
        resp = await client.get("/api/repos/owner/repo1/issues")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 5

    async def test_issues_list_filter_open(self, client):
        """Can filter to open issues only."""
        resp = await client.get("/api/repos/owner/repo1/issues?state=open")
        assert resp.status_code == 200
        data = resp.json()
        assert all(d["state"] == "open" for d in data)
        assert len(data) == 3  # 2 issues + 1 PR

    async def test_issues_sorted_newest_first(self, client):
        """Issues sorted by created_at descending."""
        resp = await client.get("/api/repos/owner/repo1/issues")
        data = resp.json()
        dates = [d["created_at"] for d in data]
        assert dates == sorted(dates, reverse=True)

    async def test_empty_repo_issues(self, client):
        resp = await client.get("/api/repos/nobody/empty/issues/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
