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
4. **Two Specialized Tracks & 6 Pillars of Sequential Logic**:
   - **Track 1**: Combinational Logic (Gates, Adders, Comparators, MUX/DEMUX, Code Converters)
   - **Track 2**: Sequential Logic ([`sequential-reference.html`](file:///c:/Users/Sagar/Documents/GitHub/ade-made-easy/frontend/sequential-reference.html)):
     - *Pillar 1*: Foundations & 1-Bit Memory Storage (Latches, SR NAND/NOR, Forbidden States, Preset/Clear)
     - *Pillar 2*: Core 4 Flip-Flops & Internal Physics (SR, JK, Race-Around Condition, Master-Slave 7476, D 7474, T)
     - *Pillar 3*: Excitation Tables & Flip-Flop Conversions (Master Excitation Matrix, 3-Step Algorithm)
     - *Pillar 4*: Shift Registers & IC 74194 (SISO, SIPO, PISO, PIPO, Ring & Johnson Counters)
     - *Pillar 5*: Counters (Ripple vs Sync, IC 7490 Mod-10/Mod-6, IC 7493 Mod-16/Mod-12, Sync UP/DOWN, 74160/163)
     - *Pillar 6*: Finite State Machines & VLSI Physics (Mealy vs Moore, 1010 Detector, Setup/Hold, Debouncers, SRAM)

---

## Verification & Test Suite

Before making any backend modifications, ensure the dual-engine test suites pass:
```powershell
.\.venv\Scripts\python.exe backend/test_database.py
.\.venv\Scripts\python.exe backend/test_cloud_circuits.py
```
*(Both test suites run against local SQLite and cloud PostgreSQL without code changes).*
