# ADE Made Easy — Digital & Analog Electronics Engineering Suite

> **Vision & Tagline:** *"Master Analog & Digital Electronics from Concept to Silicon"*

## What this product does
An interactive, high-performance web application and Electronic Design Automation (EDA) simulation suite for digital and analog electronics education and engineering design. Bridges dry textbook theory with physical breadboard simulation and real-world semiconductor/embedded industry practice.

## Curriculum Architecture: Two Specialized Tracks
1. **Track 1: Combinational Logic**:
   - Zero-memory Boolean switching networks, gate-level SOP/POS synthesis, and K-Maps with don't-cares.
   - Core ICs: 7400 (Quad NAND), 7404 (NOT), 7408 (AND), 7432 (OR), 7483 (4-Bit Adder), 7485 (Comparator), 74151 (8:1 MUX), 74153 (Dual 4:1 MUX), 74184, 74185A.
2. **Track 2: Sequential Logic (The 6 Essential Pillars)**:
   - **Pillar 1: Foundations & 1-Bit Memory Storage**: Combinational vs Sequential, Synchronous vs Asynchronous, Level-triggered latches vs Edge-triggered flip-flops, S-R NAND/NOR implementations, Forbidden state ($S=R=1$ for NOR, $\bar{S}=\bar{R}=0$ for NAND), Asynchronous Preset ($\overline{Pr}$) and Clear ($\overline{Cr}$) overrides.
   - **Pillar 2: The Core 4 Flip-Flops & Internal Physics**: Clocked SR ($Q_{n+1}=S+\overline{R}Q_n$), JK Flip-Flop with toggle state ($J=K=1$), Race-Around condition ($t_p > \Delta t$), Master-Slave JK (IC 7476), D-Type data latch (IC 7474), T-Type toggle ($Q_{n+1}=T \oplus Q_n$).
   - **Pillar 3: Excitation Tables & Flip-Flop Conversions**: Characteristic Table vs Excitation Table, Master Excitation Table with Don't Cares ($X$), Universal 3-Step Flip-Flop Conversion Algorithm (JK to D, JK to T, SR to JK).
   - **Pillar 4: Shift Registers & IC 74194**: SISO (Digital delay line), SIPO (UART/SPI RX), PISO (UART/SPI TX), PIPO (CPU bus registers), IC 74194 4-bit Universal Shift Register (Hold, Shift Right, Shift Left, Parallel Load), Ring Counter, Johnson (Twisted-Ring) Counter with glitch-free decoding.
   - **Pillar 5: Counters (Ripple vs. Synchronous)**: Asynchronous ripple delay accumulation ($f_{max} \le \frac{1}{N \cdot t_{pd} + T_s}$), decoding glitches, IC 7490 Decade/Mod-6, IC 7493 Binary/Mod-12, 3-bit Synchronous UP Counter derivation ($J_0 K_0, J_1 K_1, J_2 K_2$), Synchronous UP/DOWN with mode $M$, Presettable MSI counters (IC 74160/163, 74190/191).
   - **Pillar 6: Finite State Machines (FSMs) & Real-World Physics**: Mealy vs Moore models, FSM synthesis workflow, `1010` sequence detector (overlapping vs non-overlapping), VLSI timing constraints (Setup $t_s$, Hold $t_h$, Metastability, Clock Skew), SPDT switch debouncer (IC 74279), 1-bit SRAM 6T cell, 4-phase stepper motor controllers.

## 4-Step Guided Pedagogical Flow
- **Step 1: Theory & Foundations**: Mathematical equations, interactive truth/excitation tables, and DIP pinout data.
- **Step 2: Schematic Blueprint**: ANSI/IEEE vector schematics with interactive net tracing and key checkpoints.
- **Step 3: Interactive Simulation Workbench**: 60 FPS breadboard canvas, stimulus controls, live logic probes, and multi-channel waveform analyzer.
- **Step 4: Actual Practical Use**: Real-world challenges, synthesizable Verilog RTL generator, hardware physics (bounce, fan-out), and microcontroller interfacing (Arduino, STM32, 8051).

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
- [`PRODUCT_SPECIFICATION.md`](file:///c:/Users/Sagar/Documents/GitHub/ade-made-easy/PRODUCT_SPECIFICATION.md)
- [`PROJECT_HISTORY.md`](file:///c:/Users/Sagar/Documents/GitHub/ade-made-easy/PROJECT_HISTORY.md)
- [`HANDOFF.md`](file:///c:/Users/Sagar/Documents/GitHub/ade-made-easy/HANDOFF.md)
