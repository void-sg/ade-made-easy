# Technical Handoff — ADE Made Easy

> **Vision & Tagline:** *"Master Analog & Digital Electronics from Concept to Silicon"*

This project is governed by the configuration in [`AGENTS.md`](file:///c:/Users/Sagar/Documents/GitHub/ade-made-easy/AGENTS.md) and the comprehensive technical archive in [`PROJECT_HISTORY.md`](file:///c:/Users/Sagar/Documents/GitHub/ade-made-easy/PROJECT_HISTORY.md).

---

## Quick Navigation

1. **Operating Rules & Commands**: See [`AGENTS.md`](file:///c:/Users/Sagar/Documents/GitHub/ade-made-easy/AGENTS.md) for Golden Rules, dual-engine database policies, and verification commands.
2. **Complete 12 Lab Presets**: Detailed pinouts and logic behavior for Exp 1 through 12 in [`PROJECT_HISTORY.md#2-complete-inventory-of-implemented-ic-presets-12-experiments`](file:///c:/Users/Sagar/Documents/GitHub/ade-made-easy/PROJECT_HISTORY.md).
3. **Live Deployments**:
   - **Frontend**: Vercel CDN (`vercel.json`)
   - **Backend API**: Render Web Service (`https://logic-sim-suite.onrender.com` / `render.yaml`)
   - **Cloud Database**: Neon Serverless PostgreSQL (`bold-poetry-01774125`, `production` branch)
4. **Phase 2 Engineering Roadmap**:
   - Milestone 1: Sequential Circuits (Flip-Flops, 7474, 7476, 74194 Universal Shift Register)
   - Milestone 2: Waveform Analyzer & Digital Logic Scope
   - Milestone 3: Excitation Tables, K-Map Solver & State Machine Synthesizer
   - Milestone 4: Analog Electronics (Op-Amp 741, NE555 Timer, R-2R DAC)

---

## Verification & Test Suite

Before making any backend modifications, ensure the dual-engine test suites pass:
```powershell
.\.venv\Scripts\python.exe backend/test_database.py
.\.venv\Scripts\python.exe backend/test_cloud_circuits.py
```
*(Both test suites run against local SQLite and cloud PostgreSQL without code changes).*
