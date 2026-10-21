# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Undergraduate engineering students (ECE, CSE, EEE, Instrumentation) in digital and analog electronics laboratory courses.
- University professors and teaching assistants conducting lab demonstrations, experiment evaluations, and viva examinations.
- Embedded and hardware engineering learners bridging gate theory with physical integrated circuit (IC) breadboarding.

## Product Purpose

An interactive, high-performance web-native Electronic Design Automation (EDA) simulation suite and virtual laboratory that connects textbook Boolean algebra and state machines with physical breadboard wiring and real-world semiconductor practice.

## Positioning

Unlike abstract logic simulators (Logisim, Digital) that stop at schematic symbols, or heavy desktop suites (Multisim, Proteus) with costly licenses and steep learning curves, ADE Made Easy delivers instant, zero-install 60 FPS in-browser simulation with authentic DIP pinouts, an integrated 7-channel synchronous logic analyzer that overcomes 2-channel lab oscilloscope limits, and a structured 4-step guided pedagogical progression.

## Operating Context

- Used in university computer labs (often 1366x768 resolution monitors), student personal laptops, and lecture hall projectors.
- Sessions span 2-hour laboratory practicals, lab report preparation, and viva/exam defense.
- Needs high visual legibility, zero distracting animations, and glare-free contrast for long technical sessions.

## Capabilities and Constraints

- Pure client-side simulation engine (HTML5 Canvas 2D + SVG Matrix transformations + Vanilla ES6+) maintaining 60 FPS with zero server calculation latency.
- Symmetrical two-track curriculum: Track 1 (Combinational Logic) and Track 2 (Sequential Logic across the 6 Essential Pillars).
- Strict 4-Step Guided Flow: [Theory & Foundations] -> [Schematic Blueprint] -> [Simulation Workbench] -> [Practical Use & Silicon].
- Integrated 7-Channel Digital Logic Analyzer with circular FIFO ring buffer telemetry.
- FastAPI Python backend with dual-engine persistence: SQLite for local offline development, Neon Serverless PostgreSQL for production cloud synchronization.

## Brand Commitments

- Name: ADE Made Easy
- Tagline: "Master Analog & Digital Electronics from Concept to Silicon"
- Aesthetic: Technical engineering notebook and darkroom test-bench instrument (inspired by KiCad, Tektronix, Linear, and Tinkercad) rather than generic corporate SaaS.

## Product Principles

1. Physical Domain Realism: DIP IC pinouts, power rails, switch debouncing, and true timing diagrams outrank abstract gate icons.
2. Zero-Friction Web Delivery: No heavy desktop installs, zero framework overhead, and sub-millisecond solver evaluation.
3. Scaffolding Before Sandbox: Never drop students into an unguided blank canvas without mathematical theory and ANSI vector schematics.
4. Deep Observability: Real-time multi-channel digital telemetry so time-domain behaviors (clock division, race conditions) are visible at a glance.

## Accessibility & Inclusion

- WCAG AA contrast compliance (minimum 4.5:1 for body and data text, 3:1 for large display headers).
- Strict 11px minimum text floor for all functional labels, pin identifiers, and telemetry readouts.
- High-contrast visual wire tracing and clear logic state indicators (0V vs 5V).
