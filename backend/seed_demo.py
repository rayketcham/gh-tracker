"""Seed the SQLite database with realistic demo data for dashboard development."""

import asyncio
import math
import os
import random
import sys
from datetime import date, timedelta

# Ensure the app package is importable from this script's directory
sys.path.insert(0, os.path.dirname(__file__))

from app.database import Database

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SEED = 42
DB_PATH = "/opt/gh-tracker/data/metrics.db"

START_DATE = date(2025, 12, 23)
END_DATE = date(2026, 3, 23)
TOTAL_DAYS = (END_DATE - START_DATE).days + 1  # 91 days (indices 0..90)

# Day index (~45) that simulates an HN front-page spike
HN_SPIKE_DAY = 45

REPOS = [
    "rayketcham/gh-tracker",
    "rayketcham/awesome-project",
]

# Referrers with baseline daily share weights (normalised inside the loop)
REFERRERS = [
    "github.com",
    "google.com",
    "news.ycombinator.com",
    "twitter.com",
    "reddit.com",
]

# Popular paths per repo
PATHS = {
    "rayketcham/gh-tracker": [
        ("/", "rayketcham/gh-tracker: GitHub traffic tracker"),
        ("/README.md", "README - gh-tracker"),
        ("/blob/main/src/collector.py", "collector.py - source"),
        ("/blob/main/src/main.py", "main.py - source"),
        ("/issues", "Issues - gh-tracker"),
        ("/pulls", "Pull requests - gh-tracker"),
    ],
    "rayketcham/awesome-project": [
        ("/", "rayketcham/awesome-project"),
        ("/README.md", "README - awesome-project"),
        ("/blob/main/src/index.js", "index.js - source"),
        ("/blob/main/docs/getting-started.md", "Getting Started"),
        ("/issues", "Issues - awesome-project"),
        ("/releases", "Releases - awesome-project"),
    ],
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_rng(repo: str, day_idx: int, extra: int = 0) -> random.Random:
    """Return a deterministic RNG scoped to (repo, day, extra)."""
    return random.Random(hash((SEED, repo, day_idx, extra)))


def weekday_factor(d: date) -> float:
    """Mon-Fri get a mild boost, Sat-Sun a dip."""
    # 0=Mon … 6=Sun
    factors = [1.05, 1.10, 1.10, 1.05, 1.00, 0.70, 0.65]
    return factors[d.weekday()]


def trend_factor(day_idx: int) -> float:
    """Gentle upward trend over 90 days: starts at 0.80, ends at 1.20."""
    return 0.80 + 0.40 * (day_idx / (TOTAL_DAYS - 1))


def spike_factor(day_idx: int) -> float:
    """
    Gaussian spike centred on HN_SPIKE_DAY (peak ~8x), decaying over ~4 days.
    The day before the spike has a small bump (Reddit/Twitter cross-posting).
    """
    sigma = 2.5
    dist = day_idx - HN_SPIKE_DAY
    gauss = math.exp(-(dist ** 2) / (2 * sigma ** 2))
    # Peak multiplier 8x; baseline 1x
    return 1.0 + 7.0 * gauss


def generate_views(repo: str, day_idx: int, d: date) -> int:
    rng = make_rng(repo, day_idx, extra=1)
    base = 150  # midpoint of 50-300 range
    # Combine factors
    multiplier = trend_factor(day_idx) * weekday_factor(d) * spike_factor(day_idx)
    # Gaussian noise ±20 %
    noise = rng.gauss(1.0, 0.20)
    raw = base * multiplier * noise
    # Clamp to realistic range; spikes can go much higher
    return max(10, int(raw))


def generate_clones(repo: str, day_idx: int, d: date) -> int:
    rng = make_rng(repo, day_idx, extra=2)
    base = 20
    multiplier = trend_factor(day_idx) * weekday_factor(d) * spike_factor(day_idx)
    noise = rng.gauss(1.0, 0.25)
    raw = base * multiplier * noise
    return max(1, int(raw))


def unique_fraction(rng: random.Random, lo: float, hi: float) -> float:
    return rng.uniform(lo, hi)


def generate_referrers(repo: str, day_idx: int, views: int) -> list[dict]:
    rng = make_rng(repo, day_idx, extra=3)

    # Base share weights
    weights = {
        "github.com": 0.40,
        "google.com": 0.25,
        "news.ycombinator.com": 0.10,
        "twitter.com": 0.13,
        "reddit.com": 0.12,
    }

    # During / around the spike, HN and Reddit surge
    dist = abs(day_idx - HN_SPIKE_DAY)
    if dist <= 5:
        factor = 1.0 - dist * 0.15  # 1.0 at peak, 0.25 at dist=5
        weights["news.ycombinator.com"] += 0.35 * factor
        weights["reddit.com"] += 0.15 * factor
        weights["twitter.com"] += 0.10 * factor
        # Re-normalise
        total_w = sum(weights.values())
        weights = {k: v / total_w for k, v in weights.items()}

    result = []
    remaining = views
    shuffled = list(weights.items())
    rng.shuffle(shuffled)

    for i, (referrer, share) in enumerate(shuffled):
        if remaining <= 0:
            break
        if i == len(shuffled) - 1:
            count = remaining
        else:
            # Add jitter to share
            jitter = rng.uniform(0.85, 1.15)
            count = max(0, int(views * share * jitter))
            count = min(count, remaining)
        if count == 0:
            continue
        uniques = max(1, int(count * unique_fraction(rng, 0.40, 0.65)))
        result.append({"referrer": referrer, "count": count, "uniques": uniques})
        remaining -= count

    # Sort descending by count for readability
    result.sort(key=lambda x: x["count"], reverse=True)
    return result


def generate_paths(repo: str, day_idx: int, views: int) -> list[dict]:
    rng = make_rng(repo, day_idx, extra=4)

    path_list = PATHS[repo]
    # Share weights: root page dominates, README second, others tail off
    raw_weights = [0.40, 0.20, 0.12, 0.10, 0.10, 0.08]
    # Trim / extend to match actual path count
    raw_weights = raw_weights[: len(path_list)]
    total_w = sum(raw_weights)
    weights = [w / total_w for w in raw_weights]

    result = []
    remaining = views
    for i, ((path, title), share) in enumerate(zip(path_list, weights)):
        if remaining <= 0:
            break
        if i == len(path_list) - 1:
            count = remaining
        else:
            jitter = rng.uniform(0.85, 1.15)
            count = max(0, int(views * share * jitter))
            count = min(count, remaining)
        if count == 0:
            continue
        uniques = max(1, int(count * unique_fraction(rng, 0.40, 0.60)))
        result.append({"path": path, "title": title, "count": count, "uniques": uniques})
        remaining -= count

    return result


# ---------------------------------------------------------------------------
# Main seeding routine
# ---------------------------------------------------------------------------


async def seed():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    db = Database(DB_PATH)
    await db.initialize()
    print(f"Database initialised at {DB_PATH}")

    for repo in REPOS:
        print(f"\nSeeding repo: {repo}")
        for day_idx in range(TOTAL_DAYS):
            d = START_DATE + timedelta(days=day_idx)
            date_str = d.isoformat()

            views = generate_views(repo, day_idx, d)
            rng_uv = make_rng(repo, day_idx, extra=5)
            unique_visitors = max(1, int(views * unique_fraction(rng_uv, 0.40, 0.60)))

            clones = generate_clones(repo, day_idx, d)
            rng_uc = make_rng(repo, day_idx, extra=6)
            unique_cloners = max(1, int(clones * unique_fraction(rng_uc, 0.30, 0.50)))

            await db.upsert_daily_metrics(
                repo_name=repo,
                date=date_str,
                views=views,
                unique_visitors=unique_visitors,
                clones=clones,
                unique_cloners=unique_cloners,
            )

            referrers = generate_referrers(repo, day_idx, views)
            await db.store_referrers(repo, date_str, referrers)

            paths = generate_paths(repo, day_idx, views)
            await db.store_paths(repo, date_str, paths)

            if day_idx % 10 == 0 or day_idx == TOTAL_DAYS - 1:
                print(
                    f"  {date_str}  views={views:4d}  clones={clones:3d}"
                    f"  referrers={len(referrers)}  paths={len(paths)}"
                )

    await db.close()
    print("\nDone. Database seeded successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
