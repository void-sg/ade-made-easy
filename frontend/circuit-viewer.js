/**
 * KiCad-Style Live Schematic Viewer Engine
 * Unified renderer for:
 * 1. 8:1 Multiplexer (IC 74LS153 Composite)
 * 2. 4:1 Multiplexer (IC 74LS153 Single Section)
 * 3. 4-Bit Magnitude Comparator (IC 74LS85)
 * 4. 4-Bit Adder / Subtractor (IC 74LS83 + 74LS86)
 */

(function () {
  // API_BASE is loaded from config.js
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Application State
  const state = {
    activeCircuit: "mux_8to1",
    apiOnline: false,

    // Circuit 1: 8:1 MUX
    mux8: {
      select: "000",
      inputs: [0, 0, 0, 0, 0, 0, 0, 0],
      strobe: 0,
    },

    // Circuit 2: 4:1 MUX
    mux4: {
      select: "00",
      inputs: [0, 0, 0, 0],
      strobe: 0,
    },

    // Circuit 3: 4-Bit Comparator
    comp4: {
      a: "0000",
      b: "0000",
      cascade_gt: 0,
      cascade_lt: 0,
      cascade_eq: 1,
    },

    // Circuit 4: 4-Bit Adder/Subtractor
    addSub4: {
      a: "0000",
      b: "0000",
      mode: 0, // 0 = ADD, 1 = SUB
      cin: null,
    },

    // Circuit 5: Decade / BCD Counter (IC 74LS90)
    counter90: {
      qa: 0,
      qb: 0,
      qc: 0,
      qd: 0,
      r0_1: 0,
      r0_2: 0,
      r9_1: 0,
      r9_2: 0,
      cascade: 1, // 1 = Jumper QA (Pin 12) connected to CP1 (Pin 1)
      autoRunning: false,
      autoTimer: null,
      mode: "mod10", // "mod10", "mod6", "mod5", "mod2"
    },

    // Circuit 6: 4-Bit Binary Counter (IC 74LS93)
    counter93: {
      qa: 0,
      qb: 0,
      qc: 0,
      qd: 0,
      r0_1: 0,
      r0_2: 0,
      cascade: 1, // 1 = Jumper QA (Pin 12) connected to CP1 (Pin 1)
      autoRunning: false,
      autoTimer: null,
      mode: "mod16", // "mod16", "mod12", "mod8", "mod2"
    },

    // Circuit 7: Dual D Flip-Flop (IC 74LS74)
    flipflop74: {
      clk: 0,
      d: 0,
      pr_n: 1, // Active-Low Preset (1=inactive)
      clr_n: 1, // Active-Low Clear (1=inactive)
      q: 0,
      q_bar: 1,
    },

    // Circuit 8: Dual Master-Slave JK Flip-Flop (IC 74LS76)
    flipflop76: {
      clk: 0,
      j: 0,
      k: 0,
      pr_n: 1,
      clr_n: 1,
      q: 0,
      q_bar: 1,
    },

    // Circuit 9: 4-Bit Universal Shift Register (IC 74LS194)
    shiftreg194: {
      s1: 0,
      s0: 0, // 00=Hold, 01=Shift Right, 10=Shift Left, 11=Parallel Load
      clr_n: 1,
      sr_in: 0,
      sl_in: 0,
      d: [0, 0, 0, 0], // A, B, C, D parallel inputs
      q: [0, 0, 0, 0], // QA, QB, QC, QD outputs
    },

    // Pan & Zoom
    viewBox: { x: 0, y: 0, w: 1200, h: 740 },
    initialViewBox: { x: 0, y: 0, w: 1200, h: 740 },
    isPanning: false,
    panStart: { x: 0, y: 0 },
  };

  // DOM Elements
  let svgRoot = null;
  let zoomGroup = null;
  let frameLayer = null;
  let wireLayer = null;
  let junctionLayer = null;
  let componentLayer = null;

  document.addEventListener("DOMContentLoaded", () => {
    initDOM();
    initPanZoom();
    bindEvents();
    const urlParams = new URLSearchParams(window.location.search);
    const cParam = urlParams.get("circuit");
    const valid = [
      "mux_8to1", "mux_4to1", "comparator_4bit", "adder_subtractor_4bit",
      "counter_74ls90", "counter_74ls93", "flipflop_74ls74", "flipflop_74ls76", "shiftreg_74ls194"
    ];
    const activeTab = document.querySelector(".circuit-tab-btn.active") || document.querySelector(".circuit-tab-btn");
    const fallback = document.body.classList.contains("track-seq") ? "counter_74ls90" : "mux_8to1";
    const initialCircuit = (cParam && valid.includes(cParam)) ? cParam : (activeTab ? activeTab.getAttribute("data-circuit") : fallback);
    switchCircuit(initialCircuit);
  });

  function initDOM() {
    svgRoot = document.getElementById("schematic-svg");
    if (!svgRoot) return;

    svgRoot.innerHTML = "";
    zoomGroup = createSVGElement("g", { id: "zoom-group" });
    svgRoot.appendChild(zoomGroup);

    frameLayer = createSVGElement("g", { id: "frame-layer" });
    wireLayer = createSVGElement("g", { id: "wire-layer" });
    junctionLayer = createSVGElement("g", { id: "junction-layer" });
    componentLayer = createSVGElement("g", { id: "component-layer" });

    zoomGroup.appendChild(frameLayer);
    zoomGroup.appendChild(wireLayer);
    zoomGroup.appendChild(junctionLayer);
    zoomGroup.appendChild(componentLayer);

    // Zoom buttons
    document.getElementById("btn-zoom-in")?.addEventListener("click", () => zoom(0.8));
    document.getElementById("btn-zoom-out")?.addEventListener("click", () => zoom(1.25));
    document.getElementById("btn-zoom-reset")?.addEventListener("click", () => resetZoom());
  }

  function bindEvents() {
    // Circuit selector tabs
    document.querySelectorAll(".circuit-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cId = btn.getAttribute("data-circuit");
        switchCircuit(cId);
      });
    });

    // 8:1 MUX bit buttons
    document.querySelectorAll("#deck-mux8 .bit-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.getAttribute("data-type");
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (type === "select") {
          const sArr = state.mux8.select.split("");
          sArr[idx] = sArr[idx] === "1" ? "0" : "1";
          state.mux8.select = sArr.join("");
        } else if (type === "input") {
          state.mux8.inputs[idx] = state.mux8.inputs[idx] === 1 ? 0 : 1;
        } else if (type === "strobe") {
          state.mux8.strobe = state.mux8.strobe === 0 ? 1 : 0;
        }
        updateCircuit();
      });
    });

    // 4:1 MUX bit buttons
    document.querySelectorAll("#deck-mux4 .bit-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.getAttribute("data-type");
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (type === "select") {
          const sArr = state.mux4.select.split("");
          sArr[idx] = sArr[idx] === "1" ? "0" : "1";
          state.mux4.select = sArr.join("");
        } else if (type === "input") {
          state.mux4.inputs[idx] = state.mux4.inputs[idx] === 1 ? 0 : 1;
        } else if (type === "strobe") {
          state.mux4.strobe = state.mux4.strobe === 0 ? 1 : 0;
        }
        updateCircuit();
      });
    });

    // 4-bit Comparator bit buttons
    document.querySelectorAll("#deck-comp4 .bit-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.getAttribute("data-group");
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (group === "a") {
          const aArr = state.comp4.a.split("");
          aArr[idx] = aArr[idx] === "1" ? "0" : "1";
          state.comp4.a = aArr.join("");
        } else if (group === "b") {
          const bArr = state.comp4.b.split("");
          bArr[idx] = bArr[idx] === "1" ? "0" : "1";
          state.comp4.b = bArr.join("");
        } else if (group === "cascade") {
          const casType = btn.getAttribute("data-cas");
          if (casType === "gt") state.comp4.cascade_gt = 1 - state.comp4.cascade_gt;
          if (casType === "eq") state.comp4.cascade_eq = 1 - state.comp4.cascade_eq;
          if (casType === "lt") state.comp4.cascade_lt = 1 - state.comp4.cascade_lt;
        }
        updateCircuit();
      });
    });

    // 4-bit Adder/Subtractor bit buttons
    document.querySelectorAll("#deck-addsub .bit-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.getAttribute("data-group");
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (group === "a") {
          const aArr = state.addSub4.a.split("");
          aArr[idx] = aArr[idx] === "1" ? "0" : "1";
          state.addSub4.a = aArr.join("");
        } else if (group === "b") {
          const bArr = state.addSub4.b.split("");
          bArr[idx] = bArr[idx] === "1" ? "0" : "1";
          state.addSub4.b = bArr.join("");
        } else if (group === "mode") {
          state.addSub4.mode = 1 - state.addSub4.mode;
        }
        updateCircuit();
      });
    });

    // Mode buttons inside adder/subtractor deck
    document.getElementById("btn-sub-add")?.addEventListener("click", () => {
      state.addSub4.mode = 0;
      updateCircuit();
    });
    document.getElementById("btn-sub-sub")?.addEventListener("click", () => {
      state.addSub4.mode = 1;
      updateCircuit();
    });

    // 74LS90 Decade Counter Controls
    document.getElementById("btn-clk-step-90")?.addEventListener("click", () => {
      stepCounter90("A");
    });
    document.getElementById("btn-clk-b-step-90")?.addEventListener("click", () => {
      stepCounter90("B");
    });
    document.getElementById("btn-clk-auto-90")?.addEventListener("click", () => {
      if (state.counter90.autoRunning) {
        clearInterval(state.counter90.autoTimer);
        state.counter90.autoRunning = false;
      } else {
        state.counter90.autoRunning = true;
        state.counter90.autoTimer = setInterval(() => {
          stepCounter90(state.counter90.mode === "mod5" ? "B" : "A");
        }, 1000);
      }
      updateCircuit();
    });
    document.getElementById("btn-r0-1-90")?.addEventListener("click", () => {
      state.counter90.r0_1 = 1 - state.counter90.r0_1;
      if (state.counter90.r0_1 === 1 && state.counter90.r0_2 === 1) {
        state.counter90.qa = 0; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 0;
      }
      updateCircuit();
    });
    document.getElementById("btn-r0-2-90")?.addEventListener("click", () => {
      state.counter90.r0_2 = 1 - state.counter90.r0_2;
      if (state.counter90.r0_1 === 1 && state.counter90.r0_2 === 1) {
        state.counter90.qa = 0; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 0;
      }
      updateCircuit();
    });
    document.getElementById("btn-r9-1-90")?.addEventListener("click", () => {
      state.counter90.r9_1 = 1 - state.counter90.r9_1;
      if (state.counter90.r9_1 === 1 && state.counter90.r9_2 === 1) {
        state.counter90.qa = 1; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 1;
      }
      updateCircuit();
    });
    document.getElementById("btn-r9-2-90")?.addEventListener("click", () => {
      state.counter90.r9_2 = 1 - state.counter90.r9_2;
      if (state.counter90.r9_1 === 1 && state.counter90.r9_2 === 1) {
        state.counter90.qa = 1; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 1;
      }
      updateCircuit();
    });
    document.getElementById("btn-cascade-90")?.addEventListener("click", () => {
      state.counter90.cascade = 1 - state.counter90.cascade;
      updateCircuit();
    });

    // 74LS93 4-Bit Binary Counter Controls
    document.getElementById("btn-clk-step-93")?.addEventListener("click", () => {
      stepCounter93("A");
    });
    document.getElementById("btn-clk-b-step-93")?.addEventListener("click", () => {
      stepCounter93("B");
    });
    document.getElementById("btn-clk-auto-93")?.addEventListener("click", () => {
      if (state.counter93.autoRunning) {
        clearInterval(state.counter93.autoTimer);
        state.counter93.autoRunning = false;
      } else {
        state.counter93.autoRunning = true;
        state.counter93.autoTimer = setInterval(() => {
          stepCounter93(state.counter93.mode === "mod8" ? "B" : "A");
        }, 1000);
      }
      updateCircuit();
    });
    document.getElementById("btn-r0-1-93")?.addEventListener("click", () => {
      state.counter93.r0_1 = 1 - state.counter93.r0_1;
      if (state.counter93.r0_1 === 1 && state.counter93.r0_2 === 1) {
        state.counter93.qa = 0; state.counter93.qb = 0; state.counter93.qc = 0; state.counter93.qd = 0;
      }
      updateCircuit();
    });
    document.getElementById("btn-r0-2-93")?.addEventListener("click", () => {
      state.counter93.r0_2 = 1 - state.counter93.r0_2;
      if (state.counter93.r0_1 === 1 && state.counter93.r0_2 === 1) {
        state.counter93.qa = 0; state.counter93.qb = 0; state.counter93.qc = 0; state.counter93.qd = 0;
      }
      updateCircuit();
    });
    document.getElementById("btn-cascade-93")?.addEventListener("click", () => {
      state.counter93.cascade = 1 - state.counter93.cascade;
      updateCircuit();
    });

    // 74LS74 D-Type Flip-Flop Controls
    document.getElementById("btn-clk-pulse-74")?.addEventListener("click", () => {
      state.flipflop74.clk = 1;
      evalFF74(true);
      updateCircuit();
      setTimeout(() => {
        state.flipflop74.clk = 0;
        updateCircuit();
      }, 200);
    });
    document.getElementById("btn-d-74")?.addEventListener("click", () => {
      state.flipflop74.d = 1 - state.flipflop74.d;
      evalFF74(false);
      updateCircuit();
    });
    document.getElementById("btn-pr-74")?.addEventListener("click", () => {
      state.flipflop74.pr_n = 1 - state.flipflop74.pr_n;
      evalFF74(false);
      updateCircuit();
    });
    document.getElementById("btn-clr-74")?.addEventListener("click", () => {
      state.flipflop74.clr_n = 1 - state.flipflop74.clr_n;
      evalFF74(false);
      updateCircuit();
    });

    // 74LS76 Master-Slave JK Flip-Flop Controls
    document.getElementById("btn-clk-pulse-76")?.addEventListener("click", () => {
      state.flipflop76.clk = 1;
      updateCircuit();
      setTimeout(() => {
        state.flipflop76.clk = 0;
        evalFF76(true);
        updateCircuit();
      }, 200);
    });
    document.getElementById("btn-j-76")?.addEventListener("click", () => {
      state.flipflop76.j = 1 - state.flipflop76.j;
      evalFF76(false);
      updateCircuit();
    });
    document.getElementById("btn-k-76")?.addEventListener("click", () => {
      state.flipflop76.k = 1 - state.flipflop76.k;
      evalFF76(false);
      updateCircuit();
    });
    document.getElementById("btn-pr-76")?.addEventListener("click", () => {
      state.flipflop76.pr_n = 1 - state.flipflop76.pr_n;
      evalFF76(false);
      updateCircuit();
    });
    document.getElementById("btn-clr-76")?.addEventListener("click", () => {
      state.flipflop76.clr_n = 1 - state.flipflop76.clr_n;
      evalFF76(false);
      updateCircuit();
    });

    // 74LS194 4-Bit Universal Shift Register Controls
    document.getElementById("btn-clk-pulse-194")?.addEventListener("click", () => {
      state.shiftreg194.clk = 1;
      evalSR194(true);
      updateCircuit();
      setTimeout(() => {
        state.shiftreg194.clk = 0;
        updateCircuit();
      }, 200);
    });
    document.getElementById("btn-s1-194")?.addEventListener("click", () => {
      state.shiftreg194.s1 = 1 - state.shiftreg194.s1;
      updateCircuit();
    });
    document.getElementById("btn-s0-194")?.addEventListener("click", () => {
      state.shiftreg194.s0 = 1 - state.shiftreg194.s0;
      updateCircuit();
    });
    document.getElementById("btn-srin-194")?.addEventListener("click", () => {
      state.shiftreg194.sr_in = 1 - state.shiftreg194.sr_in;
      updateCircuit();
    });
    document.getElementById("btn-slin-194")?.addEventListener("click", () => {
      state.shiftreg194.sl_in = 1 - state.shiftreg194.sl_in;
      updateCircuit();
    });
    document.getElementById("btn-clr-194")?.addEventListener("click", () => {
      state.shiftreg194.clr_n = 1 - state.shiftreg194.clr_n;
      evalSR194(false);
      updateCircuit();
    });
    document.querySelectorAll("#deck-sr194 [data-parallel-in]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-parallel-in"), 10);
        state.shiftreg194.d[idx] = 1 - state.shiftreg194.d[idx];
        updateCircuit();
      });
    });

    // Presets
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = btn.getAttribute("data-preset");
        applyPreset(preset);
      });
    });
  }

  function evalFF74(edge = false) {
    const ff = state.flipflop74;
    if (ff.pr_n === 0 && ff.clr_n === 0) {
      ff.q = 1; ff.q_bar = 1;
    } else if (ff.pr_n === 0) {
      ff.q = 1; ff.q_bar = 0;
    } else if (ff.clr_n === 0) {
      ff.q = 0; ff.q_bar = 1;
    } else if (edge) {
      ff.q = ff.d;
      ff.q_bar = 1 - ff.d;
    }
  }

  function evalFF76(edge = false) {
    const ff = state.flipflop76;
    if (ff.pr_n === 0 && ff.clr_n === 0) {
      ff.q = 1; ff.q_bar = 1;
    } else if (ff.pr_n === 0) {
      ff.q = 1; ff.q_bar = 0;
    } else if (ff.clr_n === 0) {
      ff.q = 0; ff.q_bar = 1;
    } else if (edge) {
      if (ff.j === 0 && ff.k === 0) {
        // Hold
      } else if (ff.j === 0 && ff.k === 1) {
        ff.q = 0; ff.q_bar = 1;
      } else if (ff.j === 1 && ff.k === 0) {
        ff.q = 1; ff.q_bar = 0;
      } else if (ff.j === 1 && ff.k === 1) {
        ff.q = 1 - ff.q;
        ff.q_bar = 1 - ff.q;
      }
    }
  }

  function evalSR194(edge = false) {
    const sr = state.shiftreg194;
    if (sr.clr_n === 0) {
      sr.q = [0, 0, 0, 0];
    } else if (edge) {
      const mode = `${sr.s1}${sr.s0}`;
      if (mode === "00") {
        // Hold
      } else if (mode === "01") {
        sr.q = [sr.sr_in, sr.q[0], sr.q[1], sr.q[2]];
      } else if (mode === "10") {
        sr.q = [sr.q[1], sr.q[2], sr.q[3], sr.sl_in];
      } else if (mode === "11") {
        sr.q = [...sr.d];
      }
    }
  }

  function advanceDiv5_90() {
    const qb = state.counter90.qb;
    const qc = state.counter90.qc;
    const qd = state.counter90.qd;
    // BCD ÷5 counter states: (QD, QC, QB) -> 000, 001, 010, 011, 100
    if (qd === 0 && qc === 0 && qb === 0) {
      state.counter90.qb = 1; state.counter90.qc = 0; state.counter90.qd = 0;
    } else if (qd === 0 && qc === 0 && qb === 1) {
      state.counter90.qb = 0; state.counter90.qc = 1; state.counter90.qd = 0;
    } else if (qd === 0 && qc === 1 && qb === 0) {
      state.counter90.qb = 1; state.counter90.qc = 1; state.counter90.qd = 0;
    } else if (qd === 0 && qc === 1 && qb === 1) {
      state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 1;
    } else {
      state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 0;
    }
  }

  function stepCounter90(clkSource) {
    const r0 = state.counter90.r0_1 === 1 && state.counter90.r0_2 === 1;
    const r9 = state.counter90.r9_1 === 1 && state.counter90.r9_2 === 1;

    if (r9) {
      state.counter90.qa = 1; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 1;
      updateCircuit();
      return;
    }
    if (r0) {
      state.counter90.qa = 0; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 0;
      updateCircuit();
      return;
    }

    if (clkSource === "A") {
      const prevQa = state.counter90.qa;
      state.counter90.qa = 1 - prevQa;
      if (state.counter90.cascade && prevQa === 1 && state.counter90.qa === 0) {
        // High-to-Low falling edge on QA excites CP1
        advanceDiv5_90();
      }
    } else if (clkSource === "B") {
      advanceDiv5_90();
    }

    // Mod-6 check: QC·QB = 1 (Binary 6: 0110)
    if (state.counter90.mode === "mod6") {
      if (state.counter90.qc === 1 && state.counter90.qb === 1) {
        state.counter90.qa = 0; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 0;
      }
    }

    updateCircuit();
  }

  function advanceDiv8_93() {
    const qb = state.counter93.qb;
    const qc = state.counter93.qc;
    const qd = state.counter93.qd;
    const curVal = (qd << 2) | (qc << 1) | qb;
    const nextVal = (curVal + 1) % 8;
    state.counter93.qb = nextVal & 1;
    state.counter93.qc = (nextVal >> 1) & 1;
    state.counter93.qd = (nextVal >> 2) & 1;
  }

  function stepCounter93(clkSource) {
    const r0 = state.counter93.r0_1 === 1 && state.counter93.r0_2 === 1;
    if (r0) {
      state.counter93.qa = 0; state.counter93.qb = 0; state.counter93.qc = 0; state.counter93.qd = 0;
      updateCircuit();
      return;
    }

    if (clkSource === "A") {
      const prevQa = state.counter93.qa;
      state.counter93.qa = 1 - prevQa;
      if (state.counter93.cascade && prevQa === 1 && state.counter93.qa === 0) {
        // High-to-Low falling edge on QA excites CP1
        advanceDiv8_93();
      }
    } else if (clkSource === "B") {
      advanceDiv8_93();
    }

    // Mod-12 check: QD·QC = 1 (Binary 12: 1100)
    if (state.counter93.mode === "mod12") {
      if (state.counter93.qd === 1 && state.counter93.qc === 1) {
        state.counter93.qa = 0; state.counter93.qb = 0; state.counter93.qc = 0; state.counter93.qd = 0;
      }
    }

    updateCircuit();
  }

  function switchCircuit(circuitId) {
    if (state.activeCircuit !== circuitId) {
      if (state.counter90.autoRunning) {
        clearInterval(state.counter90.autoTimer);
        state.counter90.autoRunning = false;
      }
      if (state.counter93.autoRunning) {
        clearInterval(state.counter93.autoTimer);
        state.counter93.autoRunning = false;
      }
    }

    state.activeCircuit = circuitId;

    // Update tabs UI
    document.querySelectorAll(".circuit-tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-circuit") === circuitId);
    });

    // Toggle control decks
    document.querySelectorAll(".circuit-deck-section").forEach((deck) => {
      deck.style.display = deck.id === `deck-${getDeckSuffix(circuitId)}` ? "block" : "none";
    });

    // Toggle flow explainer cards
    document.querySelectorAll(".circuit-flow-card").forEach((card) => {
      card.style.display = card.id === `flow-${getDeckSuffix(circuitId)}` ? "block" : "none";
    });

    updateCircuit();
  }

  function getDeckSuffix(circuitId) {
    if (circuitId === "mux_8to1") return "mux8";
    if (circuitId === "mux_4to1") return "mux4";
    if (circuitId === "comparator_4bit") return "comp4";
    if (circuitId === "adder_subtractor_4bit") return "addsub";
    if (circuitId === "counter_74ls90") return "counter90";
    if (circuitId === "counter_74ls93") return "counter93";
    if (circuitId === "flipflop_74ls74") return "ff74";
    if (circuitId === "flipflop_74ls76") return "ff76";
    if (circuitId === "shiftreg_74ls194") return "sr194";
    return "mux8";
  }

  function applyPreset(preset) {
    const c = state.activeCircuit;
    if (c === "mux_8to1") {
      if (preset === "d3-active") { state.mux8.select = "011"; state.mux8.inputs = [0,0,0,1,0,0,0,0]; state.mux8.strobe = 0; }
      else if (preset === "d6-active") { state.mux8.select = "110"; state.mux8.inputs = [0,0,0,0,0,0,1,0]; state.mux8.strobe = 0; }
      else if (preset === "all-ones") { state.mux8.inputs = [1,1,1,1,1,1,1,1]; }
      else if (preset === "strobe-disabled") { state.mux8.strobe = 1; }
      else if (preset === "reset") { state.mux8.select = "000"; state.mux8.inputs = [0,0,0,0,0,0,0,0]; state.mux8.strobe = 0; }
    } else if (c === "mux_4to1") {
      if (preset === "d2-active") { state.mux4.select = "10"; state.mux4.inputs = [0,0,1,0]; state.mux4.strobe = 0; }
      else if (preset === "d3-active") { state.mux4.select = "11"; state.mux4.inputs = [0,0,0,1]; state.mux4.strobe = 0; }
      else if (preset === "all-ones") { state.mux4.inputs = [1,1,1,1]; }
      else if (preset === "strobe-disabled") { state.mux4.strobe = 1; }
      else if (preset === "reset") { state.mux4.select = "00"; state.mux4.inputs = [0,0,0,0]; state.mux4.strobe = 0; }
    } else if (c === "comparator_4bit") {
      if (preset === "a-gt-b") { state.comp4.a = "1010"; state.comp4.b = "0101"; state.comp4.cascade_gt = 0; state.comp4.cascade_lt = 0; state.comp4.cascade_eq = 1; }
      else if (preset === "a-lt-b") { state.comp4.a = "0011"; state.comp4.b = "1100"; state.comp4.cascade_gt = 0; state.comp4.cascade_lt = 0; state.comp4.cascade_eq = 1; }
      else if (preset === "a-eq-b") { state.comp4.a = "1001"; state.comp4.b = "1001"; state.comp4.cascade_gt = 0; state.comp4.cascade_lt = 0; state.comp4.cascade_eq = 1; }
      else if (preset === "cas-gt") { state.comp4.a = "0110"; state.comp4.b = "0110"; state.comp4.cascade_gt = 1; state.comp4.cascade_lt = 0; state.comp4.cascade_eq = 0; }
      else if (preset === "reset") { state.comp4.a = "0000"; state.comp4.b = "0000"; state.comp4.cascade_gt = 0; state.comp4.cascade_lt = 0; state.comp4.cascade_eq = 1; }
    } else if (c === "adder_subtractor_4bit") {
      if (preset === "add-basic") { state.addSub4.mode = 0; state.addSub4.a = "0101"; state.addSub4.b = "0011"; }
      else if (preset === "add-carry") { state.addSub4.mode = 0; state.addSub4.a = "1100"; state.addSub4.b = "0110"; }
      else if (preset === "sub-pos") { state.addSub4.mode = 1; state.addSub4.a = "1001"; state.addSub4.b = "0100"; }
      else if (preset === "sub-borrow") { state.addSub4.mode = 1; state.addSub4.a = "0011"; state.addSub4.b = "0111"; }
      else if (preset === "reset") { state.addSub4.mode = 0; state.addSub4.a = "0000"; state.addSub4.b = "0000"; }
    } else if (c === "counter_74ls90") {
      if (preset === "c90-mod10") {
        state.counter90.mode = "mod10"; state.counter90.cascade = 1;
        state.counter90.r0_1 = 0; state.counter90.r0_2 = 0;
        state.counter90.r9_1 = 0; state.counter90.r9_2 = 0;
      } else if (preset === "c90-mod6") {
        state.counter90.mode = "mod6"; state.counter90.cascade = 1;
        state.counter90.r0_1 = 0; state.counter90.r0_2 = 0;
        state.counter90.r9_1 = 0; state.counter90.r9_2 = 0;
        state.counter90.qa = 0; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 0;
      } else if (preset === "c90-mod5") {
        state.counter90.mode = "mod5"; state.counter90.cascade = 0;
        state.counter90.r0_1 = 0; state.counter90.r0_2 = 0;
        state.counter90.r9_1 = 0; state.counter90.r9_2 = 0;
        state.counter90.qa = 0; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 0;
      } else if (preset === "c90-mod2") {
        state.counter90.mode = "mod2"; state.counter90.cascade = 0;
        state.counter90.r0_1 = 0; state.counter90.r0_2 = 0;
        state.counter90.r9_1 = 0; state.counter90.r9_2 = 0;
        state.counter90.qa = 0; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 0;
      } else if (preset === "c90-force-r0") {
        state.counter90.r0_1 = 1; state.counter90.r0_2 = 1;
        state.counter90.qa = 0; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 0;
      } else if (preset === "c90-force-r9") {
        state.counter90.r9_1 = 1; state.counter90.r9_2 = 1;
        state.counter90.qa = 1; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 1;
      } else if (preset === "c90-reset-count") {
        state.counter90.qa = 0; state.counter90.qb = 0; state.counter90.qc = 0; state.counter90.qd = 0;
      }
    } else if (c === "counter_74ls93") {
      if (preset === "c93-mod16") {
        state.counter93.mode = "mod16"; state.counter93.cascade = 1;
        state.counter93.r0_1 = 0; state.counter93.r0_2 = 0;
      } else if (preset === "c93-mod12") {
        state.counter93.mode = "mod12"; state.counter93.cascade = 1;
        state.counter93.r0_1 = 0; state.counter93.r0_2 = 0;
        state.counter93.qa = 0; state.counter93.qb = 0; state.counter93.qc = 0; state.counter93.qd = 0;
      } else if (preset === "c93-mod8") {
        state.counter93.mode = "mod8"; state.counter93.cascade = 0;
        state.counter93.r0_1 = 0; state.counter93.r0_2 = 0;
        state.counter93.qa = 0; state.counter93.qb = 0; state.counter93.qc = 0; state.counter93.qd = 0;
      } else if (preset === "c93-mod2") {
        state.counter93.mode = "mod2"; state.counter93.cascade = 0;
        state.counter93.r0_1 = 0; state.counter93.r0_2 = 0;
        state.counter93.qa = 0; state.counter93.qb = 0; state.counter93.qc = 0; state.counter93.qd = 0;
      } else if (preset === "c93-force-r0") {
        state.counter93.r0_1 = 1; state.counter93.r0_2 = 1;
        state.counter93.qa = 0; state.counter93.qb = 0; state.counter93.qc = 0; state.counter93.qd = 0;
      } else if (preset === "c93-reset-count") {
        state.counter93.qa = 0; state.counter93.qb = 0; state.counter93.qc = 0; state.counter93.qd = 0;
      }
    } else if (c === "flipflop_74ls74") {
      if (preset === "ff74-d-high") {
        state.flipflop74.d = 1; state.flipflop74.pr_n = 1; state.flipflop74.clr_n = 1;
      } else if (preset === "ff74-d-low") {
        state.flipflop74.d = 0; state.flipflop74.pr_n = 1; state.flipflop74.clr_n = 1;
      } else if (preset === "ff74-pr-assert") {
        state.flipflop74.pr_n = 0; state.flipflop74.clr_n = 1; evalFF74(false);
      } else if (preset === "ff74-clr-assert") {
        state.flipflop74.clr_n = 0; state.flipflop74.pr_n = 1; evalFF74(false);
      } else if (preset === "ff74-forbidden") {
        state.flipflop74.pr_n = 0; state.flipflop74.clr_n = 0; evalFF74(false);
      } else if (preset === "ff74-reset") {
        state.flipflop74.d = 0; state.flipflop74.pr_n = 1; state.flipflop74.clr_n = 1; state.flipflop74.q = 0; state.flipflop74.q_bar = 1;
      }
    } else if (c === "flipflop_74ls76") {
      if (preset === "ff76-toggle") {
        state.flipflop76.j = 1; state.flipflop76.k = 1; state.flipflop76.pr_n = 1; state.flipflop76.clr_n = 1;
      } else if (preset === "ff76-set") {
        state.flipflop76.j = 1; state.flipflop76.k = 0; state.flipflop76.pr_n = 1; state.flipflop76.clr_n = 1;
      } else if (preset === "ff76-reset") {
        state.flipflop76.j = 0; state.flipflop76.k = 1; state.flipflop76.pr_n = 1; state.flipflop76.clr_n = 1;
      } else if (preset === "ff76-hold") {
        state.flipflop76.j = 0; state.flipflop76.k = 0; state.flipflop76.pr_n = 1; state.flipflop76.clr_n = 1;
      } else if (preset === "ff76-pr-assert") {
        state.flipflop76.pr_n = 0; state.flipflop76.clr_n = 1; evalFF76(false);
      } else if (preset === "ff76-clr-assert") {
        state.flipflop76.clr_n = 0; state.flipflop76.pr_n = 1; evalFF76(false);
      } else if (preset === "ff76-reset-all") {
        state.flipflop76.j = 0; state.flipflop76.k = 0; state.flipflop76.pr_n = 1; state.flipflop76.clr_n = 1; state.flipflop76.q = 0; state.flipflop76.q_bar = 1;
      }
    } else if (c === "shiftreg_74ls194") {
      if (preset === "sr194-load-1010") {
        state.shiftreg194.s1 = 1; state.shiftreg194.s0 = 1; state.shiftreg194.d = [1, 0, 1, 0]; state.shiftreg194.clr_n = 1; evalSR194(true);
      } else if (preset === "sr194-shift-right") {
        state.shiftreg194.s1 = 0; state.shiftreg194.s0 = 1; state.shiftreg194.sr_in = 1; state.shiftreg194.clr_n = 1; evalSR194(true);
      } else if (preset === "sr194-shift-left") {
        state.shiftreg194.s1 = 1; state.shiftreg194.s0 = 0; state.shiftreg194.sl_in = 1; state.shiftreg194.clr_n = 1; evalSR194(true);
      } else if (preset === "sr194-hold") {
        state.shiftreg194.s1 = 0; state.shiftreg194.s0 = 0;
      } else if (preset === "sr194-clear") {
        state.shiftreg194.clr_n = 0; evalSR194(false); state.shiftreg194.clr_n = 1;
      }
    }
    updateCircuit();
  }

  // Fetch or simulate
  async function updateCircuit() {
    updateButtonStates();

    const c = state.activeCircuit;
    let url = "";

    if (c === "mux_8to1") {
      url = `${API_BASE}/circuit/mux-8to1?select=${state.mux8.select}&inputs=${state.mux8.inputs.join(",")}&strobe=${state.mux8.strobe}`;
    } else if (c === "mux_4to1") {
      url = `${API_BASE}/circuit/mux-4to1?select=${state.mux4.select}&inputs=${state.mux4.inputs.join(",")}&strobe=${state.mux4.strobe}`;
    } else if (c === "comparator_4bit") {
      url = `${API_BASE}/circuit/comparator-4bit?a=${state.comp4.a}&b=${state.comp4.b}&cascade_gt=${state.comp4.cascade_gt}&cascade_lt=${state.comp4.cascade_lt}&cascade_eq=${state.comp4.cascade_eq}`;
    } else if (c === "adder_subtractor_4bit") {
      url = `${API_BASE}/circuit/adder-subtractor-4bit?a=${state.addSub4.a}&b=${state.addSub4.b}&mode=${state.addSub4.mode}`;
    }

    let data = null;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(1200) });
      if (resp.ok) {
        data = await resp.json();
        setApiStatus(true);
      } else {
        throw new Error("API error " + resp.status);
      }
    } catch (e) {
      data = generateClientSideFallback(c);
      setApiStatus(false);
    }

    // Set canvas dimensions
    const cWidth = data.canvas?.width || 1200;
    const cHeight = data.canvas?.height || 740;
    state.initialViewBox = { x: 0, y: 0, w: cWidth, h: cHeight };
    state.viewBox = { ...state.initialViewBox };
    applyViewBox();

    // Render frame & grid
    drawKiCadFrameAndGrid(frameLayer, cWidth, cHeight, data.sheet_info || {});

    // Render wires, junctions, and components
    renderCircuit(data);
    renderInfoPanels(data);
  }

  function setApiStatus(online) {
    state.apiOnline = online;
    const dot = document.getElementById("api-status-dot");
    const text = document.getElementById("api-status-text");
    if (dot && text) {
      if (online) {
        dot.className = "status-dot";
        text.textContent = "Live API (FastAPI)";
      } else {
        dot.className = "status-dot offline";
        text.textContent = "Client Simulator (Standby)";
      }
    }
  }

  function updateButtonStates() {
    const c = state.activeCircuit;

    if (c === "mux_8to1") {
      for (let i = 0; i < 3; i++) {
        const btn = document.querySelector(`#deck-mux8 .bit-toggle-btn[data-type="select"][data-index="${i}"]`);
        if (btn) {
          const val = state.mux8.select[i];
          btn.classList.toggle("active", val === "1");
          btn.querySelector(".bit-val").textContent = val;
        }
      }
      for (let i = 0; i < 8; i++) {
        const btn = document.querySelector(`#deck-mux8 .bit-toggle-btn[data-type="input"][data-index="${i}"]`);
        if (btn) {
          const val = state.mux8.inputs[i];
          btn.classList.toggle("active", val === 1);
          btn.querySelector(".bit-val").textContent = val;
        }
      }
      const strobeBtn = document.querySelector(`#deck-mux8 .bit-toggle-btn[data-type="strobe"]`);
      if (strobeBtn) {
        strobeBtn.classList.toggle("active", state.mux8.strobe === 1);
        strobeBtn.querySelector(".bit-val").textContent = state.mux8.strobe;
      }
    } else if (c === "mux_4to1") {
      for (let i = 0; i < 2; i++) {
        const btn = document.querySelector(`#deck-mux4 .bit-toggle-btn[data-type="select"][data-index="${i}"]`);
        if (btn) {
          const val = state.mux4.select[i];
          btn.classList.toggle("active", val === "1");
          btn.querySelector(".bit-val").textContent = val;
        }
      }
      for (let i = 0; i < 4; i++) {
        const btn = document.querySelector(`#deck-mux4 .bit-toggle-btn[data-type="input"][data-index="${i}"]`);
        if (btn) {
          const val = state.mux4.inputs[i];
          btn.classList.toggle("active", val === 1);
          btn.querySelector(".bit-val").textContent = val;
        }
      }
      const strobeBtn = document.querySelector(`#deck-mux4 .bit-toggle-btn[data-type="strobe"]`);
      if (strobeBtn) {
        strobeBtn.classList.toggle("active", state.mux4.strobe === 1);
        strobeBtn.querySelector(".bit-val").textContent = state.mux4.strobe;
      }
    } else if (c === "comparator_4bit") {
      for (let i = 0; i < 4; i++) {
        const btnA = document.querySelector(`#deck-comp4 .bit-toggle-btn[data-group="a"][data-index="${i}"]`);
        if (btnA) {
          const val = state.comp4.a[i];
          btnA.classList.toggle("active", val === "1");
          btnA.querySelector(".bit-val").textContent = val;
        }
        const btnB = document.querySelector(`#deck-comp4 .bit-toggle-btn[data-group="b"][data-index="${i}"]`);
        if (btnB) {
          const val = state.comp4.b[i];
          btnB.classList.toggle("active", val === "1");
          btnB.querySelector(".bit-val").textContent = val;
        }
      }
      const casGt = document.querySelector(`#deck-comp4 .bit-toggle-btn[data-cas="gt"]`);
      if (casGt) { casGt.classList.toggle("active", state.comp4.cascade_gt === 1); casGt.querySelector(".bit-val").textContent = state.comp4.cascade_gt; }
      const casEq = document.querySelector(`#deck-comp4 .bit-toggle-btn[data-cas="eq"]`);
      if (casEq) { casEq.classList.toggle("active", state.comp4.cascade_eq === 1); casEq.querySelector(".bit-val").textContent = state.comp4.cascade_eq; }
      const casLt = document.querySelector(`#deck-comp4 .bit-toggle-btn[data-cas="lt"]`);
      if (casLt) { casLt.classList.toggle("active", state.comp4.cascade_lt === 1); casLt.querySelector(".bit-val").textContent = state.comp4.cascade_lt; }
    } else if (c === "adder_subtractor_4bit") {
      for (let i = 0; i < 4; i++) {
        const btnA = document.querySelector(`#deck-addsub .bit-toggle-btn[data-group="a"][data-index="${i}"]`);
        if (btnA) {
          const val = state.addSub4.a[i];
          btnA.classList.toggle("active", val === "1");
          btnA.querySelector(".bit-val").textContent = val;
        }
        const btnB = document.querySelector(`#deck-addsub .bit-toggle-btn[data-group="b"][data-index="${i}"]`);
        if (btnB) {
          const val = state.addSub4.b[i];
          btnB.classList.toggle("active", val === "1");
          btnB.querySelector(".bit-val").textContent = val;
        }
      }
      const modeBtn = document.querySelector(`#deck-addsub .bit-toggle-btn[data-group="mode"]`);
      if (modeBtn) {
        modeBtn.classList.toggle("active", state.addSub4.mode === 1);
        modeBtn.querySelector(".bit-val").textContent = state.addSub4.mode;
      }
      document.getElementById("btn-sub-add")?.classList.toggle("active", state.addSub4.mode === 0);
      document.getElementById("btn-sub-sub")?.classList.toggle("active", state.addSub4.mode === 1);
    } else if (c === "counter_74ls90") {
      const r0_1 = state.counter90.r0_1;
      const r0_2 = state.counter90.r0_2;
      const r9_1 = state.counter90.r9_1;
      const r9_2 = state.counter90.r9_2;

      const btnR01 = document.getElementById("btn-r0-1-90");
      if (btnR01) { btnR01.classList.toggle("active", r0_1 === 1); btnR01.querySelector(".bit-val").textContent = r0_1; }
      const btnR02 = document.getElementById("btn-r0-2-90");
      if (btnR02) { btnR02.classList.toggle("active", r0_2 === 1); btnR02.querySelector(".bit-val").textContent = r0_2; }
      const btnR91 = document.getElementById("btn-r9-1-90");
      if (btnR91) { btnR91.classList.toggle("active", r9_1 === 1); btnR91.querySelector(".bit-val").textContent = r9_1; }
      const btnR92 = document.getElementById("btn-r9-2-90");
      if (btnR92) { btnR92.classList.toggle("active", r9_2 === 1); btnR92.querySelector(".bit-val").textContent = r9_2; }

      const btnCas = document.getElementById("btn-cascade-90");
      if (btnCas) {
        btnCas.classList.toggle("active", state.counter90.cascade === 1);
        btnCas.textContent = state.counter90.cascade === 1 ? "🔗 QA ➔ CP1 (Jumper ON)" : "⚠️ QA ➔ CP1 (Jumper OFF)";
      }

      const btnAuto = document.getElementById("btn-clk-auto-90");
      if (btnAuto) {
        btnAuto.classList.toggle("active", state.counter90.autoRunning);
        btnAuto.textContent = state.counter90.autoRunning ? "⏹ Stop 1Hz" : "▶ Auto 1Hz";
      }
    } else if (c === "counter_74ls93") {
      const r0_1 = state.counter93.r0_1;
      const r0_2 = state.counter93.r0_2;

      const btnR01 = document.getElementById("btn-r0-1-93");
      if (btnR01) { btnR01.classList.toggle("active", r0_1 === 1); btnR01.querySelector(".bit-val").textContent = r0_1; }
      const btnR02 = document.getElementById("btn-r0-2-93");
      if (btnR02) { btnR02.classList.toggle("active", r0_2 === 1); btnR02.querySelector(".bit-val").textContent = r0_2; }

      const btnCas = document.getElementById("btn-cascade-93");
      if (btnCas) {
        btnCas.classList.toggle("active", state.counter93.cascade === 1);
        btnCas.textContent = state.counter93.cascade === 1 ? "🔗 QA ➔ CP1 (Jumper ON)" : "⚠️ QA ➔ CP1 (Jumper OFF)";
      }

      const btnAuto = document.getElementById("btn-clk-auto-93");
      if (btnAuto) {
        btnAuto.classList.toggle("active", state.counter93.autoRunning);
        btnAuto.textContent = state.counter93.autoRunning ? "⏹ Stop 1Hz" : "▶ Auto 1Hz";
      }
    } else if (c === "flipflop_74ls74") {
      const dBtn = document.getElementById("btn-d-74");
      if (dBtn) { dBtn.classList.toggle("active", state.flipflop74.d === 1); dBtn.querySelector(".bit-val").textContent = state.flipflop74.d; }
      const prBtn = document.getElementById("btn-pr-74");
      if (prBtn) { prBtn.classList.toggle("active", state.flipflop74.pr_n === 0); prBtn.querySelector(".bit-val").textContent = state.flipflop74.pr_n; }
      const clrBtn = document.getElementById("btn-clr-74");
      if (clrBtn) { clrBtn.classList.toggle("active", state.flipflop74.clr_n === 0); clrBtn.querySelector(".bit-val").textContent = state.flipflop74.clr_n; }
    } else if (c === "flipflop_74ls76") {
      const jBtn = document.getElementById("btn-j-76");
      if (jBtn) { jBtn.classList.toggle("active", state.flipflop76.j === 1); jBtn.querySelector(".bit-val").textContent = state.flipflop76.j; }
      const kBtn = document.getElementById("btn-k-76");
      if (kBtn) { kBtn.classList.toggle("active", state.flipflop76.k === 1); kBtn.querySelector(".bit-val").textContent = state.flipflop76.k; }
      const prBtn = document.getElementById("btn-pr-76");
      if (prBtn) { prBtn.classList.toggle("active", state.flipflop76.pr_n === 0); prBtn.querySelector(".bit-val").textContent = state.flipflop76.pr_n; }
      const clrBtn = document.getElementById("btn-clr-76");
      if (clrBtn) { clrBtn.classList.toggle("active", state.flipflop76.clr_n === 0); clrBtn.querySelector(".bit-val").textContent = state.flipflop76.clr_n; }
    } else if (c === "shiftreg_74ls194") {
      const s1Btn = document.getElementById("btn-s1-194");
      if (s1Btn) { s1Btn.classList.toggle("active", state.shiftreg194.s1 === 1); s1Btn.querySelector(".bit-val").textContent = state.shiftreg194.s1; }
      const s0Btn = document.getElementById("btn-s0-194");
      if (s0Btn) { s0Btn.classList.toggle("active", state.shiftreg194.s0 === 1); s0Btn.querySelector(".bit-val").textContent = state.shiftreg194.s0; }
      const srBtn = document.getElementById("btn-srin-194");
      if (srBtn) { srBtn.classList.toggle("active", state.shiftreg194.sr_in === 1); srBtn.querySelector(".bit-val").textContent = state.shiftreg194.sr_in; }
      const slBtn = document.getElementById("btn-slin-194");
      if (slBtn) { slBtn.classList.toggle("active", state.shiftreg194.sl_in === 1); slBtn.querySelector(".bit-val").textContent = state.shiftreg194.sl_in; }
      const clrBtn = document.getElementById("btn-clr-194");
      if (clrBtn) { clrBtn.classList.toggle("active", state.shiftreg194.clr_n === 0); clrBtn.querySelector(".bit-val").textContent = state.shiftreg194.clr_n; }
      for (let i = 0; i < 4; i++) {
        const dBtn = document.querySelector(`#deck-sr194 [data-parallel-in="${i}"]`);
        if (dBtn) {
          dBtn.classList.toggle("active", state.shiftreg194.d[i] === 1);
          dBtn.querySelector(".bit-val").textContent = state.shiftreg194.d[i];
        }
      }
    }
  }

  // Render SVG Layers
  function renderCircuit(data) {
    if (!data) return;

    // Render Wires
    wireLayer.innerHTML = "";
    data.wires.forEach((wire) => {
      const isHigh = wire.value === 1;
      const wirePath = createSVGElement("path", {
        d: wire.path,
        class: `kicad-wire ${isHigh ? "wire-high" : "wire-low"}`,
        id: wire.id,
        "data-net": wire.net,
      });
      wireLayer.appendChild(wirePath);
    });

    // Render Junctions
    junctionLayer.innerHTML = "";
    data.junctions.forEach((junc) => {
      const isHigh = junc.value === 1;
      const circle = createSVGElement("circle", {
        cx: junc.x,
        cy: junc.y,
        class: `kicad-junction ${isHigh ? "junc-high" : "junc-low"}`,
      });
      junctionLayer.appendChild(circle);
    });

    // Render Components
    componentLayer.innerHTML = "";
    data.components.forEach((comp) => {
      renderComponent(comp, componentLayer);
    });
  }

  // Component Renderer
  function renderComponent(comp, parent) {
    const g = createSVGElement("g", { id: comp.id, class: "kicad-component" });

    if (comp.type === "ic_block") {
      renderICBlock(comp, g);
    } else if (comp.type === "not_gate") {
      renderNotGate(comp, g);
    } else if (comp.type === "or_gate") {
      renderOrGate(comp, g);
    } else if (comp.type === "xor_gate") {
      renderXorGate(comp, g);
    } else if (comp.type.startsWith("port_")) {
      renderPort(comp, g);
    }

    parent.appendChild(g);
  }

  // 1. IC Block
  function renderICBlock(comp, parent) {
    const { x, y, width, height, ref, value, pins } = comp;

    const rect = createSVGElement("rect", {
      x: x, y: y, width: width, height: height,
      rx: 2, ry: 2, class: "kicad-component-body",
    });
    parent.appendChild(rect);

    const refText = createSVGElement("text", { x: x + 10, y: y - 10, class: "kicad-ref-des" });
    refText.textContent = ref;
    parent.appendChild(refText);

    const valText = createSVGElement("text", {
      x: x + width / 2, y: y + height - 12, class: "kicad-comp-value", "text-anchor": "middle",
    });
    valText.textContent = value;
    parent.appendChild(valText);

    Object.keys(pins).forEach((pinKey) => {
      renderPin(pins[pinKey], parent);
    });
  }

  // Pin Renderer
  function renderPin(pin, parent) {
    const stubLen = 22;
    const stubEndX = pin.x + pin.dx * stubLen;
    const stubEndY = pin.y + pin.dy * stubLen;

    const line = createSVGElement("line", {
      x1: pin.x, y1: pin.y, x2: stubEndX, y2: stubEndY, class: "kicad-pin-stub",
    });
    parent.appendChild(line);

    if (pin.name.startsWith("~")) {
      const bubble = createSVGElement("circle", {
        cx: pin.x + pin.dx * 5, cy: pin.y, r: 3.5, class: "kicad-inversion-bubble",
      });
      parent.appendChild(bubble);
    }

    if (pin.pin_number) {
      const pNum = createSVGElement("text", {
        x: pin.x + pin.dx * 12, y: pin.y - 4, class: "kicad-pin-number",
        "text-anchor": pin.dx < 0 ? "end" : "start",
      });
      pNum.textContent = pin.pin_number;
      parent.appendChild(pNum);
    }

    const cleanName = pin.name.replace(/[~{}]/g, "");
    const pName = createSVGElement("text", {
      x: pin.x - pin.dx * 8, y: pin.y + 4, class: "kicad-pin-name",
      "text-anchor": pin.dx < 0 ? "start" : "end",
    });
    pName.textContent = cleanName;
    if (pin.name.startsWith("~")) {
      pName.setAttribute("text-decoration", "overline");
    }
    parent.appendChild(pName);

    if (pin.value !== null && pin.value !== undefined) {
      const isHigh = pin.value === 1;
      const badgeX = pin.x;
      const badgeY = pin.y;

      const badgeBg = createSVGElement("circle", {
        cx: badgeX, cy: badgeY, r: 6,
        fill: isHigh ? "#10b981" : "#1e293b",
        stroke: isHigh ? "#34d399" : "#64748b",
        "stroke-width": 1,
      });
      const badgeText = createSVGElement("text", {
        x: badgeX, y: badgeY, class: "kicad-pin-val-badge", fill: "#ffffff",
      });
      badgeText.textContent = pin.value;

      parent.appendChild(badgeBg);
      parent.appendChild(badgeText);
    }
  }

  // 2. NOT Gate
  function renderNotGate(comp, parent) {
    const { x, y, width, height, ref, value, pins } = comp;

    const refText = createSVGElement("text", { x: x + 5, y: y - 8, class: "kicad-ref-des" });
    refText.textContent = ref;
    parent.appendChild(refText);

    const valText = createSVGElement("text", { x: x + width / 2, y: y + height + 14, class: "kicad-comp-value", "text-anchor": "middle" });
    valText.textContent = value;
    parent.appendChild(valText);

    const p1 = `${x + 10},${y + 4}`;
    const p2 = `${x + 10},${y + height - 4}`;
    const p3 = `${x + width - 14},${y + height / 2}`;
    parent.appendChild(createSVGElement("polygon", { points: `${p1} ${p2} ${p3}`, class: "kicad-gate-symbol" }));

    parent.appendChild(createSVGElement("circle", {
      cx: x + width - 8, cy: y + height / 2, r: 4.5, class: "kicad-inversion-bubble",
    }));

    Object.keys(pins).forEach((pKey) => renderPin(pins[pKey], parent));
  }

  // 3. OR Gate
  function renderOrGate(comp, parent) {
    const { x, y, width, height, ref, value, pins } = comp;

    const refText = createSVGElement("text", { x: x + 10, y: y - 8, class: "kicad-ref-des" });
    refText.textContent = ref;
    parent.appendChild(refText);

    const valText = createSVGElement("text", { x: x + width / 2, y: y + height + 14, class: "kicad-comp-value", "text-anchor": "middle" });
    valText.textContent = value;
    parent.appendChild(valText);

    const leftX = x + 10;
    const rightX = x + width - 6;
    const topY = y + 4;
    const botY = y + height - 4;
    const midY = y + height / 2;

    const d = `M ${leftX},${topY} Q ${leftX + 16},${midY} ${leftX},${botY} Q ${leftX + 35},${botY} ${rightX},${midY} Q ${leftX + 35},${topY} ${leftX},${topY} Z`;
    parent.appendChild(createSVGElement("path", { d: d, class: "kicad-gate-symbol" }));

    Object.keys(pins).forEach((pKey) => renderPin(pins[pKey], parent));
  }

  // 4. XOR Gate (Authentic KiCad double-arc symbol)
  function renderXorGate(comp, parent) {
    const { x, y, width, height, ref, value, pins } = comp;

    const refText = createSVGElement("text", { x: x + 8, y: y - 8, class: "kicad-ref-des" });
    refText.textContent = ref;
    parent.appendChild(refText);

    const valText = createSVGElement("text", { x: x + width / 2, y: y + height + 14, class: "kicad-comp-value", "text-anchor": "middle" });
    valText.textContent = value;
    parent.appendChild(valText);

    const leftX = x + 14;
    const rightX = x + width - 6;
    const topY = y + 4;
    const botY = y + height - 4;
    const midY = y + height / 2;

    // Back isolated arc
    const backArcD = `M ${leftX - 6},${topY} Q ${leftX + 8},${midY} ${leftX - 6},${botY}`;
    const backArc = createSVGElement("path", {
      d: backArcD,
      fill: "none",
      stroke: "var(--kicad-component-outline)",
      "stroke-width": 1.6,
      "stroke-linecap": "round",
    });
    parent.appendChild(backArc);

    // Main XOR body
    const bodyD = `M ${leftX},${topY} Q ${leftX + 14},${midY} ${leftX},${botY} Q ${leftX + 32},${botY} ${rightX},${midY} Q ${leftX + 32},${topY} ${leftX},${topY} Z`;
    parent.appendChild(createSVGElement("path", { d: bodyD, class: "kicad-gate-symbol" }));

    Object.keys(pins).forEach((pKey) => renderPin(pins[pKey], parent));
  }

  // 5. Port Symbol
  function renderPort(comp, parent) {
    const { x, y, width, height, ref, value, pins, type } = comp;
    const isHigh = value === "1";
    const isOutput = type === "port_output";

    let d = "";
    if (isOutput) {
      d = `M ${x},${y} L ${x + width - 12},${y} L ${x + width},${y + height / 2} L ${x + width - 12},${y + height} L ${x},${y + height} Z`;
    } else {
      d = `M ${x},${y} L ${x + width - 10},${y} L ${x + width},${y + height / 2} L ${x + width - 10},${y + height} L ${x},${y + height} Z`;
    }

    parent.appendChild(createSVGElement("path", {
      d: d, class: "kicad-port-shape",
      fill: isHigh ? "#10b981" : "#e2e8f0",
      stroke: isHigh ? "#059669" : "#64748b",
    }));

    const text = createSVGElement("text", {
      x: x + width / 2 - 4, y: y + height / 2, class: "kicad-port-text",
      fill: isHigh ? "#ffffff" : "#1e293b",
    });
    text.textContent = `${ref}=${value}`;
    parent.appendChild(text);

    Object.keys(pins).forEach((pKey) => renderPin(pins[pKey], parent));
  }

  // Frame, Grid & Title Block
  function drawKiCadFrameAndGrid(parent, w, h, sheetInfo) {
    parent.innerHTML = "";

    // Grid dots
    const gridG = createSVGElement("g", { id: "kicad-grid" });
    for (let gx = 40; gx <= w - 40; gx += 20) {
      for (let gy = 40; gy <= h - 40; gy += 20) {
        gridG.appendChild(createSVGElement("circle", {
          cx: gx, cy: gy, r: 0.75, fill: "var(--kicad-grid-dot)",
        }));
      }
    }
    parent.appendChild(gridG);

    // Double Red Frame
    const frameG = createSVGElement("g", { id: "kicad-border-frame" });
    frameG.appendChild(createSVGElement("rect", {
      x: 18, y: 18, width: w - 36, height: h - 36, class: "kicad-frame-line",
    }));
    frameG.appendChild(createSVGElement("rect", {
      x: 32, y: 32, width: w - 64, height: h - 64, class: "kicad-frame-line-thin",
    }));

    // Zone marks
    const xZones = ["1", "2", "3", "4", "5", "6"];
    const colStep = (w - 64) / xZones.length;
    xZones.forEach((zone, idx) => {
      const zX = 32 + (idx + 0.5) * colStep;
      const t = createSVGElement("text", { x: zX, y: 25, class: "kicad-zone-label" });
      t.textContent = zone;
      frameG.appendChild(t);
      const b = createSVGElement("text", { x: zX, y: h - 23, class: "kicad-zone-label" });
      b.textContent = zone;
      frameG.appendChild(b);
    });

    const yZones = ["A", "B", "C", "D"];
    const rowStep = (h - 64) / yZones.length;
    yZones.forEach((zone, idx) => {
      const zY = 32 + (idx + 0.5) * rowStep;
      const l = createSVGElement("text", { x: 25, y: zY, class: "kicad-zone-label" });
      l.textContent = zone;
      frameG.appendChild(l);
      const r = createSVGElement("text", { x: w - 23, y: zY, class: "kicad-zone-label" });
      r.textContent = zone;
      frameG.appendChild(r);
    });

    // Title Block in bottom-right corner
    const tbW = 320;
    const tbH = 95;
    const tbX = w - 32 - tbW;
    const tbY = h - 32 - tbH;

    const tbG = createSVGElement("g", { id: "kicad-title-block" });
    tbG.appendChild(createSVGElement("rect", {
      x: tbX, y: tbY, width: tbW, height: tbH, class: "kicad-title-block-bg",
    }));

    tbG.appendChild(createSVGElement("line", { x1: tbX, y1: tbY + 28, x2: tbX + tbW, y2: tbY + 28, class: "kicad-title-block-divider" }));
    tbG.appendChild(createSVGElement("line", { x1: tbX, y1: tbY + 54, x2: tbX + tbW, y2: tbY + 54, class: "kicad-title-block-divider" }));
    tbG.appendChild(createSVGElement("line", { x1: tbX, y1: tbY + 74, x2: tbX + tbW, y2: tbY + 74, class: "kicad-title-block-divider" }));
    tbG.appendChild(createSVGElement("line", { x1: tbX + 160, y1: tbY + 54, x2: tbX + 160, y2: tbY + tbH, class: "kicad-title-block-divider" }));
    tbG.appendChild(createSVGElement("line", { x1: tbX + 240, y1: tbY + 54, x2: tbX + 240, y2: tbY + 74, class: "kicad-title-block-divider" }));

    const today = sheetInfo.date || new Date().toISOString().slice(0, 10);
    const titleStr = sheetInfo.title || "DIGITAL LOGIC SCHEMATIC";
    const fileStr = sheetInfo.file || "schematic.kicad_sch";
    const revStr = sheetInfo.rev || "v1.0";
    const sizeStr = sheetInfo.size || "A4";
    const companyStr = sheetInfo.company || "Logic Sim Suite";

    addTBText(tbG, tbX + 10, tbY + 12, "TITLE:", "kicad-title-label");
    addTBText(tbG, tbX + 50, tbY + 18, titleStr.toUpperCase(), "kicad-title-heading");
    addTBText(tbG, tbX + 10, tbY + 38, "FILE:", "kicad-title-label");
    addTBText(tbG, tbX + 45, tbY + 44, fileStr, "kicad-title-val");
    addTBText(tbG, tbX + 10, tbY + 63, "DATE:", "kicad-title-label");
    addTBText(tbG, tbX + 45, tbY + 66, today, "kicad-title-val");
    addTBText(tbG, tbX + 168, tbY + 63, "REV:", "kicad-title-label");
    addTBText(tbG, tbX + 198, tbY + 66, revStr, "kicad-title-val");
    addTBText(tbG, tbX + 248, tbY + 63, "SIZE:", "kicad-title-label");
    addTBText(tbG, tbX + 280, tbY + 66, sizeStr, "kicad-title-val");
    addTBText(tbG, tbX + 10, tbY + 83, "COMPANY:", "kicad-title-label");
    addTBText(tbG, tbX + 65, tbY + 86, companyStr, "kicad-title-val");
    addTBText(tbG, tbX + 252, tbY + 83, "SHEET:", "kicad-title-label");
    addTBText(tbG, tbX + 292, tbY + 86, "1/1", "kicad-title-val");

    frameG.appendChild(tbG);
    parent.appendChild(frameG);
  }

  function addTBText(parent, x, y, content, className) {
    const text = createSVGElement("text", { x: x, y: y, class: className });
    text.textContent = content;
    parent.appendChild(text);
  }

  // Info panels & Readouts
  function renderInfoPanels(data) {
    const c = state.activeCircuit;

    if (c === "mux_8to1") {
      const finalY = data.state.output;
      const details = data.state.details || {};
      const led = document.getElementById("output-led-mux8");
      if (led) { led.className = `output-led ${finalY === 1 ? "on" : ""}`; led.textContent = finalY; }
      const desc = document.getElementById("active-path-desc-mux8");
      if (desc) {
        desc.textContent = data.state.strobe === 1
          ? "Disabled (Strobe ~G = 1 -> Output Forced 0)"
          : `${details.active_section === 1 ? "Section 1 (U2A)" : "Section 2 (U2B)"} active | Channel D${parseInt(data.state.select, 2)} routed`;
      }
    } else if (c === "mux_4to1") {
      const finalY = data.state.output;
      const details = data.state.details || {};
      const led = document.getElementById("output-led-mux4");
      if (led) { led.className = `output-led ${finalY === 1 ? "on" : ""}`; led.textContent = finalY; }
      const desc = document.getElementById("active-path-desc-mux4");
      if (desc) {
        desc.textContent = data.state.strobe === 1
          ? "Disabled (Strobe ~1G = 1 -> Output Forced 0)"
          : `Channel ${details.selected_channel} routed to Output 1Y`;
      }
    } else if (c === "comparator_4bit") {
      const details = data.state.details || {};
      const pillGt = document.getElementById("comp-pill-gt");
      const pillEq = document.getElementById("comp-pill-eq");
      const pillLt = document.getElementById("comp-pill-lt");
      if (pillGt) pillGt.classList.toggle("active", details.a_gt_b === 1);
      if (pillEq) pillEq.classList.toggle("active", details.a_eq_b === 1);
      if (pillLt) pillLt.classList.toggle("active", details.a_lt_b === 1);

      const decision = document.getElementById("comp-decision-text");
      if (decision) decision.textContent = `Decision: ${details.decision_stage || details.relation}`;
      const decA = document.getElementById("comp-dec-a");
      const decB = document.getElementById("comp-dec-b");
      if (decA) decA.textContent = details.a_decimal;
      if (decB) decB.textContent = details.b_decimal;
    } else if (c === "adder_subtractor_4bit") {
      const sumVal = data.state.sum;
      const details = data.state.details || {};
      const mode = data.state.mode;

      const ledSum = document.getElementById("addsub-sum-led");
      if (ledSum) ledSum.textContent = sumVal;

      const flagPill = document.getElementById("addsub-flag-pill");
      if (flagPill) {
        if (mode === 0) {
          flagPill.textContent = `Carry-Out (C4): ${data.state.carry_out}`;
          flagPill.classList.toggle("active", data.state.carry_out === 1);
        } else {
          flagPill.textContent = `Borrow: ${data.state.borrow}`;
          flagPill.classList.toggle("active", data.state.borrow === 1);
        }
      }

      const calcText = document.getElementById("addsub-calc-text");
      if (calcText) {
        const op = mode === 0 ? "+" : "-";
        calcText.textContent = `Calculation: ${details.a_decimal} ${op} ${details.b_decimal} = ${details.result_decimal} (Decimal)`;
      }
    } else if (c === "counter_74ls90") {
      const dec = data.state?.details?.decimal !== undefined ? data.state.details.decimal : 0;
      const bin = data.state?.details?.binary || "0000";
      const modName = data.state?.details?.mod_title || "Mod-10 (BCD)";

      const decEl = document.getElementById("c90-dec-val");
      if (decEl) decEl.textContent = dec;

      const binEl = document.getElementById("c90-bin-val");
      if (binEl) binEl.textContent = `[QD..QA: ${bin}]`;

      const modBadge = document.getElementById("c90-mod-badge");
      if (modBadge) modBadge.textContent = modName;
    } else if (c === "counter_74ls93") {
      const dec = data.state?.details?.decimal !== undefined ? data.state.details.decimal : 0;
      const bin = data.state?.details?.binary || "0000";
      const modName = data.state?.details?.mod_title || "Mod-16 (Binary)";

      const decEl = document.getElementById("c93-dec-val");
      if (decEl) decEl.textContent = dec;

      const binEl = document.getElementById("c93-bin-val");
      if (binEl) binEl.textContent = `[QD..QA: ${bin}]`;

      const modBadge = document.getElementById("c93-mod-badge");
      if (modBadge) modBadge.textContent = modName;
    } else if (c === "flipflop_74ls74") {
      const q = state.flipflop74.q;
      const qBar = state.flipflop74.q_bar;
      const qLed = document.getElementById("ff74-q-led");
      if (qLed) { qLed.textContent = q; qLed.className = `output-led ${q === 1 ? "on" : ""}`; }
      const qbarLed = document.getElementById("ff74-qbar-led");
      if (qbarLed) { qbarLed.textContent = qBar; qbarLed.className = `output-led ${qBar === 1 ? "on" : ""}`; }
      const desc = document.getElementById("ff74-status-desc");
      if (desc) {
        if (state.flipflop74.pr_n === 0 && state.flipflop74.clr_n === 0) {
          desc.textContent = "⚠️ FORBIDDEN INDETERMINATE STATE (~PR=~CLR=0 -> Q=Q'=1)";
        } else if (state.flipflop74.pr_n === 0) {
          desc.textContent = "⚡ ASYNC PRESET OVERRIDE: Q forced to 1";
        } else if (state.flipflop74.clr_n === 0) {
          desc.textContent = "⚡ ASYNC CLEAR OVERRIDE: Q forced to 0";
        } else {
          desc.textContent = `Active Data State: D=${state.flipflop74.d} -> Q=${q} on Clock Edge`;
        }
      }
    } else if (c === "flipflop_74ls76") {
      const q = state.flipflop76.q;
      const qBar = state.flipflop76.q_bar;
      const qLed = document.getElementById("ff76-q-led");
      if (qLed) { qLed.textContent = q; qLed.className = `output-led ${q === 1 ? "on" : ""}`; }
      const qbarLed = document.getElementById("ff76-qbar-led");
      if (qbarLed) { qbarLed.textContent = qBar; qbarLed.className = `output-led ${qBar === 1 ? "on" : ""}`; }
      const desc = document.getElementById("ff76-status-desc");
      if (desc) {
        if (state.flipflop76.pr_n === 0 && state.flipflop76.clr_n === 0) {
          desc.textContent = "⚠️ FORBIDDEN STATE (~PR=~CLR=0)";
        } else if (state.flipflop76.pr_n === 0) {
          desc.textContent = "⚡ ASYNC PRESET: Q=1";
        } else if (state.flipflop76.clr_n === 0) {
          desc.textContent = "⚡ ASYNC CLEAR: Q=0";
        } else if (state.flipflop76.j === 1 && state.flipflop76.k === 1) {
          desc.textContent = `🔄 TOGGLE MODE (J=1, K=1): Current Q=${q}`;
        } else if (state.flipflop76.j === 1 && state.flipflop76.k === 0) {
          desc.textContent = `SET MODE (J=1, K=0): Q=1 on Falling Edge`;
        } else if (state.flipflop76.j === 0 && state.flipflop76.k === 1) {
          desc.textContent = `RESET MODE (J=0, K=1): Q=0 on Falling Edge`;
        } else {
          desc.textContent = `HOLD NO-CHANGE (J=0, K=0): Q=${q} preserved`;
        }
      }
    } else if (c === "shiftreg_74ls194") {
      const q = state.shiftreg194.q;
      const qStr = q.join("");
      const led = document.getElementById("sr194-q-led");
      if (led) led.textContent = qStr;
      const mode = `${state.shiftreg194.s1}${state.shiftreg194.s0}`;
      const modeBadge = document.getElementById("sr194-mode-badge");
      const desc = document.getElementById("sr194-status-desc");
      if (modeBadge) {
        if (mode === "00") modeBadge.textContent = "Hold (00)";
        else if (mode === "01") modeBadge.textContent = "Shift Right (01)";
        else if (mode === "10") modeBadge.textContent = "Shift Left (10)";
        else if (mode === "11") modeBadge.textContent = "Parallel Load (11)";
      }
      if (desc) {
        if (state.shiftreg194.clr_n === 0) {
          desc.textContent = "⚡ ASYNC RESET: Clear active (~CLR=0) -> QA..QD=0000";
        } else if (mode === "00") {
          desc.textContent = `HOLD: State [${qStr}] unchanged on clock pulse`;
        } else if (mode === "01") {
          desc.textContent = `SHIFT RIGHT: SR_IN (${state.shiftreg194.sr_in}) enters QA on next clock`;
        } else if (mode === "10") {
          desc.textContent = `SHIFT LEFT: SL_IN (${state.shiftreg194.sl_in}) enters QD on next clock`;
        } else if (mode === "11") {
          desc.textContent = `PARALLEL LOAD: A..D [${state.shiftreg194.d.join("")}] latches to QA..QD`;
        }
      }
    }
  }

  // Client Simulation Fallbacks
  function generateClientSideFallback(circuitId) {
    if (circuitId === "mux_8to1") {
      return fallbackMux8(state.mux8.select, state.mux8.inputs, state.mux8.strobe);
    } else if (circuitId === "mux_4to1") {
      return fallbackMux4(state.mux4.select, state.mux4.inputs, state.mux4.strobe);
    } else if (circuitId === "comparator_4bit") {
      return fallbackComp4(state.comp4.a, state.comp4.b, state.comp4.cascade_gt, state.comp4.cascade_lt, state.comp4.cascade_eq);
    } else if (circuitId === "adder_subtractor_4bit") {
      return fallbackAddSub4(state.addSub4.a, state.addSub4.b, state.addSub4.mode);
    } else if (circuitId === "counter_74ls90") {
      return fallbackCounter74LS90(
        state.counter90.qa, state.counter90.qb, state.counter90.qc, state.counter90.qd,
        state.counter90.r0_1, state.counter90.r0_2, state.counter90.r9_1, state.counter90.r9_2,
        state.counter90.cascade, state.counter90.mode
      );
    } else if (circuitId === "counter_74ls93") {
      return fallbackCounter74LS93(
        state.counter93.qa, state.counter93.qb, state.counter93.qc, state.counter93.qd,
        state.counter93.r0_1, state.counter93.r0_2,
        state.counter93.cascade, state.counter93.mode
      );
    } else if (circuitId === "flipflop_74ls74") {
      return fallbackFlipFlop74LS74(
        state.flipflop74.clk, state.flipflop74.d, state.flipflop74.pr_n, state.flipflop74.clr_n,
        state.flipflop74.q, state.flipflop74.q_bar
      );
    } else if (circuitId === "flipflop_74ls76") {
      return fallbackFlipFlop74LS76(
        state.flipflop76.clk, state.flipflop76.j, state.flipflop76.k, state.flipflop76.pr_n, state.flipflop76.clr_n,
        state.flipflop76.q, state.flipflop76.q_bar
      );
    } else if (circuitId === "shiftreg_74ls194") {
      return fallbackShiftReg74LS194(
        state.shiftreg194.s1, state.shiftreg194.s0, state.shiftreg194.clr_n,
        state.shiftreg194.sr_in, state.shiftreg194.sl_in, state.shiftreg194.d, state.shiftreg194.q
      );
    }
  }

  function fallbackMux8(select, inputs, strobe) {
    const s2 = parseInt(select[0], 10);
    const s1 = parseInt(select[1], 10);
    const s0 = parseInt(select[2], 10);
    const s2_inv = 1 - s2;
    const subIdx = parseInt(select.slice(1), 2);

    const raw_y1 = inputs[subIdx];
    const raw_y2 = inputs[4 + subIdx];
    const g1_val = s2 | strobe;
    const g2_val = s2_inv | strobe;
    const y1_val = g1_val === 1 ? 0 : raw_y1;
    const y2_val = g2_val === 1 ? 0 : raw_y2;
    const final_y = y1_val | y2_val;

    const components = [];
    for (let i = 0; i < 4; i++) {
      components.push({
        id: `PORT_D${i}`, ref: `D${i}`, value: String(inputs[i]), type: "port_input",
        x: 80, y: 130 + i * 35 - 10, width: 50, height: 20,
        pins: { out: { name: `D${i}`, pin_number: "", x: 130, y: 130 + i * 35, dx: 1.0, dy: 0.0, value: inputs[i], direction: "output" } },
      });
    }
    for (let i = 4; i < 8; i++) {
      components.push({
        id: `PORT_D${i}`, ref: `D${i}`, value: String(inputs[i]), type: "port_input",
        x: 80, y: 380 + (i - 4) * 35 - 10, width: 50, height: 20,
        pins: { out: { name: `D${i}`, pin_number: "", x: 130, y: 380 + (i - 4) * 35, dx: 1.0, dy: 0.0, value: inputs[i], direction: "output" } },
      });
    }
    const selMeta = [["S2", s2, 290], ["S1", s1, 570], ["S0", s0, 610]];
    selMeta.forEach(([sName, sVal, yPos]) => {
      components.push({
        id: `PORT_${sName}`, ref: sName, value: String(sVal), type: "port_select",
        x: 80, y: yPos - 10, width: 50, height: 20,
        pins: { out: { name: sName, pin_number: "", x: 130, y: yPos, dx: 1.0, dy: 0.0, value: sVal, direction: "output" } },
      });
    });
    components.push({
      id: "PORT_STROBE", ref: "~{G}", value: String(strobe), type: "port_select",
      x: 80, y: 70, width: 50, height: 20,
      pins: { out: { name: "~{G}", pin_number: "", x: 130, y: 80, dx: 1.0, dy: 0.0, value: strobe, direction: "output" } },
    });
    components.push({
      id: "U1", ref: "U1", value: "74LS04", type: "not_gate", x: 230, y: 270, width: 60, height: 40,
      pins: { A: { name: "1A", pin_number: "1", x: 230, y: 290, dx: -1.0, dy: 0.0, value: s2, direction: "input" },
              Y: { name: "1Y", pin_number: "2", x: 290, y: 290, dx: 1.0, dy: 0.0, value: s2_inv, direction: "output" } },
    });
    components.push({
      id: "U2A", ref: "U2A", value: "74LS153", type: "ic_block", x: 420, y: 110, width: 160, height: 210,
      pins: { "1C0": { name: "1C0", pin_number: "6", x: 420, y: 130, dx: -1.0, dy: 0.0, value: inputs[0], direction: "input" },
              "1C1": { name: "1C1", pin_number: "5", x: 420, y: 165, dx: -1.0, dy: 0.0, value: inputs[1], direction: "input" },
              "1C2": { name: "1C2", pin_number: "4", x: 420, y: 200, dx: -1.0, dy: 0.0, value: inputs[2], direction: "input" },
              "1C3": { name: "1C3", pin_number: "3", x: 420, y: 235, dx: -1.0, dy: 0.0, value: inputs[3], direction: "input" },
              "1G":  { name: "~{1G}", pin_number: "1", x: 420, y: 270, dx: -1.0, dy: 0.0, value: g1_val, direction: "input" },
              "B":   { name: "B", pin_number: "2", x: 420, y: 295, dx: -1.0, dy: 0.0, value: s1, direction: "input" },
              "A":   { name: "A", pin_number: "14", x: 420, y: 310, dx: -1.0, dy: 0.0, value: s0, direction: "input" },
              "1Y":  { name: "1Y", pin_number: "7", x: 580, y: 170, dx: 1.0, dy: 0.0, value: y1_val, direction: "output" } },
    });
    components.push({
      id: "U2B", ref: "U2B", value: "74LS153", type: "ic_block", x: 420, y: 360, width: 160, height: 210,
      pins: { "2C0": { name: "2C0", pin_number: "10", x: 420, y: 380, dx: -1.0, dy: 0.0, value: inputs[4], direction: "input" },
              "2C1": { name: "2C1", pin_number: "11", x: 420, y: 415, dx: -1.0, dy: 0.0, value: inputs[5], direction: "input" },
              "2C2": { name: "2C2", pin_number: "12", x: 420, y: 450, dx: -1.0, dy: 0.0, value: inputs[6], direction: "input" },
              "2C3": { name: "2C3", pin_number: "13", x: 420, y: 485, dx: -1.0, dy: 0.0, value: inputs[7], direction: "input" },
              "2G":  { name: "~{2G}", pin_number: "15", x: 420, y: 520, dx: -1.0, dy: 0.0, value: g2_val, direction: "input" },
              "B":   { name: "B", pin_number: "2", x: 420, y: 545, dx: -1.0, dy: 0.0, value: s1, direction: "input" },
              "A":   { name: "A", pin_number: "14", x: 420, y: 560, dx: -1.0, dy: 0.0, value: s0, direction: "input" },
              "2Y":  { name: "2Y", pin_number: "9", x: 580, y: 420, dx: 1.0, dy: 0.0, value: y2_val, direction: "output" } },
    });
    components.push({
      id: "U3", ref: "U3", value: "74LS32", type: "or_gate", x: 720, y: 270, width: 70, height: 60,
      pins: { "1A": { name: "1A", pin_number: "1", x: 720, y: 285, dx: -1.0, dy: 0.0, value: y1_val, direction: "input" },
              "1B": { name: "1B", pin_number: "2", x: 720, y: 315, dx: -1.0, dy: 0.0, value: y2_val, direction: "input" },
              "1Y": { name: "1Y", pin_number: "3", x: 790, y: 300, dx: 1.0, dy: 0.0, value: final_y, direction: "output" } },
    });
    components.push({
      id: "PORT_Y", ref: "Y", value: String(final_y), type: "port_output", x: 880, y: 290, width: 60, height: 20,
      pins: { in: { name: "Y", pin_number: "", x: 880, y: 300, dx: -1.0, dy: 0.0, value: final_y, direction: "input" } },
    });

    const wires = [];
    for (let i = 0; i < 4; i++) wires.push({ id: `w_d${i}`, net: `D${i}`, path: `M 130,${130 + i * 35} L 420,${130 + i * 35}`, value: inputs[i] });
    for (let i = 4; i < 8; i++) wires.push({ id: `w_d${i}`, net: `D${i}`, path: `M 130,${380 + (i - 4) * 35} L 420,${380 + (i - 4) * 35}`, value: inputs[i] });
    wires.push({ id: "w_s2_main", net: "S2", path: "M 130,290 L 230,290", value: s2 });
    wires.push({ id: "w_s2_g1", net: "S2", path: "M 180,290 L 180,270 L 420,270", value: s2 });
    wires.push({ id: "w_s2_inv_g2", net: "S2_INV", path: "M 290,290 L 330,290 L 330,520 L 420,520", value: s2_inv });
    wires.push({ id: "w_s1_bus", net: "S1", path: "M 130,570 L 360,570 L 360,545 L 420,545", value: s1 });
    wires.push({ id: "w_s1_u2a", net: "S1", path: "M 360,545 L 360,295 L 420,295", value: s1 });
    wires.push({ id: "w_s0_bus", net: "S0", path: "M 130,610 L 380,610 L 380,560 L 420,560", value: s0 });
    wires.push({ id: "w_s0_u2a", net: "S0", path: "M 380,560 L 380,310 L 420,310", value: s0 });
    wires.push({ id: "w_u2a_y1", net: "1Y", path: "M 580,170 L 660,170 L 660,285 L 720,285", value: y1_val });
    wires.push({ id: "w_u2b_y2", net: "2Y", path: "M 580,420 L 660,420 L 660,315 L 720,315", value: y2_val });
    wires.push({ id: "w_final_y", net: "Y", path: "M 790,300 L 880,300", value: final_y });

    return {
      circuit_id: "mux_8to1",
      title: "8:1 Multiplexer (Dual 74LS153 + Inverter + OR)",
      sheet_info: { title: "8:1 Multiplexer (IC 74LS153 Composition)", file: "mux_8to1.kicad_sch", size: "A4", rev: "v1.0" },
      canvas: { width: 1200, height: 740 },
      components, wires,
      junctions: [{ x: 180, y: 290, value: s2 }, { x: 360, y: 545, value: s1 }, { x: 380, y: 560, value: s0 }],
      state: { select, inputs, strobe, output: final_y, details: { s2, s1, s0, s2_inv, active_section: strobe === 1 ? 0 : (s2 === 1 ? 2 : 1) } },
    };
  }

  function fallbackMux4(select, inputs, strobe) {
    const s1 = parseInt(select[0], 10);
    const s0 = parseInt(select[1], 10);
    const subIdx = parseInt(select, 2);
    const raw_y = inputs[subIdx];
    const final_y = strobe === 1 ? 0 : raw_y;

    const components = [];
    for (let i = 0; i < 4; i++) {
      components.push({
        id: `PORT_D${i}`, ref: `D${i}`, value: String(inputs[i]), type: "port_input",
        x: 80, y: 110 + i * 40 - 10, width: 50, height: 20,
        pins: { out: { name: `D${i}`, pin_number: "", x: 130, y: 110 + i * 40, dx: 1.0, dy: 0.0, value: inputs[i], direction: "output" } },
      });
    }
    components.push({
      id: "PORT_STROBE", ref: "~{1G}", value: String(strobe), type: "port_select",
      x: 80, y: 260, width: 50, height: 20,
      pins: { out: { name: "~{1G}", pin_number: "", x: 130, y: 270, dx: 1.0, dy: 0.0, value: strobe, direction: "output" } },
    });
    components.push({
      id: "PORT_S1", ref: "S1 (B)", value: String(s1), type: "port_select",
      x: 80, y: 300, width: 50, height: 20,
      pins: { out: { name: "S1", pin_number: "", x: 130, y: 310, dx: 1.0, dy: 0.0, value: s1, direction: "output" } },
    });
    components.push({
      id: "PORT_S0", ref: "S0 (A)", value: String(s0), type: "port_select",
      x: 80, y: 340, width: 50, height: 20,
      pins: { out: { name: "S0", pin_number: "", x: 130, y: 350, dx: 1.0, dy: 0.0, value: s0, direction: "output" } },
    });
    components.push({
      id: "U1A", ref: "U1A", value: "74LS153", type: "ic_block", x: 400, y: 75, width: 180, height: 310,
      pins: {
        "1C0": { name: "1C0", pin_number: "6", x: 400, y: 110, dx: -1.0, dy: 0.0, value: inputs[0], direction: "input" },
        "1C1": { name: "1C1", pin_number: "5", x: 400, y: 150, dx: -1.0, dy: 0.0, value: inputs[1], direction: "input" },
        "1C2": { name: "1C2", pin_number: "4", x: 400, y: 190, dx: -1.0, dy: 0.0, value: inputs[2], direction: "input" },
        "1C3": { name: "1C3", pin_number: "3", x: 400, y: 230, dx: -1.0, dy: 0.0, value: inputs[3], direction: "input" },
        "1G":  { name: "~{1G}", pin_number: "1", x: 400, y: 270, dx: -1.0, dy: 0.0, value: strobe, direction: "input" },
        "B":   { name: "B", pin_number: "2", x: 400, y: 310, dx: -1.0, dy: 0.0, value: s1, direction: "input" },
        "A":   { name: "A", pin_number: "14", x: 400, y: 350, dx: -1.0, dy: 0.0, value: s0, direction: "input" },
        "1Y":  { name: "1Y", pin_number: "7", x: 580, y: 210, dx: 1.0, dy: 0.0, value: final_y, direction: "output" },
      },
    });
    components.push({
      id: "PORT_Y", ref: "Y", value: String(final_y), type: "port_output", x: 730, y: 200, width: 60, height: 20,
      pins: { in: { name: "Y", pin_number: "", x: 730, y: 210, dx: -1.0, dy: 0.0, value: final_y, direction: "input" } },
    });

    const wires = [];
    for (let i = 0; i < 4; i++) wires.push({ id: `w_d${i}`, net: `D${i}`, path: `M 130,${110 + i * 40} L 400,${110 + i * 40}`, value: inputs[i] });
    wires.push({ id: "w_strobe", net: "STROBE", path: "M 130,270 L 400,270", value: strobe });
    wires.push({ id: "w_s1", net: "S1", path: "M 130,310 L 400,310", value: s1 });
    wires.push({ id: "w_s0", net: "S0", path: "M 130,350 L 400,350", value: s0 });
    wires.push({ id: "w_y", net: "1Y", path: "M 580,210 L 730,210", value: final_y });

    return {
      circuit_id: "mux_4to1",
      title: "4:1 Multiplexer (Single 74LS153 Section)",
      sheet_info: { title: "4:1 Multiplexer (Single 74LS153 Section)", file: "mux_4to1.kicad_sch", size: "A4", rev: "v1.0" },
      canvas: { width: 1000, height: 560 },
      components, wires, junctions: [],
      state: { select, inputs, strobe, output: final_y, details: { s1, s0, selected_channel: `D${subIdx}`, strobe_disabled: strobe === 1 } },
    };
  }

  function fallbackComp4(a, b, cascade_gt, cascade_lt, cascade_eq) {
    const aDec = parseInt(a, 2);
    const bDec = parseInt(b, 2);

    let out_gt = 0, out_lt = 0, out_eq = 0;
    let decision = "";
    if (aDec > bDec) { out_gt = 1; decision = "Determined by magnitude (A > B)"; }
    else if (aDec < bDec) { out_lt = 1; decision = "Determined by magnitude (A < B)"; }
    else {
      if (cascade_gt) { out_gt = 1; decision = "Bits equal; resolved to A > B by cascade input (IA>B)"; }
      else if (cascade_lt) { out_lt = 1; decision = "Bits equal; resolved to A < B by cascade input (IA<B)"; }
      else { out_eq = cascade_eq; decision = "All 4 bits equal (A = B)"; }
    }

    const a_bits = [int(a[0]), int(a[1]), int(a[2]), int(a[3])];
    const b_bits = [int(b[0]), int(b[1]), int(b[2]), int(b[3])];

    const components = [];
    const a_meta = [["A3", a_bits[0], 100, "15"], ["A2", a_bits[1], 135, "13"], ["A1", a_bits[2], 170, "12"], ["A0", a_bits[3], 205, "10"]];
    a_meta.forEach(([pName, val, yPos]) => {
      components.push({
        id: `PORT_${pName}`, ref: pName, value: String(val), type: "port_input",
        x: 80, y: yPos - 10, width: 50, height: 20,
        pins: { out: { name: pName, pin_number: "", x: 130, y: yPos, dx: 1.0, dy: 0.0, value: val, direction: "output" } },
      });
    });

    const b_meta = [["B3", b_bits[0], 255, "1"], ["B2", b_bits[1], 290, "14"], ["B1", b_bits[2], 325, "11"], ["B0", b_bits[3], 360, "9"]];
    b_meta.forEach(([pName, val, yPos]) => {
      components.push({
        id: `PORT_${pName}`, ref: pName, value: String(val), type: "port_input",
        x: 80, y: yPos - 10, width: 50, height: 20,
        pins: { out: { name: pName, pin_number: "", x: 130, y: yPos, dx: 1.0, dy: 0.0, value: val, direction: "output" } },
      });
    });

    const cas_meta = [["IA_GT", "I_A>B", cascade_gt, 410, "4"], ["IA_EQ", "I_A=B", cascade_eq, 450, "3"], ["IA_LT", "I_A<B", cascade_lt, 490, "2"]];
    cas_meta.forEach(([portId, lbl, val, yPos]) => {
      components.push({
        id: `PORT_${portId}`, ref: lbl, value: String(val), type: "port_select",
        x: 80, y: yPos - 10, width: 65, height: 20,
        pins: { out: { name: lbl, pin_number: "", x: 145, y: yPos, dx: 1.0, dy: 0.0, value: val, direction: "output" } },
      });
    });

    components.push({
      id: "U1", ref: "U1", value: "74LS85", type: "ic_block", x: 440, y: 70, width: 220, height: 450,
      pins: {
        A3: { name: "A3", pin_number: "15", x: 440, y: 100, dx: -1.0, dy: 0.0, value: a_bits[0], direction: "input" },
        A2: { name: "A2", pin_number: "13", x: 440, y: 135, dx: -1.0, dy: 0.0, value: a_bits[1], direction: "input" },
        A1: { name: "A1", pin_number: "12", x: 440, y: 170, dx: -1.0, dy: 0.0, value: a_bits[2], direction: "input" },
        A0: { name: "A0", pin_number: "10", x: 440, y: 205, dx: -1.0, dy: 0.0, value: a_bits[3], direction: "input" },
        B3: { name: "B3", pin_number: "1",  x: 440, y: 255, dx: -1.0, dy: 0.0, value: b_bits[0], direction: "input" },
        B2: { name: "B2", pin_number: "14", x: 440, y: 290, dx: -1.0, dy: 0.0, value: b_bits[1], direction: "input" },
        B1: { name: "B1", pin_number: "11", x: 440, y: 325, dx: -1.0, dy: 0.0, value: b_bits[2], direction: "input" },
        B0: { name: "B0", pin_number: "9",  x: 440, y: 360, dx: -1.0, dy: 0.0, value: b_bits[3], direction: "input" },
        IA_GT: { name: "IA>B", pin_number: "4", x: 440, y: 410, dx: -1.0, dy: 0.0, value: cascade_gt, direction: "input" },
        IA_EQ: { name: "IA=B", pin_number: "3", x: 440, y: 450, dx: -1.0, dy: 0.0, value: cascade_eq, direction: "input" },
        IA_LT: { name: "IA<B", pin_number: "2", x: 440, y: 490, dx: -1.0, dy: 0.0, value: cascade_lt, direction: "input" },
        OA_GT: { name: "OA>B", pin_number: "5", x: 660, y: 200, dx: 1.0, dy: 0.0, value: out_gt, direction: "output" },
        OA_EQ: { name: "OA=B", pin_number: "6", x: 660, y: 275, dx: 1.0, dy: 0.0, value: out_eq, direction: "output" },
        OA_LT: { name: "OA<B", pin_number: "7", x: 660, y: 350, dx: 1.0, dy: 0.0, value: out_lt, direction: "output" },
      },
    });

    const out_meta = [["OA_GT", "OA>B", out_gt, 200], ["OA_EQ", "OA=B", out_eq, 275], ["OA_LT", "OA<B", out_lt, 350]];
    out_meta.forEach(([portId, lbl, val, yPos]) => {
      components.push({
        id: `PORT_${portId}`, ref: lbl, value: String(val), type: "port_output",
        x: 800, y: yPos - 10, width: 65, height: 20,
        pins: { in: { name: lbl, pin_number: "", x: 800, y: yPos, dx: -1.0, dy: 0.0, value: val, direction: "input" } },
      });
    });

    const wires = [];
    a_meta.forEach(([pName, val, yPos]) => wires.push({ id: `w_${pName}`, net: pName, path: `M 130,${yPos} L 440,${yPos}`, value: val }));
    b_meta.forEach(([pName, val, yPos]) => wires.push({ id: `w_${pName}`, net: pName, path: `M 130,${yPos} L 440,${yPos}`, value: val }));
    cas_meta.forEach(([portId, lbl, val, yPos]) => wires.push({ id: `w_${portId}`, net: lbl, path: `M 145,${yPos} L 440,${yPos}`, value: val }));
    out_meta.forEach(([portId, lbl, val, yPos]) => wires.push({ id: `w_${portId}`, net: lbl, path: `M 660,${yPos} L 800,${yPos}`, value: val }));

    return {
      circuit_id: "comparator_4bit",
      title: "4-Bit Magnitude Comparator (IC 74LS85)",
      sheet_info: { title: "4-Bit Magnitude Comparator (IC 74LS85)", file: "comparator_74ls85.kicad_sch", size: "A4", rev: "v1.0" },
      canvas: { width: 1050, height: 620 },
      components, wires, junctions: [],
      state: {
        a, b, cascade_gt, cascade_lt, cascade_eq,
        details: { a_decimal: aDec, b_decimal: bDec, a_gt_b: out_gt, a_lt_b: out_lt, a_eq_b: out_eq, decision_stage: decision },
      },
    };
  }

  function fallbackAddSub4(a, b, mode) {
    const aDec = parseInt(a, 2);
    const bDec = parseInt(b, 2);

    const a_bits = [int(a[0]), int(a[1]), int(a[2]), int(a[3])];
    const b_bits = [int(b[0]), int(b[1]), int(b[2]), int(b[3])];
    const b_eff = b_bits.map(bit => bit ^ mode);

    let carry = mode;
    const s_rev = [];
    for (let i = 3; i >= 0; i--) {
      const sum = a_bits[i] ^ b_eff[i] ^ carry;
      carry = (a_bits[i] & b_eff[i]) | (carry & (a_bits[i] ^ b_eff[i]));
      s_rev.push(sum);
    }
    const s_bits = s_rev.reverse();
    const sumStr = s_bits.join("");
    const finalCout = carry;
    const borrowVal = mode === 1 ? 1 - finalCout : null;

    const components = [];
    const a_meta = [["A0", a_bits[3], 100, "10", "A1"], ["A1", a_bits[2], 140, "8", "A2"], ["A2", a_bits[1], 180, "3", "A3"], ["A3", a_bits[0], 220, "1", "A4"]];
    a_meta.forEach(([pName, val, yPos]) => {
      components.push({
        id: `PORT_${pName}`, ref: pName, value: String(val), type: "port_input",
        x: 70, y: yPos - 10, width: 50, height: 20,
        pins: { out: { name: pName, pin_number: "", x: 120, y: yPos, dx: 1.0, dy: 0.0, value: val, direction: "output" } },
      });
    });

    const b_meta = [
      ["B0", b_bits[3], b_eff[3], 300, "U1A", "11", "B1"],
      ["B1", b_bits[2], b_eff[2], 380, "U1B", "7",  "B2"],
      ["B2", b_bits[1], b_eff[1], 460, "U1C", "4",  "B3"],
      ["B3", b_bits[0], b_eff[0], 540, "U1D", "16", "B4"],
    ];
    b_meta.forEach(([pName, val, effVal, yPos, xorRef]) => {
      components.push({
        id: `PORT_${pName}`, ref: pName, value: String(val), type: "port_input",
        x: 70, y: yPos - 10, width: 50, height: 20,
        pins: { out: { name: pName, pin_number: "", x: 120, y: yPos, dx: 1.0, dy: 0.0, value: val, direction: "output" } },
      });
      components.push({
        id: xorRef, ref: xorRef, value: "74LS86", type: "xor_gate",
        x: 260, y: yPos - 20, width: 65, height: 40,
        pins: {
          A: { name: "1A", pin_number: "1", x: 260, y: yPos - 8, dx: -1.0, dy: 0.0, value: val, direction: "input" },
          B: { name: "1B", pin_number: "2", x: 260, y: yPos + 8, dx: -1.0, dy: 0.0, value: mode, direction: "input" },
          Y: { name: "1Y", pin_number: "3", x: 325, y: yPos, dx: 1.0, dy: 0.0, value: effVal, direction: "output" },
        },
      });
    });

    components.push({
      id: "PORT_MODE", ref: "M", value: String(mode), type: "port_select",
      x: 70, y: 620, width: 65, height: 20,
      pins: { out: { name: "M", pin_number: "", x: 135, y: 630, dx: 1.0, dy: 0.0, value: mode, direction: "output" } },
    });

    components.push({
      id: "U2", ref: "U2", value: "74LS83", type: "ic_block", x: 480, y: 70, width: 220, height: 540,
      pins: {
        A1: { name: "A1", pin_number: "10", x: 480, y: 100, dx: -1.0, dy: 0.0, value: a_bits[3], direction: "input" },
        A2: { name: "A2", pin_number: "8",  x: 480, y: 140, dx: -1.0, dy: 0.0, value: a_bits[2], direction: "input" },
        A3: { name: "A3", pin_number: "3",  x: 480, y: 180, dx: -1.0, dy: 0.0, value: a_bits[1], direction: "input" },
        A4: { name: "A4", pin_number: "1",  x: 480, y: 220, dx: -1.0, dy: 0.0, value: a_bits[0], direction: "input" },
        B1: { name: "B1", pin_number: "11", x: 480, y: 300, dx: -1.0, dy: 0.0, value: b_eff[3], direction: "input" },
        B2: { name: "B2", pin_number: "7",  x: 480, y: 380, dx: -1.0, dy: 0.0, value: b_eff[2], direction: "input" },
        B3: { name: "B3", pin_number: "4",  x: 480, y: 460, dx: -1.0, dy: 0.0, value: b_eff[1], direction: "input" },
        B4: { name: "B4", pin_number: "16", x: 480, y: 540, dx: -1.0, dy: 0.0, value: b_eff[0], direction: "input" },
        C0: { name: "C0", pin_number: "13", x: 480, y: 580, dx: -1.0, dy: 0.0, value: mode, direction: "input" },
        S1: { name: "Σ1", pin_number: "9",  x: 700, y: 140, dx: 1.0, dy: 0.0, value: s_bits[3], direction: "output" },
        S2: { name: "Σ2", pin_number: "6",  x: 700, y: 200, dx: 1.0, dy: 0.0, value: s_bits[2], direction: "output" },
        S3: { name: "Σ3", pin_number: "2",  x: 700, y: 260, dx: 1.0, dy: 0.0, value: s_bits[1], direction: "output" },
        S4: { name: "Σ4", pin_number: "15", x: 700, y: 320, dx: 1.0, dy: 0.0, value: s_bits[0], direction: "output" },
        C4: { name: "C4", pin_number: "14", x: 700, y: 420, dx: 1.0, dy: 0.0, value: finalCout, direction: "output" },
      },
    });

    const s_meta = [["S0", s_bits[3], 140, "S1"], ["S1", s_bits[2], 200, "S2"], ["S2", s_bits[1], 260, "S3"], ["S3", s_bits[0], 320, "S4"]];
    s_meta.forEach(([pName, val, yPos]) => {
      components.push({
        id: `PORT_${pName}`, ref: pName, value: String(val), type: "port_output",
        x: 840, y: yPos - 10, width: 50, height: 20,
        pins: { in: { name: pName, pin_number: "", x: 840, y: yPos, dx: -1.0, dy: 0.0, value: val, direction: "input" } },
      });
    });

    const flagLbl = mode === 0 ? "Cout" : "Borrow";
    const flagVal = mode === 0 ? finalCout : borrowVal;
    components.push({
      id: "PORT_FLAG", ref: flagLbl, value: String(flagVal), type: "port_output",
      x: 840, y: 410, width: 65, height: 20,
      pins: { in: { name: flagLbl, pin_number: "", x: 840, y: 420, dx: -1.0, dy: 0.0, value: flagVal, direction: "input" } },
    });

    const wires = [];
    a_meta.forEach(([pName, val, yPos]) => wires.push({ id: `w_${pName}`, net: pName, path: `M 120,${yPos} L 480,${yPos}`, value: val }));
    b_meta.forEach(([pName, val, effVal, yPos, xorRef]) => wires.push({ id: `w_${pName}`, net: pName, path: `M 120,${yPos} L 210,{yPos} L 210,${yPos - 8} L 260,${yPos - 8}`, value: val }));
    wires.push({ id: "w_mode_trunk", net: "MODE", path: "M 135,630 L 230,630 L 230,548 L 260,548", value: mode });
    wires.push({ id: "w_mode_u1c", net: "MODE", path: "M 230,548 L 230,468 L 260,468", value: mode });
    wires.push({ id: "w_mode_u1b", net: "MODE", path: "M 230,468 L 230,388 L 260,388", value: mode });
    wires.push({ id: "w_mode_u1a", net: "MODE", path: "M 230,388 L 230,308 L 260,308", value: mode });
    wires.push({ id: "w_mode_c0", net: "C0", path: "M 230,630 L 400,630 L 400,580 L 480,580", value: mode });
    b_meta.forEach(([pName, val, effVal, yPos, xorRef, pinNum, icPin]) => wires.push({ id: `w_eff_${pName}`, net: `${pName}_EFF`, path: `M 325,${yPos} L 480,${yPos}`, value: effVal }));
    s_meta.forEach(([pName, val, yPos, icPin]) => wires.push({ id: `w_${pName}`, net: pName, path: `M 700,${yPos} L 840,${yPos}`, value: val }));
    wires.push({ id: "w_cout_borrow", net: flagLbl, path: "M 700,420 L 840,420", value: flagVal });

    return {
      circuit_id: "adder_subtractor_4bit",
      title: "4-Bit Adder / Subtractor (IC 74LS83 + 74LS86)",
      sheet_info: { title: "4-Bit Adder / Subtractor (IC 74LS83 + 74LS86)", file: "adder_subtractor_74ls83.kicad_sch", size: "A4", rev: "v1.0" },
      canvas: { width: 1100, height: 680 },
      components, wires,
      junctions: [{ x: 230, y: 548, value: mode }, { x: 230, y: 468, value: mode }, { x: 230, y: 388, value: mode }, { x: 230, y: 630, value: mode }],
      state: {
        a, b, mode, sum: sumStr, carry_out: mode === 0 ? finalCout : null, borrow: borrowVal,
        details: { a_decimal: aDec, b_decimal: bDec, result_decimal: mode === 0 ? aDec + bDec : aDec - bDec },
      },
    };
  }

  function fallbackCounter74LS90(qa, qb, qc, qd, r0_1, r0_2, r9_1, r9_2, cascade, mode) {
    const decVal = (qd << 3) | (qc << 2) | (qb << 1) | qa;
    const binStr = `${qd}${qc}${qb}${qa}`;
    const modTitle = mode === "mod10"
      ? "Mod-10 (BCD Counter)"
      : (mode === "mod6"
        ? "Mod-6 Counter (QC·QB Reset)"
        : (mode === "mod5" ? "Mod-5 (÷5 Section)" : "Mod-2 (÷2 Section)"));

    const components = [];
    const wires = [];
    const junctions = [];

    // Left Input Ports
    components.push({
      id: "PORT_CP0", ref: "CLK_A", value: "0", type: "port_input",
      x: 80, y: 140, width: 60, height: 20,
      pins: { out: { name: "CLK_A", pin_number: "", x: 140, y: 150, dx: 1.0, dy: 0.0, value: 0, direction: "output" } },
    });
    wires.push({ id: "w_cp0", net: "CP0", path: "M 140,150 L 420,150", value: 0 });

    if (!cascade) {
      components.push({
        id: "PORT_CP1", ref: "CLK_B", value: "0", type: "port_input",
        x: 80, y: 200, width: 60, height: 20,
        pins: { out: { name: "CLK_B", pin_number: "", x: 140, y: 210, dx: 1.0, dy: 0.0, value: 0, direction: "output" } },
      });
      wires.push({ id: "w_cp1", net: "CP1", path: "M 140,210 L 420,210", value: 0 });
    }

    components.push({
      id: "PORT_R0_1", ref: "R0(1)", value: String(r0_1), type: "port_select",
      x: 80, y: 260, width: 60, height: 20,
      pins: { out: { name: "R0(1)", pin_number: "", x: 140, y: 270, dx: 1.0, dy: 0.0, value: r0_1, direction: "output" } },
    });
    wires.push({ id: "w_r0_1", net: "R0_1", path: "M 140,270 L 420,270", value: r0_1 });

    components.push({
      id: "PORT_R0_2", ref: "R0(2)", value: String(r0_2), type: "port_select",
      x: 80, y: 300, width: 60, height: 20,
      pins: { out: { name: "R0(2)", pin_number: "", x: 140, y: 310, dx: 1.0, dy: 0.0, value: r0_2, direction: "output" } },
    });
    wires.push({ id: "w_r0_2", net: "R0_2", path: "M 140,310 L 420,310", value: r0_2 });

    components.push({
      id: "PORT_R9_1", ref: "R9(1)", value: String(r9_1), type: "port_select",
      x: 80, y: 360, width: 60, height: 20,
      pins: { out: { name: "R9(1)", pin_number: "", x: 140, y: 370, dx: 1.0, dy: 0.0, value: r9_1, direction: "output" } },
    });
    wires.push({ id: "w_r9_1", net: "R9_1", path: "M 140,370 L 420,370", value: r9_1 });

    components.push({
      id: "PORT_R9_2", ref: "R9(2)", value: String(r9_2), type: "port_select",
      x: 80, y: 400, width: 60, height: 20,
      pins: { out: { name: "R9(2)", pin_number: "", x: 140, y: 410, dx: 1.0, dy: 0.0, value: r9_2, direction: "output" } },
    });
    wires.push({ id: "w_r9_2", net: "R9_2", path: "M 140,410 L 420,410", value: r9_2 });

    components.push({
      id: "PORT_VCC", ref: "+5V", value: "1", type: "port_select",
      x: 80, y: 460, width: 60, height: 20,
      pins: { out: { name: "+5V", pin_number: "", x: 140, y: 470, dx: 1.0, dy: 0.0, value: 1, direction: "output" } },
    });
    wires.push({ id: "w_vcc", net: "VCC", path: "M 140,470 L 420,470", value: 1 });

    // Center U1 IC 74LS90
    components.push({
      id: "U1", ref: "U1", value: "74LS90", type: "ic_block",
      x: 420, y: 110, width: 220, height: 420,
      pins: {
        CP0:  { name: "CP0", pin_number: "14", x: 420, y: 150, dx: -1.0, dy: 0.0, value: 0, direction: "input" },
        CP1:  { name: "CP1", pin_number: "1",  x: 420, y: 210, dx: -1.0, dy: 0.0, value: cascade ? qa : 0, direction: "input" },
        R0_1: { name: "R0(1)", pin_number: "2", x: 420, y: 270, dx: -1.0, dy: 0.0, value: r0_1, direction: "input" },
        R0_2: { name: "R0(2)", pin_number: "3", x: 420, y: 310, dx: -1.0, dy: 0.0, value: r0_2, direction: "input" },
        R9_1: { name: "R9(1)", pin_number: "6", x: 420, y: 370, dx: -1.0, dy: 0.0, value: r9_1, direction: "input" },
        R9_2: { name: "R9(2)", pin_number: "7", x: 420, y: 410, dx: -1.0, dy: 0.0, value: r9_2, direction: "input" },
        VCC:  { name: "VCC", pin_number: "5",  x: 420, y: 470, dx: -1.0, dy: 0.0, value: 1, direction: "input" },
        QA:   { name: "QA (÷2)", pin_number: "12", x: 640, y: 150, dx: 1.0, dy: 0.0, value: qa, direction: "output" },
        QB:   { name: "QB", pin_number: "9",   x: 640, y: 230, dx: 1.0, dy: 0.0, value: qb, direction: "output" },
        QC:   { name: "QC", pin_number: "8",   x: 640, y: 300, dx: 1.0, dy: 0.0, value: qc, direction: "output" },
        QD:   { name: "QD (÷5)", pin_number: "11", x: 640, y: 370, dx: 1.0, dy: 0.0, value: qd, direction: "output" },
        GND:  { name: "GND", pin_number: "10", x: 640, y: 470, dx: 1.0, dy: 0.0, value: 0, direction: "output" },
      },
    });

    // Right Output Ports
    components.push({
      id: "PORT_QA", ref: "QA", value: String(qa), type: "port_output",
      x: 820, y: 140, width: 60, height: 20,
      pins: { in: { name: "QA", pin_number: "", x: 820, y: 150, dx: -1.0, dy: 0.0, value: qa, direction: "input" } },
    });
    wires.push({ id: "w_qa", net: "QA", path: "M 640,150 L 820,150", value: qa });

    components.push({
      id: "PORT_QB", ref: "QB", value: String(qb), type: "port_output",
      x: 820, y: 220, width: 60, height: 20,
      pins: { in: { name: "QB", pin_number: "", x: 820, y: 230, dx: -1.0, dy: 0.0, value: qb, direction: "input" } },
    });
    wires.push({ id: "w_qb", net: "QB", path: "M 640,230 L 820,230", value: qb });

    components.push({
      id: "PORT_QC", ref: "QC", value: String(qc), type: "port_output",
      x: 820, y: 290, width: 60, height: 20,
      pins: { in: { name: "QC", pin_number: "", x: 820, y: 300, dx: -1.0, dy: 0.0, value: qc, direction: "input" } },
    });
    wires.push({ id: "w_qc", net: "QC", path: "M 640,300 L 820,300", value: qc });

    components.push({
      id: "PORT_QD", ref: "QD", value: String(qd), type: "port_output",
      x: 820, y: 360, width: 60, height: 20,
      pins: { in: { name: "QD", pin_number: "", x: 820, y: 370, dx: -1.0, dy: 0.0, value: qd, direction: "input" } },
    });
    wires.push({ id: "w_qd", net: "QD", path: "M 640,370 L 820,370", value: qd });

    components.push({
      id: "PORT_GND", ref: "GND", value: "0", type: "port_output",
      x: 820, y: 460, width: 60, height: 20,
      pins: { in: { name: "GND", pin_number: "", x: 820, y: 470, dx: -1.0, dy: 0.0, value: 0, direction: "input" } },
    });
    wires.push({ id: "w_gnd", net: "GND", path: "M 640,470 L 820,470", value: 0 });

    // Cascade Jumper Wire (QA -> CP1)
    if (cascade) {
      wires.push({
        id: "w_cascade_jumper",
        net: "QA_CASCADE",
        path: "M 670,150 L 670,75 L 370,75 L 370,210 L 420,210",
        value: qa,
      });
      junctions.push({ x: 670, y: 150, value: qa });
    }

    // Feedback Reset Wires for Mod-6 (QC -> R0_1, QB -> R0_2)
    if (mode === "mod6") {
      wires.push({
        id: "w_mod6_qc",
        net: "FEEDBACK_QC",
        path: "M 700,300 L 700,535 L 330,535 L 330,270 L 420,270",
        value: qc,
      });
      junctions.push({ x: 700, y: 300, value: qc });

      wires.push({
        id: "w_mod6_qb",
        net: "FEEDBACK_QB",
        path: "M 730,230 L 730,555 L 310,555 L 310,310 L 420,310",
        value: qb,
      });
      junctions.push({ x: 730, y: 230, value: qb });
    }

    return {
      circuit_id: "counter_74ls90",
      title: "Decade / BCD Modulo Counter (IC 74LS90)",
      sheet_info: { title: "IC 74LS90 DECADE / BCD COUNTER", file: "counter_74ls90.kicad_sch", size: "A4", rev: "v1.0" },
      canvas: { width: 1100, height: 680 },
      components, wires, junctions,
      state: {
        qa, qb, qc, qd, r0_1, r0_2, r9_1, r9_2, cascade, mode,
        details: { decimal: decVal, binary: binStr, mod_title: modTitle },
      },
    };
  }

  function fallbackCounter74LS93(qa, qb, qc, qd, r0_1, r0_2, cascade, mode) {
    const decVal = (qd << 3) | (qc << 2) | (qb << 1) | qa;
    const binStr = `${qd}${qc}${qb}${qa}`;
    const modTitle = mode === "mod16"
      ? "Mod-16 (4-Bit Binary Counter)"
      : (mode === "mod12"
        ? "Mod-12 Counter (QD·QC Reset)"
        : (mode === "mod8" ? "Mod-8 (÷8 Section)" : "Mod-2 (÷2 Section)"));

    const components = [];
    const wires = [];
    const junctions = [];

    // Left Input Ports
    components.push({
      id: "PORT_CP0", ref: "CLK_A", value: "0", type: "port_input",
      x: 80, y: 140, width: 60, height: 20,
      pins: { out: { name: "CLK_A", pin_number: "", x: 140, y: 150, dx: 1.0, dy: 0.0, value: 0, direction: "output" } },
    });
    wires.push({ id: "w_cp0", net: "CP0", path: "M 140,150 L 420,150", value: 0 });

    if (!cascade) {
      components.push({
        id: "PORT_CP1", ref: "CLK_B", value: "0", type: "port_input",
        x: 80, y: 200, width: 60, height: 20,
        pins: { out: { name: "CLK_B", pin_number: "", x: 140, y: 210, dx: 1.0, dy: 0.0, value: 0, direction: "output" } },
      });
      wires.push({ id: "w_cp1", net: "CP1", path: "M 140,210 L 420,210", value: 0 });
    }

    components.push({
      id: "PORT_R0_1", ref: "R0(1)", value: String(r0_1), type: "port_select",
      x: 80, y: 270, width: 60, height: 20,
      pins: { out: { name: "R0(1)", pin_number: "", x: 140, y: 280, dx: 1.0, dy: 0.0, value: r0_1, direction: "output" } },
    });
    wires.push({ id: "w_r0_1", net: "R0_1", path: "M 140,280 L 420,280", value: r0_1 });

    components.push({
      id: "PORT_R0_2", ref: "R0(2)", value: String(r0_2), type: "port_select",
      x: 80, y: 310, width: 60, height: 20,
      pins: { out: { name: "R0(2)", pin_number: "", x: 140, y: 320, dx: 1.0, dy: 0.0, value: r0_2, direction: "output" } },
    });
    wires.push({ id: "w_r0_2", net: "R0_2", path: "M 140,320 L 420,320", value: r0_2 });

    components.push({
      id: "PORT_VCC", ref: "+5V", value: "1", type: "port_select",
      x: 80, y: 460, width: 60, height: 20,
      pins: { out: { name: "+5V", pin_number: "", x: 140, y: 470, dx: 1.0, dy: 0.0, value: 1, direction: "output" } },
    });
    wires.push({ id: "w_vcc", net: "VCC", path: "M 140,470 L 420,470", value: 1 });

    // Center U1 IC 74LS93
    components.push({
      id: "U1", ref: "U1", value: "74LS93", type: "ic_block",
      x: 420, y: 110, width: 220, height: 420,
      pins: {
        CP0:  { name: "CP0", pin_number: "14", x: 420, y: 150, dx: -1.0, dy: 0.0, value: 0, direction: "input" },
        CP1:  { name: "CP1", pin_number: "1",  x: 420, y: 210, dx: -1.0, dy: 0.0, value: cascade ? qa : 0, direction: "input" },
        R0_1: { name: "R0(1)", pin_number: "2", x: 420, y: 280, dx: -1.0, dy: 0.0, value: r0_1, direction: "input" },
        R0_2: { name: "R0(2)", pin_number: "3", x: 420, y: 320, dx: -1.0, dy: 0.0, value: r0_2, direction: "input" },
        NC4:  { name: "NC", pin_number: "4",   x: 420, y: 380, dx: -1.0, dy: 0.0, value: 0, direction: "input" },
        VCC:  { name: "VCC", pin_number: "5",  x: 420, y: 470, dx: -1.0, dy: 0.0, value: 1, direction: "input" },
        QA:   { name: "QA (÷2)", pin_number: "12", x: 640, y: 150, dx: 1.0, dy: 0.0, value: qa, direction: "output" },
        QB:   { name: "QB", pin_number: "9",   x: 640, y: 230, dx: 1.0, dy: 0.0, value: qb, direction: "output" },
        QC:   { name: "QC", pin_number: "8",   x: 640, y: 300, dx: 1.0, dy: 0.0, value: qc, direction: "output" },
        QD:   { name: "QD (÷8)", pin_number: "11", x: 640, y: 370, dx: 1.0, dy: 0.0, value: qd, direction: "output" },
        GND:  { name: "GND", pin_number: "10", x: 640, y: 470, dx: 1.0, dy: 0.0, value: 0, direction: "output" },
      },
    });

    // Right Output Ports
    components.push({
      id: "PORT_QA", ref: "QA", value: String(qa), type: "port_output",
      x: 820, y: 140, width: 60, height: 20,
      pins: { in: { name: "QA", pin_number: "", x: 820, y: 150, dx: -1.0, dy: 0.0, value: qa, direction: "input" } },
    });
    wires.push({ id: "w_qa", net: "QA", path: "M 640,150 L 820,150", value: qa });

    components.push({
      id: "PORT_QB", ref: "QB", value: String(qb), type: "port_output",
      x: 820, y: 220, width: 60, height: 20,
      pins: { in: { name: "QB", pin_number: "", x: 820, y: 230, dx: -1.0, dy: 0.0, value: qb, direction: "input" } },
    });
    wires.push({ id: "w_qb", net: "QB", path: "M 640,230 L 820,230", value: qb });

    components.push({
      id: "PORT_QC", ref: "QC", value: String(qc), type: "port_output",
      x: 820, y: 290, width: 60, height: 20,
      pins: { in: { name: "QC", pin_number: "", x: 820, y: 300, dx: -1.0, dy: 0.0, value: qc, direction: "input" } },
    });
    wires.push({ id: "w_qc", net: "QC", path: "M 640,300 L 820,300", value: qc });

    components.push({
      id: "PORT_QD", ref: "QD", value: String(qd), type: "port_output",
      x: 820, y: 360, width: 60, height: 20,
      pins: { in: { name: "QD", pin_number: "", x: 820, y: 370, dx: -1.0, dy: 0.0, value: qd, direction: "input" } },
    });
    wires.push({ id: "w_qd", net: "QD", path: "M 640,370 L 820,370", value: qd });

    components.push({
      id: "PORT_GND", ref: "GND", value: "0", type: "port_output",
      x: 820, y: 460, width: 60, height: 20,
      pins: { in: { name: "GND", pin_number: "", x: 820, y: 470, dx: -1.0, dy: 0.0, value: 0, direction: "input" } },
    });
    wires.push({ id: "w_gnd", net: "GND", path: "M 640,470 L 820,470", value: 0 });

    // Cascade Jumper Wire (QA -> CP1)
    if (cascade) {
      wires.push({
        id: "w_cascade_jumper",
        net: "QA_CASCADE",
        path: "M 670,150 L 670,75 L 370,75 L 370,210 L 420,210",
        value: qa,
      });
      junctions.push({ x: 670, y: 150, value: qa });
    }

    // Feedback Reset Wires for Mod-12 (QD -> R0_1, QC -> R0_2)
    if (mode === "mod12") {
      wires.push({
        id: "w_mod12_qd",
        net: "FEEDBACK_QD",
        path: "M 700,370 L 700,535 L 330,535 L 330,280 L 420,280",
        value: qd,
      });
      junctions.push({ x: 700, y: 370, value: qd });

      wires.push({
        id: "w_mod12_qc",
        net: "FEEDBACK_QC",
        path: "M 730,300 L 730,555 L 310,555 L 310,320 L 420,320",
        value: qc,
      });
      junctions.push({ x: 730, y: 300, value: qc });
    }

    return {
      circuit_id: "counter_74ls93",
      title: "4-Bit Binary Ripple Counter (IC 74LS93)",
      sheet_info: { title: "IC 74LS93 4-BIT BINARY COUNTER", file: "counter_74ls93.kicad_sch", size: "A4", rev: "v1.0" },
      canvas: { width: 1100, height: 680 },
      components, wires, junctions,
      state: {
        qa, qb, qc, qd, r0_1, r0_2, cascade, mode,
        details: { decimal: decVal, binary: binStr, mod_title: modTitle },
      },
    };
  }

  function fallbackFlipFlop74LS74(clk, d, pr_n, clr_n, q, q_bar) {
    const components = [];
    const wires = [];
    const junctions = [];

    // Left Input Ports
    components.push({
      id: "PORT_PR", ref: "~1PR", value: String(pr_n), type: "port_select",
      x: 80, y: 150, width: 60, height: 20,
      pins: { out: { name: "~1PR", pin_number: "", x: 140, y: 160, dx: 1.0, dy: 0.0, value: pr_n, direction: "output" } },
    });
    wires.push({ id: "w_pr", net: "1PR_N", path: "M 140,160 L 420,160", value: pr_n });

    components.push({
      id: "PORT_D", ref: "1D", value: String(d), type: "port_input",
      x: 80, y: 230, width: 60, height: 20,
      pins: { out: { name: "1D", pin_number: "", x: 140, y: 240, dx: 1.0, dy: 0.0, value: d, direction: "output" } },
    });
    wires.push({ id: "w_d", net: "1D", path: "M 140,240 L 420,240", value: d });

    components.push({
      id: "PORT_CLK", ref: "1CLK", value: String(clk), type: "port_input",
      x: 80, y: 310, width: 60, height: 20,
      pins: { out: { name: "1CLK", pin_number: "", x: 140, y: 320, dx: 1.0, dy: 0.0, value: clk, direction: "output" } },
    });
    wires.push({ id: "w_clk", net: "1CLK", path: "M 140,320 L 420,320", value: clk });

    components.push({
      id: "PORT_CLR", ref: "~1CLR", value: String(clr_n), type: "port_select",
      x: 80, y: 390, width: 60, height: 20,
      pins: { out: { name: "~1CLR", pin_number: "", x: 140, y: 400, dx: 1.0, dy: 0.0, value: clr_n, direction: "output" } },
    });
    wires.push({ id: "w_clr", net: "1CLR_N", path: "M 140,400 L 420,400", value: clr_n });

    components.push({
      id: "PORT_VCC", ref: "+5V", value: "1", type: "port_select",
      x: 80, y: 470, width: 60, height: 20,
      pins: { out: { name: "+5V", pin_number: "", x: 140, y: 480, dx: 1.0, dy: 0.0, value: 1, direction: "output" } },
    });
    wires.push({ id: "w_vcc", net: "VCC", path: "M 140,480 L 420,480", value: 1 });

    // Center IC U1: 74LS74
    components.push({
      id: "U1", ref: "U1A", value: "74LS74", type: "ic_block",
      x: 420, y: 120, width: 220, height: 400,
      pins: {
        PR:   { name: "~1PR", pin_number: "4",  x: 420, y: 160, dx: -1.0, dy: 0.0, value: pr_n, direction: "input" },
        D:    { name: "1D",   pin_number: "2",  x: 420, y: 240, dx: -1.0, dy: 0.0, value: d,    direction: "input" },
        CLK:  { name: "1CLK", pin_number: "3",  x: 420, y: 320, dx: -1.0, dy: 0.0, value: clk,  direction: "input" },
        CLR:  { name: "~1CLR",pin_number: "1",  x: 420, y: 400, dx: -1.0, dy: 0.0, value: clr_n,direction: "input" },
        VCC:  { name: "VCC",  pin_number: "14", x: 420, y: 480, dx: -1.0, dy: 0.0, value: 1,    direction: "input" },
        Q:    { name: "1Q",   pin_number: "5",  x: 640, y: 220, dx: 1.0,  dy: 0.0, value: q,    direction: "output" },
        QBAR: { name: "~1Q",  pin_number: "6",  x: 640, y: 340, dx: 1.0,  dy: 0.0, value: q_bar,direction: "output" },
        GND:  { name: "GND",  pin_number: "7",  x: 640, y: 480, dx: 1.0,  dy: 0.0, value: 0,    direction: "output" },
      },
    });

    // Right Output Ports
    components.push({
      id: "PORT_Q", ref: "1Q", value: String(q), type: "port_output",
      x: 820, y: 210, width: 60, height: 20,
      pins: { in: { name: "1Q", pin_number: "", x: 820, y: 220, dx: -1.0, dy: 0.0, value: q, direction: "input" } },
    });
    wires.push({ id: "w_q", net: "1Q", path: "M 640,220 L 820,220", value: q });

    components.push({
      id: "PORT_QBAR", ref: "~1Q", value: String(q_bar), type: "port_output",
      x: 820, y: 330, width: 60, height: 20,
      pins: { in: { name: "~1Q", pin_number: "", x: 820, y: 340, dx: -1.0, dy: 0.0, value: q_bar, direction: "input" } },
    });
    wires.push({ id: "w_qbar", net: "1Q_BAR", path: "M 640,340 L 820,340", value: q_bar });

    components.push({
      id: "PORT_GND", ref: "GND", value: "0", type: "port_output",
      x: 820, y: 470, width: 60, height: 20,
      pins: { in: { name: "GND", pin_number: "", x: 820, y: 480, dx: -1.0, dy: 0.0, value: 0, direction: "input" } },
    });
    wires.push({ id: "w_gnd", net: "GND", path: "M 640,480 L 820,480", value: 0 });

    return {
      circuit_id: "flipflop_74ls74",
      title: "Dual D-Type Positive-Edge-Triggered Flip-Flop (IC 74LS74)",
      sheet_info: { title: "IC 74LS74 D-TYPE FLIP-FLOP WITH PRESET & CLEAR", file: "ff_74ls74.kicad_sch", size: "A4", rev: "v1.0" },
      canvas: { width: 1100, height: 680 },
      components, wires, junctions,
      state: { clk, d, pr_n, clr_n, q, q_bar },
    };
  }

  function fallbackFlipFlop74LS76(clk, j, k, pr_n, clr_n, q, q_bar) {
    const components = [];
    const wires = [];
    const junctions = [];

    // Left Input Ports
    components.push({
      id: "PORT_PR", ref: "~1PR", value: String(pr_n), type: "port_select",
      x: 80, y: 130, width: 60, height: 20,
      pins: { out: { name: "~1PR", pin_number: "", x: 140, y: 140, dx: 1.0, dy: 0.0, value: pr_n, direction: "output" } },
    });
    wires.push({ id: "w_pr", net: "1PR_N", path: "M 140,140 L 420,140", value: pr_n });

    components.push({
      id: "PORT_J", ref: "1J", value: String(j), type: "port_input",
      x: 80, y: 200, width: 60, height: 20,
      pins: { out: { name: "1J", pin_number: "", x: 140, y: 210, dx: 1.0, dy: 0.0, value: j, direction: "output" } },
    });
    wires.push({ id: "w_j", net: "1J", path: "M 140,210 L 420,210", value: j });

    components.push({
      id: "PORT_CLK", ref: "1CLK", value: String(clk), type: "port_input",
      x: 80, y: 270, width: 60, height: 20,
      pins: { out: { name: "1CLK", pin_number: "", x: 140, y: 280, dx: 1.0, dy: 0.0, value: clk, direction: "output" } },
    });
    wires.push({ id: "w_clk", net: "1CLK", path: "M 140,280 L 420,280", value: clk });

    components.push({
      id: "PORT_K", ref: "1K", value: String(k), type: "port_input",
      x: 80, y: 340, width: 60, height: 20,
      pins: { out: { name: "1K", pin_number: "", x: 140, y: 350, dx: 1.0, dy: 0.0, value: k, direction: "output" } },
    });
    wires.push({ id: "w_k", net: "1K", path: "M 140,350 L 420,350", value: k });

    components.push({
      id: "PORT_CLR", ref: "~1CLR", value: String(clr_n), type: "port_select",
      x: 80, y: 410, width: 60, height: 20,
      pins: { out: { name: "~1CLR", pin_number: "", x: 140, y: 420, dx: 1.0, dy: 0.0, value: clr_n, direction: "output" } },
    });
    wires.push({ id: "w_clr", net: "1CLR_N", path: "M 140,420 L 420,420", value: clr_n });

    components.push({
      id: "PORT_VCC", ref: "+5V", value: "1", type: "port_select",
      x: 80, y: 480, width: 60, height: 20,
      pins: { out: { name: "+5V", pin_number: "", x: 140, y: 490, dx: 1.0, dy: 0.0, value: 1, direction: "output" } },
    });
    wires.push({ id: "w_vcc", net: "VCC", path: "M 140,490 L 420,490", value: 1 });

    // Center IC U1: 74LS76
    components.push({
      id: "U1", ref: "U1A", value: "74LS76", type: "ic_block",
      x: 420, y: 100, width: 220, height: 430,
      pins: {
        PR:   { name: "~1PR", pin_number: "2",  x: 420, y: 140, dx: -1.0, dy: 0.0, value: pr_n, direction: "input" },
        J:    { name: "1J",   pin_number: "1",  x: 420, y: 210, dx: -1.0, dy: 0.0, value: j,    direction: "input" },
        CLK:  { name: "1CLK", pin_number: "6",  x: 420, y: 280, dx: -1.0, dy: 0.0, value: clk,  direction: "input" },
        K:    { name: "1K",   pin_number: "4",  x: 420, y: 350, dx: -1.0, dy: 0.0, value: k,    direction: "input" },
        CLR:  { name: "~1CLR",pin_number: "3",  x: 420, y: 420, dx: -1.0, dy: 0.0, value: clr_n,direction: "input" },
        VCC:  { name: "VCC",  pin_number: "5",  x: 420, y: 490, dx: -1.0, dy: 0.0, value: 1,    direction: "input" },
        Q:    { name: "1Q",   pin_number: "15", x: 640, y: 210, dx: 1.0,  dy: 0.0, value: q,    direction: "output" },
        QBAR: { name: "~1Q",  pin_number: "14", x: 640, y: 350, dx: 1.0,  dy: 0.0, value: q_bar,direction: "output" },
        GND:  { name: "GND",  pin_number: "13", x: 640, y: 490, dx: 1.0,  dy: 0.0, value: 0,    direction: "output" },
      },
    });

    // Right Output Ports
    components.push({
      id: "PORT_Q", ref: "1Q", value: String(q), type: "port_output",
      x: 820, y: 200, width: 60, height: 20,
      pins: { in: { name: "1Q", pin_number: "", x: 820, y: 210, dx: -1.0, dy: 0.0, value: q, direction: "input" } },
    });
    wires.push({ id: "w_q", net: "1Q", path: "M 640,210 L 820,210", value: q });

    components.push({
      id: "PORT_QBAR", ref: "~1Q", value: String(q_bar), type: "port_output",
      x: 820, y: 340, width: 60, height: 20,
      pins: { in: { name: "~1Q", pin_number: "", x: 820, y: 350, dx: -1.0, dy: 0.0, value: q_bar, direction: "input" } },
    });
    wires.push({ id: "w_qbar", net: "1Q_BAR", path: "M 640,350 L 820,350", value: q_bar });

    components.push({
      id: "PORT_GND", ref: "GND", value: "0", type: "port_output",
      x: 820, y: 480, width: 60, height: 20,
      pins: { in: { name: "GND", pin_number: "", x: 820, y: 490, dx: -1.0, dy: 0.0, value: 0, direction: "input" } },
    });
    wires.push({ id: "w_gnd", net: "GND", path: "M 640,490 L 820,490", value: 0 });

    return {
      circuit_id: "flipflop_74ls76",
      title: "Dual Master-Slave J-K Flip-Flop (IC 74LS76)",
      sheet_info: { title: "IC 74LS76 DUAL MASTER-SLAVE JK FLIP-FLOP", file: "ff_74ls76.kicad_sch", size: "A4", rev: "v1.0" },
      canvas: { width: 1100, height: 680 },
      components, wires, junctions,
      state: { clk, j, k, pr_n, clr_n, q, q_bar },
    };
  }

  function fallbackShiftReg74LS194(s1, s0, clr_n, sr_in, sl_in, d, q) {
    const components = [];
    const wires = [];
    const junctions = [];

    // Left Input Ports
    components.push({
      id: "PORT_S1", ref: "S1", value: String(s1), type: "port_select",
      x: 80, y: 120, width: 60, height: 20,
      pins: { out: { name: "S1", pin_number: "", x: 140, y: 130, dx: 1.0, dy: 0.0, value: s1, direction: "output" } },
    });
    wires.push({ id: "w_s1", net: "S1", path: "M 140,130 L 420,130", value: s1 });

    components.push({
      id: "PORT_S0", ref: "S0", value: String(s0), type: "port_select",
      x: 80, y: 170, width: 60, height: 20,
      pins: { out: { name: "S0", pin_number: "", x: 140, y: 180, dx: 1.0, dy: 0.0, value: s0, direction: "output" } },
    });
    wires.push({ id: "w_s0", net: "S0", path: "M 140,180 L 420,180", value: s0 });

    components.push({
      id: "PORT_SR", ref: "SR_SER", value: String(sr_in), type: "port_input",
      x: 80, y: 220, width: 60, height: 20,
      pins: { out: { name: "SR_SER", pin_number: "", x: 140, y: 230, dx: 1.0, dy: 0.0, value: sr_in, direction: "output" } },
    });
    wires.push({ id: "w_sr", net: "SR_SER", path: "M 140,230 L 420,230", value: sr_in });

    const pLabels = ["A", "B", "C", "D"];
    pLabels.forEach((lbl, i) => {
      const yP = 270 + i * 40;
      components.push({
        id: `PORT_${lbl}`, ref: lbl, value: String(d[i]), type: "port_input",
        x: 80, y: yP - 10, width: 60, height: 20,
        pins: { out: { name: lbl, pin_number: "", x: 140, y: yP, dx: 1.0, dy: 0.0, value: d[i], direction: "output" } },
      });
      wires.push({ id: `w_${lbl}`, net: lbl, path: `M 140,${yP} L 420,${yP}`, value: d[i] });
    });

    components.push({
      id: "PORT_SL", ref: "SL_SER", value: String(sl_in), type: "port_input",
      x: 80, y: 440, width: 60, height: 20,
      pins: { out: { name: "SL_SER", pin_number: "", x: 140, y: 450, dx: 1.0, dy: 0.0, value: sl_in, direction: "output" } },
    });
    wires.push({ id: "w_sl", net: "SL_SER", path: "M 140,450 L 420,450", value: sl_in });

    components.push({
      id: "PORT_CLK", ref: "CLK", value: "0", type: "port_input",
      x: 80, y: 490, width: 60, height: 20,
      pins: { out: { name: "CLK", pin_number: "", x: 140, y: 500, dx: 1.0, dy: 0.0, value: 0, direction: "output" } },
    });
    wires.push({ id: "w_clk", net: "CLK", path: "M 140,500 L 420,500", value: 0 });

    components.push({
      id: "PORT_CLR", ref: "~CLR", value: String(clr_n), type: "port_select",
      x: 80, y: 540, width: 60, height: 20,
      pins: { out: { name: "~CLR", pin_number: "", x: 140, y: 550, dx: 1.0, dy: 0.0, value: clr_n, direction: "output" } },
    });
    wires.push({ id: "w_clr", net: "CLR_N", path: "M 140,550 L 420,550", value: clr_n });

    // Center IC U1: 74LS194
    components.push({
      id: "U1", ref: "U1", value: "74LS194", type: "ic_block",
      x: 420, y: 90, width: 220, height: 500,
      pins: {
        S1:     { name: "S1",     pin_number: "9",  x: 420, y: 130, dx: -1.0, dy: 0.0, value: s1,    direction: "input" },
        S0:     { name: "S0",     pin_number: "10", x: 420, y: 180, dx: -1.0, dy: 0.0, value: s0,    direction: "input" },
        SR_SER: { name: "SR_SER", pin_number: "2",  x: 420, y: 230, dx: -1.0, dy: 0.0, value: sr_in, direction: "input" },
        A:      { name: "A",      pin_number: "3",  x: 420, y: 270, dx: -1.0, dy: 0.0, value: d[0],  direction: "input" },
        B:      { name: "B",      pin_number: "4",  x: 420, y: 310, dx: -1.0, dy: 0.0, value: d[1],  direction: "input" },
        C:      { name: "C",      pin_number: "5",  x: 420, y: 350, dx: -1.0, dy: 0.0, value: d[2],  direction: "input" },
        D:      { name: "D",      pin_number: "6",  x: 420, y: 390, dx: -1.0, dy: 0.0, value: d[3],  direction: "input" },
        SL_SER: { name: "SL_SER", pin_number: "7",  x: 420, y: 450, dx: -1.0, dy: 0.0, value: sl_in, direction: "input" },
        CLK:    { name: "CLK",    pin_number: "11", x: 420, y: 500, dx: -1.0, dy: 0.0, value: 0,     direction: "input" },
        CLR:    { name: "~CLR",   pin_number: "1",  x: 420, y: 550, dx: -1.0, dy: 0.0, value: clr_n, direction: "input" },
        QA:     { name: "QA",     pin_number: "15", x: 640, y: 220, dx: 1.0,  dy: 0.0, value: q[0],  direction: "output" },
        QB:     { name: "QB",     pin_number: "14", x: 640, y: 280, dx: 1.0,  dy: 0.0, value: q[1],  direction: "output" },
        QC:     { name: "QC",     pin_number: "13", x: 640, y: 340, dx: 1.0,  dy: 0.0, value: q[2],  direction: "output" },
        QD:     { name: "QD",     pin_number: "12", x: 640, y: 400, dx: 1.0,  dy: 0.0, value: q[3],  direction: "output" },
        GND:    { name: "GND",    pin_number: "8",  x: 640, y: 550, dx: 1.0,  dy: 0.0, value: 0,     direction: "output" },
      },
    });

    // Right Output Ports
    const qLabels = ["QA", "QB", "QC", "QD"];
    qLabels.forEach((lbl, i) => {
      const yP = 220 + i * 60;
      components.push({
        id: `PORT_${lbl}`, ref: lbl, value: String(q[i]), type: "port_output",
        x: 820, y: yP - 10, width: 60, height: 20,
        pins: { in: { name: lbl, pin_number: "", x: 820, y: yP, dx: -1.0, dy: 0.0, value: q[i], direction: "input" } },
      });
      wires.push({ id: `w_${lbl}`, net: lbl, path: `M 640,${yP} L 820,${yP}`, value: q[i] });
    });

    components.push({
      id: "PORT_GND", ref: "GND", value: "0", type: "port_output",
      x: 820, y: 540, width: 60, height: 20,
      pins: { in: { name: "GND", pin_number: "", x: 820, y: 550, dx: -1.0, dy: 0.0, value: 0, direction: "input" } },
    });
    wires.push({ id: "w_gnd", net: "GND", path: "M 640,550 L 820,550", value: 0 });

    return {
      circuit_id: "shiftreg_74ls194",
      title: "4-Bit Bidirectional Universal Shift Register (IC 74LS194)",
      sheet_info: { title: "IC 74LS194 4-BIT BIDIRECTIONAL UNIVERSAL SHIFT REGISTER", file: "shiftreg_74ls194.kicad_sch", size: "A4", rev: "v1.0" },
      canvas: { width: 1100, height: 680 },
      components, wires, junctions,
      state: { s1, s0, clr_n, sr_in, sl_in, d, q },
    };
  }

  function int(ch) { return parseInt(ch, 10); }

  // Pan and Zoom Controller
  function initPanZoom() {
    const viewport = document.querySelector(".schematic-viewport");
    if (!viewport || !svgRoot) return;

    viewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.15 : 0.85;
      zoom(zoomFactor, e.offsetX, e.offsetY);
    }, { passive: false });

    viewport.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      state.isPanning = true;
      state.panStart = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", (e) => {
      if (!state.isPanning) return;
      const dx = e.clientX - state.panStart.x;
      const dy = e.clientY - state.panStart.y;
      state.panStart = { x: e.clientX, y: e.clientY };

      const rect = svgRoot.getBoundingClientRect();
      const scaleX = state.viewBox.w / rect.width;
      const scaleY = state.viewBox.h / rect.height;

      state.viewBox.x -= dx * scaleX;
      state.viewBox.y -= dy * scaleY;
      applyViewBox();
    });

    window.addEventListener("mouseup", () => {
      state.isPanning = false;
    });
  }

  function zoom(factor, mouseX, mouseY) {
    const rect = svgRoot.getBoundingClientRect();
    const mx = mouseX !== undefined ? mouseX : rect.width / 2;
    const my = mouseY !== undefined ? mouseY : rect.height / 2;

    const svgX = state.viewBox.x + (mx / rect.width) * state.viewBox.w;
    const svgY = state.viewBox.y + (my / rect.height) * state.viewBox.h;

    const newW = state.viewBox.w * factor;
    const newH = state.viewBox.h * factor;

    if (newW < 240 || newW > 6000) return;

    state.viewBox.x = svgX - (mx / rect.width) * newW;
    state.viewBox.y = svgY - (my / rect.height) * newH;
    state.viewBox.w = newW;
    state.viewBox.h = newH;

    applyViewBox();
  }

  function resetZoom() {
    state.viewBox = { ...state.initialViewBox };
    applyViewBox();
  }

  function applyViewBox() {
    svgRoot.setAttribute(
      "viewBox",
      `${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.w} ${state.viewBox.h}`
    );
  }

  function createSVGElement(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    return el;
  }
})();
