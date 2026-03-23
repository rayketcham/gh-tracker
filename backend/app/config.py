"""Configuration for the GitHub traffic collector."""

import os
import subprocess


def _get_gh_token() -> str:
    """Get GitHub token from environment or gh CLI."""
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        return token

    try:
        result = subprocess.run(
            ["gh", "auth", "token"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    raise RuntimeError(
        "No GitHub token found. Set GH_TOKEN env var or run 'gh auth login'."
    )


def _get_repos() -> list[str]:
    """Get repos from env var or discover via gh CLI."""
    repos_env = os.environ.get("GH_TRACKER_REPOS")
    if repos_env:
        return [r.strip() for r in repos_env.split(",") if r.strip()]

    try:
        result = subprocess.run(
            [
                "gh", "api", "user/repos",
                "--paginate",
                "--jq", '.[] | select(.permissions.push == true) | .full_name',
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0 and result.stdout.strip():
            return [r.strip() for r in result.stdout.strip().split("\n") if r.strip()]
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    raise RuntimeError(
        "No repos configured. Set GH_TRACKER_REPOS=owner/repo1,owner/repo2 "
        "or ensure 'gh' CLI is authenticated."
    )


class CollectorConfig:
    def __init__(self) -> None:
        self.token = _get_gh_token()
        self.repos = _get_repos()
        default_db = os.path.join(
            os.path.dirname(__file__), "..", "..", "data", "metrics.db"
        )
        self.db_path = os.environ.get("GH_TRACKER_DB", default_db)
