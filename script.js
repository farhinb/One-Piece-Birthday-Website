// Nautical quest site: tabs + time-locked itinerary + fake clock + midnight confetti + final ring reveal
(function () {
  const cfg = window.BDAY_CONFIG || {};
  const url = new URL(location.href);
  const preview = url.searchParams.get("preview") === "1";
  const name = cfg.name || "Love";

  // Optional: show all steps (debug). Use &show=all in the URL.
  const showAll = new URL(location.href).searchParams.get("show") === "all";

  function renderDirections(dirs, tipText) {
    if (!dirs || !dirs.length) return "";
    const items = dirs.map(s => `<li>${s}</li>`).join("");
    return `
      <div class="directions">
        <div class="dir-head">🧭 Directions</div>
        <ol>${items}</ol>
        ${tipText ? `<div class="dir-tip">💡 ${tipText}</div>` : ""}
      </div>
    `;
  }
  
  // ------------------------------
  // Fake clock / time simulator
  // ------------------------------
  const __debug = url.searchParams.get("debug") === "1";
  let __simNow = (() => {
    const nstr = url.searchParams.get("now"); // e.g. 2025-11-15T11:00:00-05:00
    return nstr ? new Date(nstr) : null;
  })();
  function now() {
    return __simNow ? new Date(__simNow) : new Date();
  }
  // HUD + hotkeys when debug=1
  (function () {
    if (!__debug) return;
    const hud = document.createElement("div");
    hud.id = "timeHud";
    hud.style.cssText =
      "position:fixed;top:10px;left:50%;transform:translateX(-50%);padding:6px 10px;background:rgba(0,0,0,.55);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:10px;font:12px ui-monospace,Menlo,Consolas,monospace;z-index:9999;";
    document.body.appendChild(hud);
    function tickHud() {
      const d = now();
      const s = d.toLocaleString("en-US", {
        hour12: false,
        timeZone: "America/New_York",
      });
      hud.textContent = `Simulated now: ${s}`;
      requestAnimationFrame(tickHud);
    }
    tickHud();
    addEventListener("keydown", (e) => {
      const step = (e.shiftKey ? 30 : 5) * 60 * 1000; // 30 or 5 minutes
      if (e.key === "]") {
        __simNow = new Date(now().getTime() + step);
        e.preventDefault();
        scheduleRender();
      }
      if (e.key === "[") {
        __simNow = new Date(now().getTime() - step);
        e.preventDefault();
        scheduleRender();
      }
    });
  })();

  // ------------------------------
  // Theme: Straw Hat mode (warm palette)
  // ------------------------------
  (function () {
    const root = document.documentElement;
    const btn = document.getElementById("easterBtn");
    function applyTheme(theme) {
      if (theme === "strawhat") {
        root.setAttribute("data-theme", "strawhat");
        localStorage.setItem("theme", "strawhat");
      } else {
        root.removeAttribute("data-theme");
        localStorage.removeItem("theme");
      }
    }
    const urlTheme = url.searchParams.get("theme");
    const saved = localStorage.getItem("theme");
    applyTheme(urlTheme || saved || "default");
    if (btn) {
      btn.addEventListener("click", () => {
        const active =
          document.documentElement.getAttribute("data-theme") === "strawhat";
        applyTheme(active ? "default" : "strawhat");
        window.__confettiBurst && window.__confettiBurst();
        const n = document.createElement("div");
        n.textContent = active ? "Straw Hat mode off." : "Straw Hat mode ON! ☀️";
        Object.assign(n.style, {
          position: "fixed",
          left: "50%",
          top: "16px",
          transform: "translateX(-50%)",
          padding: "10px 14px",
          background: "rgba(0,0,0,.6)",
          border: "1px solid rgba(255,255,255,.2)",
          borderRadius: "10px",
          color: "#fff",
          zIndex: 9999,
        });
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 1200);
      });
    }
  })();

  // ------------------------------
  // Midnight message & auto confetti (00:00 ET on bday)
  // ------------------------------
  const midnightEl = document.getElementById("midnightMsg");
  (function setupMidnight() {
    const bday = cfg.bdayDateEt; // "2025-11-12"
    if (!bday) {
      if (midnightEl) midnightEl.textContent = "";
      return;
    }
    const target = new Date(`${bday}T11:00:00-05:00`);
    function tick() {
      const n = now();
      const diff = target - n;
      if (diff <= 0) {
        if (midnightEl) midnightEl.textContent = `It's your day — Happy Birthday, ${name}! 🎉`;
        if (!window.__autoBurst) {
          window.__autoBurst = true;
          window.__confettiBurst && window.__confettiBurst();
        }
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      if (midnightEl) midnightEl.textContent = `First Challenge Unlocks  in ${d}d ${h}h ${m}m ${s}s. Are you ready?`;
      requestAnimationFrame(tick);
    }
    tick();
  })();

  // ------------------------------
  // Steps (itinerary) + progress bar
  // ------------------------------
  const stepsEl = document.getElementById("steps");
  const bar = document.getElementById("bar");
  const steps = (cfg.steps || []).map((s, i) => ({
    ...s,
    id: s.id || `step-${i + 1}`,
    unlockAt: new Date(`${cfg.itineraryDateEt}T${s.timeEt}:00-05:00`),
  }));

  const PROGRESS_KEY = "bday.progress";
  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    } catch {
      return {};
    }
  }
  const fresh = new URL(location.href).searchParams.get("fresh") === "1";
  if (fresh) localStorage.removeItem("bday.progress");

  function setProgress(p) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  }

  // ---- render scheduler to prevent recursive render() calls
  let __renderScheduled = false;
  function scheduleRender() {
    if (__renderScheduled) return;
    __renderScheduled = true;
    requestAnimationFrame(() => {
      __renderScheduled = false;
      render();
    });
  }

  function isUnlocked(idx) {
    if (preview) return true;
    const step = steps[idx];
    const prevDone = idx === 0 ? true : !!getProgress()[steps[idx - 1].id];
    const timeOk = now() >= step.unlockAt;
    return prevDone && timeOk;
  }

  function percentDone() {
    const p = getProgress();
    const total = steps.length;
    const done = steps.filter((s) => p[s.id]).length;
    return Math.round((done / total) * 100);
  }

  // ------------------------------
  // Render itinerary (current + next only)
  // ------------------------------
  function render() {
  if (!stepsEl) return;
  stepsEl.innerHTML = "";

  // progress bar
  if (bar) bar.style.width = percentDone() + "%";

  // figure out which step is current (first NOT cleared)
  const prog = getProgress();
  const currentIndex = steps.findIndex((s) => !prog[s.id]); // -1 if all done
  const idx = currentIndex === -1 ? steps.length - 1 : currentIndex;

  // which cards to render
  let visibleIdxs;
  if (showAll) {
    // debug: show everything
    visibleIdxs = steps.map((_, i) => i);
  } else {
    // product: show ALL past (cleared) + the current step; hide the future
    visibleIdxs = [];
    for (let i = 0; i <= idx; i++) visibleIdxs.push(i);
  }

  visibleIdxs.forEach((i) => {
    const s = steps[i];
    const unlocked = isUnlocked(i);     // time reached AND previous cleared
    const done = !!prog[s.id];
    const isCurrent = (i === idx);      // the step the user is on now

    const card = document.createElement("div");
    card.className = "step" + (unlocked ? "" : " locked");
    const icon = s.icon ? `<span class="icon">${s.icon}</span>` : "";

    // Build the body:
    //  - UNLOCKED  ........ full body + active "Mark island cleared"
    //  - LOCKED & CURRENT . full body visible, but primary button disabled + countdown
    //  - LOCKED & PAST .... (shouldn't happen) but we’ll fall back to countdown
    let bodyHtml = "";
    if (unlocked) {
      bodyHtml = `
        <div class="body">
          <p>${s.details}</p>
          ${s.clue ? `<p class="mono" style="opacity:.85">Log Pose ➜ ${s.clue}</p>` : ""}
          ${s.directions ? renderDirections(s.directions, s.dirTip) : ""}
          ${s.photo ? `<img src="${s.photo}" alt="${s.title}" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;margin-top:8px" />` : ""}
          <div class="actions">
            <button class="btn primary" data-done="${s.id}">${done ? "Mark as not cleared" : "Mark island cleared"}</button>
            <button class="btn ghost" data-confetti="1">Celebrate 🎉</button>
          </div>
        </div>
      `;
    } else if (isCurrent) {
      // Show full content, but keep the step locked: disable primary button
      const disableAttrs = `disabled aria-disabled="true" title="Unlocks at ${s.prettyTime}"`;
      bodyHtml = `
        <div class="body locked-hint">
          <p>${s.details}</p>
          ${s.clue ? `<p class="mono" style="opacity:.85">Log Pose ➜ ${s.clue}</p>` : ""}
          ${s.mapUrl ? `<p><a href="${s.mapUrl}" target="_blank" rel="noopener">Open directions ↗</a></p>` : ""}
          ${s.photo ? `<img src="${s.photo}" alt="${s.title}" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;margin-top:8px" />` : ""}
          <div class="actions">
            <button class="btn primary" ${disableAttrs}>Mark island cleared</button>
            <button class="btn ghost" data-confetti="1">Celebrate 🎉</button>
          </div>
          <div class="countdown-sm" id="cd-${s.id}" style="margin-top:8px">Unlocks soon…</div>
        </div>
      `;
    } else {
      // Generic locked fallback (shouldn’t appear given our visibleIdxs rule)
      bodyHtml = `<div class="countdown-sm" id="cd-${s.id}">Unlocks soon…</div>`;
    }

    card.innerHTML = `
      <div class="badge-lock">${unlocked ? (done ? "✅ Cleared" : "🔓 Unlocked") : "🔒 Locked"}</div>
      <div class="title">${icon}<span class="time">${s.prettyTime}</span> <span>•</span> <span>${s.title}</span></div>
      <div class="meta">${s.short}</div>
      ${bodyHtml}
    `;
    stepsEl.appendChild(card);

    // Handlers
    card.querySelectorAll("[data-done]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const k = btn.getAttribute("data-done");
        const p2 = getProgress();
        if (p2[k]) delete p2[k];
        else p2[k] = true;
        setProgress(p2);
        scheduleRender();
        const st = steps.find((x) => x.id === k);
        if (st && st.final && p2[k]) openFinal();
      });
    });
    card.querySelectorAll("[data-confetti]").forEach((btn) => {
      btn.addEventListener("click", () => window.__confettiBurst && window.__confettiBurst());
    });

    // Countdown if locked (updates text every frame)
    if (!unlocked) {
      const cdel = card.querySelector(`#cd-${s.id}`);
      const tick = () => {
        const diff = s.unlockAt - now();
        if (diff <= 0) {
          scheduleRender();
          return;
        }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff / 60000) % 60);
        const se = Math.floor((diff / 1000) % 60);
        if (cdel) cdel.textContent = `Unlocks in ${h}h ${m}m ${se}s`;
        requestAnimationFrame(tick);
      };
      tick();
    }
  });
}



  // ------------------------------
  // Confetti engine
  // ------------------------------
  (function () {
    const c = document.getElementById("confetti");
    if (!c) return;
    const ctx = c.getContext("2d");
    let W, H, pieces = [];
    function resize() {
      W = (c.width = innerWidth);
      H = (c.height = innerHeight);
    }
    addEventListener("resize", resize);
    resize();
    function burst(x = W / 2, y = H / 2, n = 240) {
      for (let i = 0; i < n; i++) {
        pieces.push({
          x,
          y,
          r: 2 + Math.random() * 4,
          a: Math.random() * Math.PI * 2,
          v: 2 + Math.random() * 5,
          g: 0.05 + Math.random() * 0.15,
          s: Math.random() * 0.15 + 0.02,
          life: 120 + Math.random() * 80,
          hue: Math.floor(Math.random() * 360),
        });
      }
    }
    function step() {
      ctx.clearRect(0, 0, W, H);
      pieces = pieces.filter((p) => p.life > 0);
      for (const p of pieces) {
        p.life--;
        p.v *= 0.995;
        p.a += p.s;
        p.y += p.v + p.g * p.life * 0.01;
        p.x += Math.cos(p.a) * p.v;
        ctx.fillStyle = `hsl(${p.hue} 90% 60%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(step);
    }
    step();
    window.__confettiBurst = () => burst();
    document.getElementById("confettiBtn")?.addEventListener("click", () => burst());
    if (preview) setTimeout(() => burst(), 250);
  })();

  // ------------------------------
  // Music toggle
  // ------------------------------
  (function () {
    const audio = document.getElementById("song");
    const btn = document.getElementById("musicBtn");
    if (!audio || !btn) return;
    let playing = false;
    btn.addEventListener("click", async () => {
      try {
        if (!playing) {
          await audio.play();
          btn.textContent = "Pause Song";
        } else {
          audio.pause();
          btn.textContent = "Play Song";
        }
        playing = !playing;
      } catch (e) {
        alert("Could not play audio—replace assets/song.mp3 or try again.");
      }
    });
  })();

  // ------------------------------
  // Letter reveal
  // ------------------------------
  (function () {
    const open = document.getElementById("openLetter");
    const body = document.getElementById("letterBody");
    if (!open || !body) return;
    open.addEventListener("click", () => {
      body.hidden = !body.hidden;
      open.textContent = body.hidden ? "Open Letter" : "Hide Letter";
    });
  })();

  // ------------------------------
  // Share link
  // ------------------------------
  (function () {
    const link = document.getElementById("shareLink");
    if (!link) return;
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(location.href);
        link.textContent = "Copied!";
        setTimeout(() => (link.textContent = "Copy link"), 1200);
      } catch (_) {}
    });
  })();

  // ------------------------------
  // Final modal
  // ------------------------------
  const modal = document.getElementById("finalModal");
  const closeModal = document.getElementById("closeModal");
  if (modal) modal.classList.remove("show");
  function openFinal() {
    if (!modal) return;
    modal.classList.add("show");
    window.__confettiBurst && window.__confettiBurst();
  }
  closeModal?.addEventListener("click", () => modal.classList.remove("show"));

  // ------------------------------
  // First render
  // ------------------------------
  render();

  // ------------------------------
  // Simple tab/view router (Letter + Quest switch)
  // ------------------------------
  (function () {
    const VIEWS = ["hero", "letter", "quest"];

    function setView(id, pushHash = true) {
      if (!VIEWS.includes(id)) return;
      VIEWS.forEach((v) => {
        const el = document.getElementById(v);
        if (el) el.classList.toggle("active", v === id);
      });
      document.querySelectorAll('nav a[href^="#"], nav a[data-view]').forEach((a) => {
        const h = (a.getAttribute("data-view") || a.getAttribute("href") || "").replace("#", "");
        a.classList.toggle("active", h === id);
      });
      if (pushHash) location.hash = id;
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    // expose for console testing
    window.showView = setView;

    // clicks in nav (supports data-view or href="#…")
    document.querySelectorAll('nav a[href^="#"], nav a[data-view]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = (a.getAttribute("data-view") || a.getAttribute("href") || "").replace("#", "");
        if (VIEWS.includes(id)) {
          e.preventDefault();
          setView(id);
        }
      });
    });

    // initial load from hash
    const initial = location.hash.replace("#", "");
    setView(VIEWS.includes(initial) ? initial : "hero", false);

    // back/forward support
    addEventListener("hashchange", () => {
      const h = location.hash.replace("#", "");
      if (VIEWS.includes(h)) setView(h, false);
    });
  })();

})(); // <--- close main IIFE





