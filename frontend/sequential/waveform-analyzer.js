/**
 * frontend/sequential/waveform-analyzer.js
 * Multi-Channel Real-Time Digital Waveform Logic Analyzer
 * For ADE Made Easy — Sequential Logic Track
 */

class DigitalWaveformAnalyzer {
  constructor(canvasId, options = {}) {
    this.canvas = typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId;
    if (!this.canvas) {
      console.warn("Waveform Analyzer canvas not found:", canvasId);
      return;
    }
    this.ctx = this.canvas.getContext("2d");
    this.maxSamples = options.maxSamples || 120;
    this.sampleInterval = options.sampleInterval || 100; // ms
    this.channels = [
      { id: "clk", name: "CLK (Clock)", color: "#e9bd4f", data: [] },
      { id: "in1", name: "Input 1 (D / J / A)", color: "#38bdf8", data: [] },
      { id: "in2", name: "Input 2 (K / B)", color: "#a855f7", data: [] },
      { id: "q0",  name: "Output Q0 (QA / LSB)", color: "#10b981", data: [] },
      { id: "q1",  name: "Output Q1 (QB)", color: "#34d399", data: [] },
      { id: "q2",  name: "Output Q2 (QC)", color: "#06b6d4", data: [] },
      { id: "q3",  name: "Output Q3 (QD / MSB)", color: "#6366f1", data: [] }
    ];
    this.isRecording = true;
    this.timeScale = 1.0;
    this.initCanvasSize();
    this.startRenderLoop();
  }

  initCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = this.canvas.width = rect.width || 800;
    this.height = this.canvas.height = rect.height || 260;
  }

  pushSample(sampleMap) {
    if (!this.isRecording) return;
    const timestamp = Date.now();
    this.channels.forEach(ch => {
      const val = (sampleMap[ch.id] !== undefined) ? (sampleMap[ch.id] ? 1 : 0) : (ch.data.length ? ch.data[ch.data.length - 1].val : 0);
      ch.data.push({ time: timestamp, val: val });
      if (ch.data.length > this.maxSamples) {
        ch.data.shift();
      }
    });
    this.draw();
  }

  clear() {
    this.channels.forEach(ch => ch.data = []);
    this.draw();
  }

  setRecording(enable) {
    this.isRecording = !!enable;
  }

  startRenderLoop() {
    window.addEventListener("resize", () => {
      this.initCanvasSize();
      this.draw();
    });
    this.draw();
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "#162032";
    ctx.lineWidth = 1;
    const stepX = 24 * this.timeScale;
    for (let x = 0; x < w; x += stepX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const visibleChannels = this.channels;
    const rowHeight = h / (visibleChannels.length || 1);
    const traceHeight = rowHeight * 0.55;

    visibleChannels.forEach((ch, idx) => {
      const rowY = idx * rowHeight;
      const baselineY = rowY + rowHeight - 6;
      const highY = baselineY - traceHeight;

      // Channel Separator line
      ctx.strokeStyle = "#1b2942";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rowY + rowHeight);
      ctx.lineTo(w, rowY + rowHeight);
      ctx.stroke();

      // Channel Label
      ctx.font = "bold 11px 'DM Mono', monospace";
      ctx.fillStyle = ch.color;
      ctx.fillText(ch.name, 12, rowY + 16);

      // Draw digital trace
      const data = ch.data;
      if (data.length < 2) return;

      const sampleCount = data.length;
      const stepWidth = Math.min(22 * this.timeScale, (w - 180) / this.maxSamples);
      const startX = w - (sampleCount * stepWidth) - 16;

      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "miter";
      ctx.beginPath();

      let currentX = Math.max(160, startX);
      let currentY = data[0].val ? highY : baselineY;
      ctx.moveTo(currentX, currentY);

      for (let i = 1; i < sampleCount; i++) {
        const nextX = currentX + stepWidth;
        const nextY = data[i].val ? highY : baselineY;

        if (nextY !== currentY) {
          // Horizontal segment to step edge
          ctx.lineTo(nextX, currentY);
          // Vertical step transition
          ctx.lineTo(nextX, nextY);
        } else {
          // Continuous level
          ctx.lineTo(nextX, nextY);
        }

        currentX = nextX;
        currentY = nextY;
      }
      ctx.stroke();

      // Glowing current value pill
      const lastVal = data[data.length - 1].val;
      ctx.fillStyle = lastVal ? ch.color : "#475569";
      ctx.beginPath();
      ctx.arc(w - 24, lastVal ? highY : baselineY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "bold 10px 'DM Mono', monospace";
      ctx.fillText(lastVal ? "1" : "0", w - 14, (baselineY + highY) / 2 + 3);
    });
  }
}

// Global Export
if (typeof window !== "undefined") {
  window.DigitalWaveformAnalyzer = DigitalWaveformAnalyzer;
}
