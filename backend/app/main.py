"""FastAPI application for the GitHub analytics dashboard."""

from fastapi import FastAPI, Query

from app.database import Database


def create_app(db: Database | None = None) -> FastAPI:
    app = FastAPI(title="gh-tracker", version="0.1.0")

    app.state.db = db

    @app.get("/api/health")
    async def health() -> dict:
        return {"status": "ok"}

    @app.get("/api/repos")
    async def list_repos() -> list[str]:
        return await app.state.db.list_repos()

    @app.get("/api/repos/{owner}/{repo}/traffic")
    async def get_traffic(
        owner: str,
        repo: str,
        start: str | None = Query(None),
        end: str | None = Query(None),
    ) -> list[dict]:
        repo_name = f"{owner}/{repo}"
        start_date = start or "2000-01-01"
        end_date = end or "2099-12-31"
        return await app.state.db.get_daily_metrics(repo_name, start_date, end_date)

    @app.get("/api/repos/{owner}/{repo}/referrers")
    async def get_referrers(owner: str, repo: str) -> list[dict]:
        return await app.state.db.get_referrers(f"{owner}/{repo}")

    @app.get("/api/repos/{owner}/{repo}/paths")
    async def get_paths(owner: str, repo: str) -> list[dict]:
        return await app.state.db.get_popular_paths(f"{owner}/{repo}")

    @app.get("/api/repos/{owner}/{repo}/summary")
    async def get_repo_summary(owner: str, repo: str) -> dict:
        repo_name = f"{owner}/{repo}"
        traffic = await app.state.db.get_daily_metrics(
            repo_name, "2000-01-01", "2099-12-31"
        )
        referrers = await app.state.db.get_referrers(repo_name)
        paths = await app.state.db.get_popular_paths(repo_name)
        total_views = sum(d["views"] for d in traffic)
        total_uv = sum(d["unique_visitors"] for d in traffic)
        return {
            "repo_name": repo_name,
            "github_url": f"https://github.com/{repo_name}",
            "traffic": traffic,
            "referrers": referrers,
            "paths": paths,
            "total_views": total_views,
            "total_unique_visitors": total_uv,
        }

    @app.get("/api/repos/{owner}/{repo}/visitors")
    async def get_repo_visitors(owner: str, repo: str) -> list[dict]:
        return await app.state.db.get_repo_visitors(f"{owner}/{repo}")

    @app.get("/api/visitors")
    async def get_visitors(repo: str | None = Query(None)) -> list[dict]:
        return await app.state.db.get_daily_visitors(repo)

    @app.get("/api/visitors/summary")
    async def get_visitors_summary() -> list[dict]:
        return await app.state.db.get_visitor_summary()

    # --- People endpoints ---

    @app.get("/api/repos/{owner}/{repo}/stargazers")
    async def get_stargazers(owner: str, repo: str) -> list[dict]:
        return await app.state.db.get_stargazers(f"{owner}/{repo}")

    @app.get("/api/repos/{owner}/{repo}/watchers")
    async def get_watchers(owner: str, repo: str) -> list[dict]:
        return await app.state.db.get_watchers(f"{owner}/{repo}")

    @app.get("/api/repos/{owner}/{repo}/forkers")
    async def get_forkers(owner: str, repo: str) -> list[dict]:
        return await app.state.db.get_forkers(f"{owner}/{repo}")

    @app.get("/api/repos/{owner}/{repo}/contributors")
    async def get_contributors(owner: str, repo: str) -> list[dict]:
        return await app.state.db.get_contributors(f"{owner}/{repo}")

    @app.get("/api/repos/{owner}/{repo}/people")
    async def get_people_summary(owner: str, repo: str) -> dict:
        repo_name = f"{owner}/{repo}"
        stars = await app.state.db.get_stargazers(repo_name)
        watchers = await app.state.db.get_watchers(repo_name)
        forkers = await app.state.db.get_forkers(repo_name)
        contribs = await app.state.db.get_contributors(repo_name)
        return {
            "repo_name": repo_name,
            "stargazers_count": len(stars),
            "watchers_count": len(watchers),
            "forkers_count": len(forkers),
            "contributors_count": len(contribs),
            "recent_stargazers": stars[:10],
            "recent_forkers": forkers[:10],
            "top_contributors": contribs[:10],
        }

    # --- Issues endpoints ---

    @app.get("/api/repos/{owner}/{repo}/issues/summary")
    async def get_issues_summary(owner: str, repo: str) -> dict:
        return await app.state.db.get_issue_summary(f"{owner}/{repo}")

    @app.get("/api/repos/{owner}/{repo}/issues")
    async def get_issues(
        owner: str, repo: str, state: str | None = Query(None)
    ) -> list[dict]:
        return await app.state.db.get_issues(
            f"{owner}/{repo}", state=state
        )

    return app
