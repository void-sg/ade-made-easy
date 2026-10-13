# ADE Made Easy — Digital & Analog Electronics Engineering Suite

> **Vision & Tagline:** *"Master Analog & Digital Electronics from Concept to Silicon"*

## What this product does
An interactive, high-performance web application and Electronic Design Automation (EDA) simulation suite for digital and analog electronics education and engineering design. Enables students and designers to simulate standard TTL 74LSxx logic ICs, modular code converters, magnitude comparators, multiplexers, 4-bit binary adders, and ripple/decade counters with real-time signal propagation, SVG breadboard wiring, schematic generation, and cloud-backed project persistence.

## Tech Stack
- **Frontend**: HTML5, Modern CSS3, Vanilla ES6+ JavaScript, SVG Interactive Canvas for IC Breadboard Workbench & KiCad-style Schematics.
- **Backend**: Python 3.10+ / 3.12+ with FastAPI, Uvicorn, and Pydantic v2.
- **Database**: Dual-engine (`backend/database.py`):
  - **Local Development**: SQLite (`backend/users.db`)
  - **Production Cloud**: PostgreSQL (Neon Serverless Postgres via `DATABASE_URL` with connection pooling)
- **Authentication**: JWT Bearer Tokens, Salted SHA-256 Hashing, OTP Verification, Institutional Roll Number & Email Identifiers.
- **Hosting Targets**:
  - **Frontend**: Vercel (Static CDN, Clean URLs, Security Headers)
  - **Backend**: Render Web Service (`https://logic-sim-suite.onrender.com` / Python 3.13)
  - **Database**: Neon Cloud PostgreSQL (`bold-poetry-01774125`, AWS `production` branch)

## Golden Rules
1. **Never commit secrets**: All secrets must be loaded from environment variables and documented in `.env.example`.
2. **Strict tenant & user scoping**: Every circuit query must filter by authenticated `user_id`. Never allow IDOR or cross-tenant project leakage.
3. **Dual database engine compatibility**: Ensure SQL syntax in `backend/database.py` executes cleanly on both SQLite and PostgreSQL.
4. **Input validation at boundary**: All API requests must be validated using Pydantic schemas.
5. **Never break test suites**: Run `.\.venv\Scripts\python.exe backend/test_database.py` and `.\.venv\Scripts\python.exe backend/test_cloud_circuits.py` before completing any backend changes.
6. **No unsolicited Git commits**: Leave working tree changes unstaged/staged unless explicitly asked to commit.

## Core Commands
- **Run Backend**: `.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --reload --port 8000`
- **Run Database Tests**: `.\.venv\Scripts\python.exe backend/test_database.py`
- **Run Cloud Circuits Tests**: `.\.venv\Scripts\python.exe backend/test_cloud_circuits.py`

## Architecture Decisions Log
- **ADR-0001 (Modular Monolith)**: FastAPI backend provides a pure REST API; simulation logic executes client-side via JavaScript engine for real-time 60 FPS interactive wiring without server bottlenecks.
- **ADR-0002 (Dual-Tier Circuit Storage)**: Circuits persist in `localStorage` for offline caching and automatically synchronize to the cloud database (`user_circuits`) when authenticated.
- **ADR-0003 (Academic Identifier First)**: Students authenticate via College Roll Number or Email; passwords hashed with PBKDF2/SHA-256 with cryptographically random per-user salt.

## Project Memory & Context Transfer
For comprehensive system specifications, all 12 implemented IC lab presets, detailed EDA simulation capabilities, live production endpoints, and the Phase 2 engineering roadmap, see:
- [`PROJECT_HISTORY.md`](file:///c:/Users/Sagar/Documents/GitHub/ade-made-easy/PROJECT_HISTORY.md)
- [`HANDOFF.md`](file:///c:/Users/Sagar/Documents/GitHub/ade-made-easy/HANDOFF.md)
