"""Tests for repo metadata feature.

Specs:
1. upsert and retrieve metadata
2. metadata includes all key fields (description, language, topics, etc.)
3. get_all_repo_metadata returns multiple repos
4. API endpoints work
5. Empty repo returns sensible defaults
"""

import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import Database
from app.main import create_app


@pytest.fixture
async def db(tmp_path):
    database = Database(str(tmp_path / "test_metadata.db"))
    await database.initialize()
    yield database
    await database.close()


@pytest.fixture
async def seeded_db(db):
    """DB with metadata for two repos."""
    await db.upsert_repo_metadata(
        "owner/repo1",
        description="An amazing project",
        language="Python",
        topics="python,cli,tools",
        stars=42,
        forks=7,
        watchers_count=5,
        open_issues_count=3,
        size_kb=1024,
        license="MIT",
        created_at="2023-01-15T00:00:00Z",
        updated_at="2026-03-20T00:00:00Z",
        pushed_at="2026-03-19T00:00:00Z",
        default_branch="main",
        homepage="https://example.com",
        total_commits=200,
        releases_count=8,
        languages_json=json.dumps({"Python": 9000, "Shell": 1000}),
    )
    await db.upsert_repo_metadata(
        "owner/repo2",
        description="Another project",
        language="TypeScript",
        stars=100,
        forks=15,
    )
    return db


@pytest.fixture
async def client(seeded_db):
    app = create_app(db=seeded_db)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestUpsertAndRetrieve:
    async def test_upsert_and_retrieve(self, db):
        await db.upsert_repo_metadata(
            "o/r",
            description="Test repo",
            language="Go",
            stars=10,
        )
        meta = await db.get_repo_metadata("o/r")
        assert meta is not None
        assert meta["repo_name"] == "o/r"
        assert meta["description"] == "Test repo"
        assert meta["language"] == "Go"
        assert meta["stars"] == 10

    async def test_upsert_is_idempotent(self, db):
        await db.upsert_repo_metadata("o/r", stars=5)
        await db.upsert_repo_metadata("o/r", stars=10)
        meta = await db.get_repo_metadata("o/r")
        assert meta["stars"] == 10

    async def test_missing_repo_returns_none(self, db):
        result = await db.get_repo_metadata("nobody/nothing")
        assert result is None

    async def test_collected_at_is_set_automatically(self, db):
        await db.upsert_repo_metadata("o/r", stars=1)
        meta = await db.get_repo_metadata("o/r")
        assert meta["collected_at"] != ""

    async def test_all_key_fields_present(self, seeded_db):
        meta = await seeded_db.get_repo_metadata("owner/repo1")
        assert meta is not None

        expected_fields = [
            "repo_name", "description", "language", "topics", "stars",
            "forks", "watchers_count", "open_issues_count", "size_kb",
            "license", "created_at", "updated_at", "pushed_at",
            "default_branch", "homepage", "total_commits", "releases_count",
            "languages_json", "collected_at",
        ]
        for field in expected_fields:
            assert field in meta, f"Missing field: {field}"

    async def test_topics_stored_as_comma_string(self, seeded_db):
        meta = await seeded_db.get_repo_metadata("owner/repo1")
        assert meta["topics"] == "python,cli,tools"

    async def test_languages_json_parseable(self, seeded_db):
        meta = await seeded_db.get_repo_metadata("owner/repo1")
        langs = json.loads(meta["languages_json"])
        assert langs["Python"] == 9000
        assert langs["Shell"] == 1000

    async def test_full_metadata_values(self, seeded_db):
        meta = await seeded_db.get_repo_metadata("owner/repo1")
        assert meta["description"] == "An amazing project"
        assert meta["stars"] == 42
        assert meta["forks"] == 7
        assert meta["license"] == "MIT"
        assert meta["total_commits"] == 200
        assert meta["releases_count"] == 8
        assert meta["size_kb"] == 1024
        assert meta["homepage"] == "https://example.com"
        assert meta["default_branch"] == "main"


class TestGetAllRepoMetadata:
    async def test_returns_all_repos(self, seeded_db):
        all_meta = await seeded_db.get_all_repo_metadata()
        assert len(all_meta) == 2

    async def test_sorted_by_stars_desc(self, seeded_db):
        all_meta = await seeded_db.get_all_repo_metadata()
        # repo2 has 100 stars, repo1 has 42 stars
        assert all_meta[0]["repo_name"] == "owner/repo2"
        assert all_meta[1]["repo_name"] == "owner/repo1"

    async def test_empty_db_returns_empty_list(self, db):
        result = await db.get_all_repo_metadata()
        assert result == []

    async def test_includes_total_views_column(self, seeded_db):
        all_meta = await seeded_db.get_all_repo_metadata()
        for row in all_meta:
            assert "total_views" in row


class TestMetadataAPIEndpoints:
    async def test_get_metadata_for_known_repo(self, client):
        resp = await client.get("/api/repos/owner/repo1/metadata")
        assert resp.status_code == 200
        data = resp.json()
        assert data["repo_name"] == "owner/repo1"
        assert data["description"] == "An amazing project"
        assert data["stars"] == 42
        assert data["language"] == "Python"

    async def test_get_metadata_returns_defaults_for_unknown_repo(self, client):
        resp = await client.get("/api/repos/nobody/empty/metadata")
        assert resp.status_code == 200
        data = resp.json()
        assert data["repo_name"] == "nobody/empty"
        assert data["stars"] == 0
        assert data["description"] == ""
        assert data["language"] == ""
        assert data["default_branch"] == "main"
        assert data["languages_json"] == "{}"
        assert data["total_commits"] == 0
        assert data["releases_count"] == 0

    async def test_get_all_metadata(self, client):
        resp = await client.get("/api/metadata")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        # Should be sorted by stars desc
        assert data[0]["stars"] >= data[1]["stars"]

    async def test_get_all_metadata_empty_db(self, tmp_path):
        empty_db = Database(str(tmp_path / "empty.db"))
        await empty_db.initialize()
        app = create_app(db=empty_db)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/metadata")
            assert resp.status_code == 200
            assert resp.json() == []
        await empty_db.close()

    async def test_metadata_topics_field_present(self, client):
        resp = await client.get("/api/repos/owner/repo1/metadata")
        data = resp.json()
        assert "topics" in data
        assert data["topics"] == "python,cli,tools"

    async def test_metadata_languages_json_field(self, client):
        resp = await client.get("/api/repos/owner/repo1/metadata")
        data = resp.json()
        assert "languages_json" in data
        langs = json.loads(data["languages_json"])
        assert "Python" in langs

    async def test_metadata_includes_timestamps(self, client):
        resp = await client.get("/api/repos/owner/repo1/metadata")
        data = resp.json()
        assert data["created_at"] == "2023-01-15T00:00:00Z"
        assert data["pushed_at"] == "2026-03-19T00:00:00Z"
