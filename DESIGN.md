---
name: ADE Made Easy
description: "Master Analog & Digital Electronics from Concept to Silicon"
colors:
  obsidian-base: "#0f1115"
  obsidian-surface: "#161920"
  obsidian-card: "#1a1d24"
  obsidian-card-hover: "#222630"
  border-subtle: "rgba(255, 255, 255, 0.08)"
  paper: "#faf8f5"
  paper-card: "#ffffff"
  paper-subtle: "#f8fafc"
  paper-muted: "#f1f5f9"
  line-technical: "#334155"
  line-slate: "#cbd5e1"
  ink: "#0f172a"
  muted: "#64748b"
  text-secondary: "#94a3b8"
  text-dim: "#475569"
  slate-blue: "#3b82f6"
  slate-blue-dark: "#2563eb"
  terracotta: "#c2410c"
  terracotta-dark: "#9a3412"
  accent-gold: "#f59e0b"
  accent-amber: "#d97706"
  accent-amber-dark: "#b45309"
  accent-mint: "#10b981"
  accent-mint-dark: "#047857"
  scope-bg: "#090d16"
  scope-grid: "#162032"
  scope-border: "#1b2942"
  scope-trace-clk: "#e9bd4f"
  scope-trace-in1: "#38bdf8"
  scope-trace-in2: "#a855f7"
  scope-trace-q0: "#10b981"
  scope-trace-q1: "#34d399"
  scope-trace-q2: "#06b6d4"
  scope-trace-q3: "#6366f1"
  wire-low: "#0a8c2f"
  wire-high: "#00e650"
  wire-selected: "#f59e0b"
typography:
  display:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.2
  headline:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  subtext:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
  mono:
    fontFamily: "'DM Mono', monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  mono-sm:
    fontFamily: "'DM Mono', monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
---

## Overview

ADE Made Easy combines an **Editorial Dark Mode** shell (obsidian, fine hairline dividers, technical typography) with an authentic **KiCad-style Engineering Workbench** (parchment dot grid, true DIP IC pinout geometry, and oscilloscope phosphor telemetry). It strictly avoids generic AI-slop tropes: no neon gradients, no thick side-tab stripes, no tiny unreadable 9px labels, and no card-in-card nesting.

## Colors

- **Editorial Obsidian Theme Base**: `#0f1115` (Deep neutral obsidian for shell, headers, and toolbars), `#161920` (Surfaces), `#1a1d24` (Cards).
- **Hairline Dividers**: `rgba(255, 255, 255, 0.08)` for dark mode; `1px solid #e2e8f0` for light documents.
- **Track Signatures (Restrained & Purposeful)**:
  - **Combinational Logic**: Slate-Blue `#3b82f6` with soft tinted badges (`rgba(59, 130, 246, 0.10)`).
  - **Sequential Logic**: Terracotta / Burnt Orange `#c2410c` with soft tinted badges (`rgba(194, 65, 12, 0.10)`).
- **Workbench Canvas**: Warm parchment off-white `#faf8f5` with `#ded8cb` dotted grid points ($20\text{px} \times 20\text{px}$).
- **Logic Analyzer Scope**: Deep darkroom `#090d16` with `#162032` timebase grid lines.
- **Signal High/Low Physics**:
  - Logic 0 (Ground / Low): Solid `#0a8c2f` (wire) / `#0f172a` (chassis).
  - Logic 1 (VCC / High): Vivid phosphor `#00e650` with subtle glow.

## Typography

- **Primary UI / Display**: `Manrope`, sans-serif. High x-height, clear letterforms, calibrated for dense engineering interfaces.
- **Technical & Telemetry Data**: `'DM Mono'`, monospace. Used for all IC pin numbers, bus bit labels (`Q0`..`Q3`), truth tables, and hexadecimal readouts.
- **Legibility Floor**: Functional UI text must never fall below **11px** (WCAG AA compliant). Non-interactive legal or watermark smallprint has a hard floor of 10px.

## Layout

- **Symmetrical 2-Track System**: Combinational Track and Sequential Track share identical 4-part sub-navigation: `[Theory] -> [Schematic] -> [Simulation Workbench] -> [Practical Use]`.
- **Workbench 3-Zone Workspace**:
  1. **Top Control Bar**: Mode switcher, clock frequency generator, step-pulse trigger, and scope drawer toggle.
  2. **Central Infinite Canvas**: Scalable SVG breadboard surface with affine pan/zoom matrix transformations.
  3. **Bottom Telemetry Dock**: Collapsible 7-channel digital logic analyzer with immediate-mode 2D Canvas rendering.

## Elevation & Depth

- **Tonal Layering over Blur Shadows**: Depth is established via surface luminance shifts (`#0f1115` to `#161920` to `#1a1d24`) and crisp 1px hairline borders (`rgba(255, 255, 255, 0.08)`), eliminating cartoonish drop-shadow blur.
- **Hardware Bezel Relief**: Toolbars and dock headers use subtle top borders (`2px solid #d97706` for scope) mimicking physical laboratory test equipment.

## Shapes

- **Structural Precision**: `rounded-md` (6px to 8px) for cards, dialog windows, and palettes.
- **Technical Status Pills**: `rounded-full` (9999px) for track badges and clock indicator LEDs.
- **Crisp IC Outlines**: DIP packages maintain precise right-angled geometry ($90^\circ$ corners) with standard $0.1$-inch ($2.54\text{mm}$) pin pitches.

## Components

- **Global Navigation Bar**: Single obsidian bar (`#0f1115`) housing brand badge, track segmented pill switch, and clean user profile trigger.
- **IC Component Palette**: Left-docked sliding drawer containing draggable DIP ICs and electronic peripherals.
- **7-Channel Logic Analyzer**: Immediate-mode HTML5 Canvas running at 60 FPS with 140-sample circular FIFO telemetry.
- **Interactive Probes**: Logic probes showing live binary voltage state (`1` / `0`) with high-contrast text.

## Do's and Don'ts

- **DO** use physical domain colors (amber, phosphor green, terracotta, slate-blue).
- **DO** maintain at least 4.5:1 contrast ratio across all text and probe readouts.
- **DO** keep breadboard background warm and glare-free (`#faf8f5`) to prevent eye fatigue.
- **DON'T** use thick colored borders on one side of a card (`border-left: 3.5px` AI side-tabs).
- **DON'T** use floating eyebrow chip badges above oversized h1 titles.
- **DON'T** set interactive labels below 11px.
- **DON'T** use purple-to-blue neon SaaS gradients.
