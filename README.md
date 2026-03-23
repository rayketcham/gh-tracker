[![CI](https://github.com/rayketcham/gh-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/rayketcham/gh-tracker/actions/workflows/ci.yml)

# gh-tracker

Self-hosted GitHub analytics dashboard. Captures every metric GitHub exposes — traffic, stars, forks, clones, referrers, releases, and more — before the 14-day expiry window closes.

## Stack

- **Backend**: FastAPI (Python 3.11+), SQLite via aiosqlite
- **Frontend**: React 18, TypeScript, Recharts
- **Deployment**: Docker Compose

## Quick Start

```bash
# Backend
cd backend
pip install -e ".[dev]"
GH_TOKEN=your_token GH_REPOS=owner/repo python run.py

# Frontend
cd frontend
npm install
npm run dev
```

## Development

```bash
# Backend lint
cd backend && ruff check app/ tests/

# Backend tests (unit only)
cd backend && pytest tests/ --ignore=tests/test_live_collect.py

# Frontend lint
cd frontend && npm run lint

# Frontend build
cd frontend && npm run build
```

## Project Structure

```
backend/    FastAPI app, collector, models, API routes
frontend/   React dashboard
data/       SQLite database (volume-mounted in Docker)
deploy/     Systemd units, Docker Compose, nginx config
```
