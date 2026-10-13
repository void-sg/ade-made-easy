# ADE Made Easy — Project History & Technical Handoff

> **Vision & Tagline:** *"Master Analog & Digital Electronics from Concept to Silicon"*

---

## 1. Executive Summary

**ADE Made Easy** (evolved from the Digital Logic Simulation Suite) is an interactive Electronic Design Automation (EDA) simulation suite and academic learning platform. The application provides digital and analog electronics students and circuit designers with an end-to-end laboratory workbench directly in the browser—combining 60 FPS real-time breadboard wiring, standard TTL 74LSxx IC logic emulation, dynamic schematic generation, observation logging, and cloud project synchronization.

This document serves as the project memory and technical handoff base, capturing:
- All 12 implemented lab experiment presets and EDA capabilities
- Live production deployment endpoints across Vercel, Render, and Neon PostgreSQL
- The engineering roadmap for Phase 2 expansion

---

## 2. Complete Inventory of Implemented IC Presets (12 Experiments)

The Workbench (`frontend/workbench.html` & `frontend/workbench.js`) features 12 turnkey, pre-wired academic lab experiment presets that initialize components, power rails, clock inputs, signal switches, and output LED indicators:

| Preset Key | Experiment Title | Primary ICs / Components | Functional Description & Pin Wiring |
| :--- | :--- | :--- | :--- |
| `7400_nand` | **Exp 1: 7400 Quad 2-Input NAND Gate Verification** | 7400 Quad NAND, Power Rail, SPDT Switches, Output LED | Verifies universal NAND logic truth table ($Y = \overline{A \cdot B}$). Inputs on pins 1 & 2, output on pin 3. Pin 14 tied to VCC, pin 7 tied to GND. |
| `7483_adder` | **Exp 2: 7483 4-Bit Binary Full Adder Test** | 7483 4-Bit Adder, 8-Input Switch Bank, 8-Channel LED Rail | Computes 4-bit binary addition $(A_3..A_0 + B_3..B_0 + C_0)$ yielding sum $(\Sigma_4..\Sigma_1)$ and carry out $(C_4)$. Pin 5 tied to VCC, pin 12 tied to GND. |
| `7485_comparator` | **Exp 3: 7485 4-Bit Magnitude Comparator Test** | 7485 4-Bit Comparator, 8-Input Switch Bank, 3 Indicator LEDs | Compares two 4-bit binary words $A$ and $B$, driving outputs $A>B$ (Pin 5), $A=B$ (Pin 6), and $A<B$ (Pin 7). Cascading inputs configured with $I_{A=B}$ pulled HIGH. |
| `74151_mux` | **Exp 4: 74151 8:1 Multiplexer Experiment** | 74151 8:1 MUX, 8 Data Switches, 3 Select Switches, Output LEDs | Selects one of 8 data lines ($D_0-D_7$) using 3-bit binary select address $(S_2, S_1, S_0)$. Active-low strobe $\overline{E}$ on pin 7. Complementary outputs $Y$ (Pin 5) and $W = \overline{Y}$ (Pin 6). |
| `74153_mux` | **Exp 5: 74153 Dual 4:1 Multiplexer Experiment** | 74153 Dual 4:1 MUX, Data Inputs, Shared Select Lines, LEDs | Demonstrates dual independent 4-to-1 data multiplexing. Common select lines $S_1, S_0$ control channel 1 ($1I_0-1I_3 \rightarrow 1Y$) and channel 2 ($2I_0-2I_3 \rightarrow 2Y$) with independent active-low strobes $1\overline{G}, 2\overline{G}$. |
| `74153_case1_3var` | **Exp 6: 74153 8:1 MUX: $F(C,B,A) = \Sigma m(0,1,3,4,7)$** | 74153 Dual 4:1 MUX, Strobe Inverter, Switch Bank, Output LED | Academic Lab Case 1: Implements a 3-variable Boolean minterm function by partitioning variables into select lines ($B, A$) and data input logic ($C, \overline{C}, 0, 1$). |
| `74153_8to1_function` | **Exp 7: 74153 8:1 MUX: $F(A,B,C,D) = \Sigma m(0,1,2,4,7,8,9,11,12,14)$** | 74153 Dual 4:1 MUX, NOT Gate (7404), Logic Rail, Output LED | Academic Lab Case 2: Synthesizes a 4-variable Boolean logic function using dual 4:1 multiplexers and select line decoding. |
| `diode_or` | **Exp 8: Diode OR Logic Gate Circuit** | 1N4148/1N4007 Diodes, SPDT Switches, 1kΩ Resistor, LED | Discrete component electronics experiment showing diode forward conduction logic ($V_{out} = V_{in} - V_D$) implementing an OR gate with pull-down resistor to GND. |
| `7490_decade` | **Exp 9: 7490 BCD Decade Counter (Mod-10, 0..9)** | 7490 Decade Counter, Clock Generator, 8-Channel LED Rail | Asynchronous BCD decade counter. Output $Q_A$ (Pin 12) cascades to input $B$ (Pin 1). Counts 0000 to 1001 (0 to 9 decimal). Reset lines $R_{0(1)}, R_{0(2)}, R_{9(1)}, R_{9(2)}$ tied to GND. |
| `7490_mod6` | **Exp 10: 7490 Mod-6 Counter (Reset at 6: $Q_C \cdot Q_B$)** | 7490 Decade Counter, Feedback Wires, Clock Generator, LED Rail | Truncated modulo-6 asynchronous counter (counts 0 to 5). State 6 ($0110_2$) feedback loop ties $Q_C$ (Pin 8) to $R_{0(1)}$ (Pin 2) and $Q_B$ (Pin 9) to $R_{0(2)}$ (Pin 3) for instant zero-reset. |
| `7493_mod16` | **Exp 11: 7493 4-Bit Binary Counter (Mod-16, 0..15)** | 7493 4-Bit Binary Counter, Clock Generator, LED Rail | Modulo-16 ripple counter. Output $Q_A$ (Pin 12) feeds Clock input $B$ (Pin 1). Cycles through all 16 states ($0000_2$ to $1111_2$). Reset inputs $R_{0(1)}, R_{0(2)}$ tied to GND. |
| `7493_mod12` | **Exp 12: 7493 Mod-12 Counter (Reset at 12: $Q_D \cdot Q_C$)** | 7493 4-Bit Binary Counter, Feedback Wires, Clock Generator, LED Rail | Truncated modulo-12 counter (counts 0 to 11). State 12 ($1100_2$) feedback loop routes $Q_D$ (Pin 11) to $R_{0(1)}$ (Pin 2) and $Q_C$ (Pin 8) to $R_{0(2)}$ (Pin 3) for immediate reset. |

---

## 3. Implemented EDA Simulation & Workbench Features

### A. Core Simulation Engine
- **60 FPS Client-Side Simulation**: Interactive loop written in pure ES6+ JavaScript, computing real-time logic propagation without server roundtrips.
- **Three-State Logic & Signal Levels**: Fully tracks logic HIGH ($1$), logic LOW ($0$), and FLOATING/HIGH-Z ($Z$) states across all pins and nets.
- **Clock Generator Pulse Engine**: Configurable frequency generator (variable Hz) and single-step manual pulse button for stepping through sequential transitions.

### B. Interactive Canvas & Wiring System
- **SVG Breadboard Workbench**: Scalable vector rendering with responsive zoom, panning, and reset-zoom controls.
- **Orthogonal Wire Routing**: Automatic Manhattan/orthogonal routing with wire tension, customizable color palettes, and wire deletion tools.
- **Pin Snapping & Tooltips**: Snapping hotspots on DIP IC pins, switches, and LED rails with live pin labels and voltage indicators.

### C. Laboratory Productivity Tools
- **Full Undo / Redo History**: Complete state snapshots allowing frictionless undo (`Ctrl+Z`) and redo (`Ctrl+Y`).
- **Dynamic KiCad-Style Schematic Viewer**: Translates breadboard connections into standardized schematic symbols and netlists.
- **Observation Report & PDF Lab Manual Generator**: Automatically exports student lab reports with truth table logs, roll numbers, timestamped circuit diagrams, and faculty signature blocks.
- **JSON Import / Export**: Portable circuit file format for sharing, backup, and grading.

### D. Academic Authentication & Cloud Persistence
- **Dual-Engine Database Layer**: SQLite for zero-config local development (`backend/users.db`) and PostgreSQL for cloud production (Neon).
- **Academic Roll Number Login**: Students sign in via College Roll Number (e.g., `23CS012`) or institutional email with salted PBKDF2/SHA-256 passwords and OTP verification.
- **Dual-Tier Cloud Circuit Sync**: Instant offline caching in `localStorage` backed by authenticated PostgreSQL cloud persistence (`user_circuits` table) with full CRUD operations.

---

## 4. Live Deployment Topology & Production Endpoints

```mermaid
flowchart LR
    Browser["Client Browser (Student)"]
    Vercel["Frontend on Vercel CDN\n(HTML5 / ES6+ Canvas)"]
    Render["Backend on Render\nFastAPI / Python 3.13"]
    Neon["Cloud DB on Neon\nServerless PostgreSQL"]
    SQLite["Local SQLite\n(Local Dev Fallback)"]

    Browser -->|Static Assets| Vercel
    Browser -->|REST API / JWT| Render
    Render -->|DATABASE_URL| Neon
    Render -.->|Fallback Dev| SQLite
```

| Component | Target Platform | Live Endpoint / Config | Details |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | Configured via `vercel.json` | Static CDN delivery, URL rewrites to `/landing.html`, strict security headers (`nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`). |
| **Backend API** | **Render** | `https://logic-sim-suite.onrender.com` | FastAPI modular REST API running on Python 3.13 (`render.yaml`). Automatic OpenAPI documentation at `/docs` and `/redoc`. |
| **Database** | **Neon PostgreSQL** | Project: `bold-poetry-01774125`<br>Branch: `production` | Serverless PostgreSQL with auto-suspend and connection pooling (`.neon` config). Automatic migrations executed via `backend/database.py`. |
| **Local Dev** | **SQLite** | `backend/users.db` | Local zero-dependency database automatically activated when `DATABASE_URL` is empty. |

---

## 5. Phase 2 Engineering Roadmap

The upcoming engineering phase expands **ADE Made Easy** from combinational logic and basic ripple counters into full sequential systems, timing instrumentation, and analog circuits:

```mermaid
flowchart TD
    M1["Milestone 1: Sequential Circuits & Latches"]
    M2["Milestone 2: Digital Waveform Analyzer"]
    M3["Milestone 3: Excitation Tables & State Synthesizer"]
    M4["Milestone 4: Analog Electronics Expansion"]

    M1 --> M2
    M2 --> M3
    M3 --> M4
```

### Milestone 1: Sequential Circuits & Advanced Storage Elements
- **Flip-Flop Family**: Emulate discrete SR, JK, Master-Slave, D, and T flip-flops with edge-triggering and asynchronous Preset/Clear pins.
- **Dedicated Sequential ICs**:
  - `7474`: Dual D-Type Positive-Edge-Triggered Flip-Flop with Preset and Clear
  - `7476`: Dual J-K Flip-Flop with Preset and Clear
  - `74194`: 4-Bit Bidirectional Universal Shift Register (Parallel load, shift right, shift left, hold)
  - `7495`: 4-Bit Parallel-Access Shift Register
- **Synchronous Counters**: Up/Down synchronous binary and decade counters with lookahead carry outputs.

### Milestone 2: Waveform Analyzer / Logic Timing Scope
- **Multi-Channel Digital Logic Analyzer**: Live oscillographic timing diagrams synchronized with the clock generator.
- **Glitch & Race Condition Detection**: Propagation delay modeling showing transitional spikes and static hazards.
- **Time-Domain Cursors & Export**: Measure clock frequency, duty cycle, setup/hold times, and export timing waveforms to SVG/PNG.

### Milestone 3: Excitation Tables, K-Map Solver & State Machine Synthesizer
- **Interactive State Diagram Canvas**: Visual Mealy and Moore finite-state machine (FSM) bubble diagram editor.
- **Automated Excitation Table Generation**: Auto-derives excitation requirements for JK, D, and T flip-flops from state transition tables.
- **Boolean Equation Minimizer**: Integrated Quine-McCluskey / Karnaugh Map solver generating simplified Sum-of-Products (SOP) and Product-of-Sums (POS) equations with don't-care conditions.

### Milestone 4: Analog Electronics Expansion (Bridging Digital to Silicon)
- **Operational Amplifiers (Op-Amp 741)**: Inverting, non-inverting, summing, differential, and comparator topologies.
- **NE555 Timer IC**: Astable multivibrator (square wave generator) and monostable one-shot pulse generator with $RC$ timing calculation.
- **Data Converters**: 4-bit R-2R ladder Digital-to-Analog Converter (DAC) and Flash Analog-to-Digital Converter (ADC).
