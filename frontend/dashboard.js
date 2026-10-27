/**
 * frontend/dashboard.js — Controller for Tinkercad-Style Engineering Dashboard
 * Handles dynamic profile rendering, cloud circuits listing, carousel scrolling, and track filtering.
 */

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
  });

  async function initDashboard() {
    initProfileSidebar();
    initCarouselButtons();
    initFilterTabs();
    await loadRecentDesigns();
  }

  // 1. Populate Left Sidebar Student Profile
  async function initProfileSidebar() {
    const avatarEl = document.getElementById("sidebarAvatar");
    const nameEl = document.getElementById("sidebarName");
    const rollEl = document.getElementById("sidebarRoll");

    let user = null;
    try {
      const uStr = localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
      user = uStr ? JSON.parse(uStr) : null;
    } catch {
      user = null;
    }

    if (!user && window.Auth && typeof Auth.getMe === "function") {
      try {
        user = await Auth.getMe();
        if (user) {
          localStorage.setItem("auth_user", JSON.stringify(user));
        }
      } catch (err) {
        console.warn("Could not fetch user profile:", err);
      }
    }

    if (user) {
      const username = user.username || "Student Engineer";
      const roll = user.roll_number || "NO ROLL";
      const branch = user.branch || "ECE/CSE";
      const sem = user.semester ? `Sem ${user.semester}` : "Sem 3";
      const initial = username.charAt(0).toUpperCase();

      if (avatarEl) avatarEl.textContent = initial;
      if (nameEl) nameEl.textContent = username;
      if (rollEl) rollEl.textContent = `${roll} • ${branch} • ${sem}`;
    } else {
      if (avatarEl) avatarEl.textContent = "G";
      if (nameEl) nameEl.textContent = "Student Guest";
      if (rollEl) rollEl.innerHTML = `<a href="login.html" style="color: inherit; text-decoration: underline;">Sign In with Roll No</a>`;
    }
  }

  // 2. Load Recent Designs (from Cloud API or default presets)
  async function loadRecentDesigns() {
    const container = document.getElementById("recentDesignsGrid");
    if (!container) return;

    const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    let circuits = [];

    if (token && window.API_BASE) {
      try {
        const res = await fetch(`${window.API_BASE}/api/circuits`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          circuits = await res.json();
        }
      } catch (err) {
        console.warn("Could not load cloud circuits:", err);
      }
    }

    // Default sample presets if no user circuits saved yet
    const defaultPresets = [
      {
        id: "preset_7400",
        title: "Quad NAND Gate (IC 7400)",
        track: "comb",
        meta: "Combinational Preset • Verified",
        url: "combinational/workbench.html?preset=7400_nand",
        svgType: "nand"
      },
      {
        id: "preset_7483",
        title: "4-Bit Adder / Subtractor (7483)",
        track: "comb",
        meta: "Arithmetic Datapath • Verified",
        url: "combinational/workbench.html?preset=7483_adder",
        svgType: "adder"
      },
      {
        id: "preset_7490",
        title: "BCD Decade Counter (7490)",
        track: "seq",
        meta: "Sequential Pillar 5 • Scope Synced",
        url: "sequential/workbench.html?preset=7490_decade",
        svgType: "counter"
      },
      {
        id: "preset_74194",
        title: "Universal Shift Register (74194)",
        track: "seq",
        meta: "Sequential Pillar 4 • Bi-directional",
        url: "sequential/workbench.html?preset=74194_shift",
        svgType: "shift"
      }
    ];

    // Build Cards HTML: Start with "+ Create New Circuit" card
    let html = `
      <a href="workbench.html" class="tink-card-create" title="Create a new blank circuit canvas">
        <div class="tink-card-create-icon">+</div>
        <strong style="color: var(--tink-navy); font-size: 14px; margin-bottom: 4px;">Create New Circuit</strong>
        <span style="font-size: 12px; color: var(--tink-text-muted);">Start fresh on a 60 FPS breadboard</span>
      </a>
    `;

    if (circuits && circuits.length > 0) {
      circuits.forEach(c => {
        const dateStr = c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "Recently saved";
        html += `
          <div class="tink-card">
            <div class="tink-card-preview preview-comb">
              <span class="tink-card-tag tag-comb">CLOUD SYNCED</span>
              ${generateCircuitMiniSVG("cloud")}
            </div>
            <div class="tink-card-body">
              <div>
                <h4 class="tink-card-title">${escapeHTML(c.title)}</h4>
                <p class="tink-card-subtitle">${escapeHTML(dateStr)} • Private</p>
              </div>
              <div class="tink-card-footer">
                <a href="workbench.html?load=${c.id}" class="tink-card-start-btn">Open Lab ➔</a>
                <span style="font-size: 11px; color: #64748b; font-family: 'DM Mono', monospace;">ID #${c.id}</span>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      defaultPresets.forEach(p => {
        const isSeq = p.track === "seq";
        html += `
          <div class="tink-card">
            <div class="tink-card-preview ${isSeq ? 'preview-seq' : 'preview-comb'}">
              <span class="tink-card-tag ${isSeq ? 'tag-seq' : 'tag-comb'}">${isSeq ? 'SEQUENTIAL' : 'COMBINATIONAL'}</span>
              ${generateCircuitMiniSVG(p.svgType)}
            </div>
            <div class="tink-card-body">
              <div>
                <h4 class="tink-card-title">${escapeHTML(p.title)}</h4>
                <p class="tink-card-subtitle">${escapeHTML(p.meta)}</p>
              </div>
              <div class="tink-card-footer">
                <a href="${p.url}" class="tink-card-start-btn ${isSeq ? 'btn-seq' : ''}">Simulate ➔</a>
                <span style="font-size: 11px; color: #64748b;">Preset</span>
              </div>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = html;
  }

  // 3. Filter Tabs ([ Combinational ] vs [ Sequential ])
  function initFilterTabs() {
    const tabs = document.querySelectorAll(".tink-filter-tab");
    const cards = document.querySelectorAll("#recommendedTutorialsGrid .tink-card");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const filter = tab.dataset.filter;
        tabs.forEach(t => {
          t.classList.remove("active-comb", "active-seq");
        });

        if (filter === "comb") {
          tab.classList.add("active-comb");
        } else if (filter === "seq") {
          tab.classList.add("active-seq");
        } else {
          tab.classList.add("active-comb");
        }

        cards.forEach(card => {
          if (filter === "all" || card.dataset.track === filter) {
            card.style.display = "flex";
          } else {
            card.style.display = "none";
          }
        });
      });
    });
  }

  // 4. Carousel Scroll Navigation (< > buttons)
  function initCarouselButtons() {
    document.querySelectorAll(".tink-carousel-nav").forEach(nav => {
      const prevBtn = nav.querySelector(".btn-prev");
      const nextBtn = nav.querySelector(".btn-next");
      const targetId = nav.dataset.target;
      const targetEl = document.getElementById(targetId);

      if (!targetEl) return;

      if (prevBtn) {
        prevBtn.addEventListener("click", () => {
          targetEl.scrollBy({ left: -320, behavior: "smooth" });
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          targetEl.scrollBy({ left: 320, behavior: "smooth" });
        });
      }
    });
  }

  // Mini Circuit Vector Graphics Generator
  function generateCircuitMiniSVG(type) {
    if (type === "nand") {
      return `
        <svg viewBox="0 0 160 80" class="tink-card-preview-svg" xmlns="http://www.w3.org/2000/svg">
          <line x1="20" y1="30" x2="50" y2="30" stroke="#2563eb" stroke-width="2" />
          <line x1="20" y1="50" x2="50" y2="50" stroke="#2563eb" stroke-width="2" />
          <path d="M 50 20 L 75 20 A 20 20 0 0 1 75 60 L 50 60 Z" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
          <circle cx="98" cy="40" r="4" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
          <line x1="102" y1="40" x2="140" y2="40" stroke="#10b981" stroke-width="2" />
        </svg>
      `;
    } else if (type === "adder") {
      return `
        <svg viewBox="0 0 160 80" class="tink-card-preview-svg" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="15" width="80" height="50" rx="6" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
          <text x="80" y="44" font-family="DM Mono, monospace" font-size="12" font-weight="700" fill="#2c6ee8" text-anchor="middle">74LS83</text>
          <line x1="15" y1="28" x2="40" y2="28" stroke="#3b82f6" stroke-width="2" />
          <line x1="15" y1="52" x2="40" y2="52" stroke="#3b82f6" stroke-width="2" />
          <line x1="120" y1="40" x2="145" y2="40" stroke="#10b981" stroke-width="2" />
        </svg>
      `;
    } else if (type === "counter") {
      return `
        <svg viewBox="0 0 160 80" class="tink-card-preview-svg" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="15" width="80" height="50" rx="6" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
          <text x="80" y="44" font-family="DM Mono, monospace" font-size="12" font-weight="700" fill="#d97706" text-anchor="middle">74LS90</text>
          <polyline points="20,40 26,40 26,30 32,30 32,40 40,40" fill="none" stroke="#d97706" stroke-width="2" />
          <line x1="120" y1="30" x2="145" y2="30" stroke="#10b981" stroke-width="2" />
          <line x1="120" y1="50" x2="145" y2="50" stroke="#10b981" stroke-width="2" />
        </svg>
      `;
    } else {
      return `
        <svg viewBox="0 0 160 80" class="tink-card-preview-svg" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="15" width="80" height="50" rx="6" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
          <text x="80" y="44" font-family="DM Mono, monospace" font-size="12" font-weight="700" fill="#2c6ee8" text-anchor="middle">74LS194</text>
          <line x1="15" y1="40" x2="40" y2="40" stroke="#6366f1" stroke-width="2" />
          <line x1="120" y1="35" x2="145" y2="35" stroke="#10b981" stroke-width="2" />
          <line x1="120" y1="45" x2="145" y2="45" stroke="#10b981" stroke-width="2" />
        </svg>
      `;
    }
  }

  function escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

})();
