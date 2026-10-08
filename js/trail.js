// =========================================================
// Il sentiero dei falò: il percorso si disegna mentre scorri,
// i falò delle settimane completate si accendono e un clic
// apre la schermata del livello.
// =========================================================

(function () {
    "use strict";

    const stage = window.STAGE;
    const wrap = document.querySelector(".trail-wrap");
    const canvas = document.querySelector(".trail-canvas");
    const stops = Array.from(document.querySelectorAll(".trail-stop"));
    const dialog = document.getElementById("level-screen");
    if (!stage || !wrap || !canvas || stops.length === 0) return;

    const ctx = canvas.getContext("2d");
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const PX = 4;   // un pixel del disegno = 4 pixel dello schermo

    const STATE_LABEL = { done: "FALÒ ACCESO", current: "SEI QUI", locked: "BLOCCATO" };
    const FIRE = ["#5a1206", "#9a1f08", "#d8400e", "#f57a1c", "#ffb02e", "#ffe066", "#fff6c8"];


    // ---------- Stato di ogni falò ----------

    stops.forEach(function (stop) {
        const week = Number(stop.dataset.week);
        const state = stage.state(week);
        stop.classList.add("is-" + state);
        stop.dataset.state = state;
        const label = stop.querySelector(".stop-state");
        if (label) label.textContent = STATE_LABEL[state];
    });


    // ---------- Disegno del sentiero ----------

    let W = 0, H = 0;
    let scenery = null, path = null;
    let anchors = [];
    let fires = [];
    let reveal = 0;
    let visible = false;

    function makeCanvas(w, h) {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
    }

    function hash(x, y) {
        const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return s - Math.floor(s);
    }

    // Pino scuro ai lati del sentiero
    function pine(g, cx, base, h) {
        const tiers = Math.max(3, Math.round(h / 9));
        g.fillStyle = "#1a1210";
        g.fillRect(cx - 1, base - 4, 2, 4);
        for (let t = 0; t < tiers; t++) {
            const top = base - h + (t * h * 0.8) / tiers;
            const th = (h * 0.8 / tiers) * 1.7;
            const maxW = h * 0.26 * ((t + 1) / tiers) + 1;
            for (let r = 0; r < th; r++) {
                const w = Math.round(maxW * (r / th));
                g.fillStyle = r > th * 0.75 ? "#060b14" : "#0a1220";
                g.fillRect(cx - w, Math.round(top + r), w * 2 + 1, 1);
                g.fillStyle = "#13203a";
                if (r < th * 0.3) g.fillRect(cx - w, Math.round(top + r), 1, 1);
            }
        }
    }

    function layout() {
        const box = wrap.getBoundingClientRect();
        W = Math.max(1, Math.round(box.width / PX));
        H = Math.max(1, Math.round(box.height / PX));
        canvas.width = W;
        canvas.height = H;

        // Il centro di ogni falò, in pixel del disegno
        anchors = stops.map(function (stop) {
            const r = stop.querySelector(".stop-fire").getBoundingClientRect();
            return { x: Math.round((r.left + r.width / 2 - box.left) / PX), y: Math.round((r.top + r.height * 0.7 - box.top) / PX) };
        });

        // Bosco e prato, disegnati una volta
        scenery = makeCanvas(W, H);
        const g = scenery.getContext("2d");
        for (let i = 0; i < W * H / 90; i++) {
            const x = Math.floor(hash(i, 1) * W), y = Math.floor(hash(i, 2) * H);
            g.fillStyle = hash(i, 3) > 0.5 ? "#0c1a18" : "#101f1d";
            g.fillRect(x, y, 1, hash(i, 4) > 0.7 ? 2 : 1);
        }
        const margin = Math.min(36, W * 0.12);
        for (let y = 10; y < H + 40; y += 14 + Math.floor(hash(y, 5) * 16)) {
            pine(g, Math.round(hash(y, 6) * margin), y, 26 + hash(y, 7) * 34);
            pine(g, Math.round(W - hash(y, 8) * margin), y + 8, 26 + hash(y, 9) * 34);
        }

        // Sentiero di terra che passa da un falò all'altro
        path = makeCanvas(W, H);
        const p = path.getContext("2d");
        const points = [{ x: Math.round(W / 2), y: 0 }].concat(anchors);
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i], b = points[i + 1];
            const steps = Math.max(20, Math.abs(b.y - a.y) * 2);
            for (let s = 0; s <= steps; s++) {
                const k = s / steps;
                // curva a S: scende in verticale e piega verso il falò successivo
                const e = k * k * (3 - 2 * k);
                const x = Math.round(a.x + (b.x - a.x) * e);
                const y = Math.round(a.y + (b.y - a.y) * k);
                p.fillStyle = "#2a2018";
                p.fillRect(x - 4, y, 9, 1);
                p.fillStyle = "#3a2c20";
                p.fillRect(x - 3, y, 7, 1);
                if (hash(x, y) > 0.8) { p.fillStyle = "#4a3a2a"; p.fillRect(x - 2 + Math.floor(hash(y, x) * 5), y, 1, 1); }
            }
        }

        fires = anchors.map(function () { return new Uint8Array(9 * 12); });
        update();
        draw(performance.now());
    }


    // ---------- Falò ----------

    function stepFire(heat, strength) {
        const w = 9, h = 12, center = (w - 1) / 2;
        for (let x = 0; x < w; x++) {
            const edge = Math.abs(x - center) / center;
            heat[(h - 1) * w + x] = edge > 0.85 ? 0 : Math.round((30 - edge * 12) * strength * (0.8 + Math.random() * 0.2));
        }
        for (let y = 1; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const r = Math.floor(Math.random() * 3);
                const dx = Math.min(w - 1, Math.max(0, x - r + 1));
                const edge = Math.abs(dx - center) / center;
                heat[(y - 1) * w + dx] = Math.max(0, heat[y * w + x] - (r & 1) - (Math.random() < edge ? 2 : 0));
            }
        }
    }

    function drawBonfire(a, state, heat, t) {
        const lit = state !== "locked";

        if (lit) {
            // bagliore caldo sul terreno
            [[16, 0.08], [10, 0.1]].forEach(function (ring) {
                ctx.fillStyle = "rgba(255, 130, 50, " + ring[1] * (0.85 + Math.random() * 0.3) + ")";
                for (let y = -ring[0] / 2; y <= ring[0] / 2; y++) {
                    const w = Math.round(Math.sqrt(1 - Math.pow(y / (ring[0] / 2), 2)) * ring[0]);
                    ctx.fillRect(a.x - w, a.y - 3 + y, w * 2, 1);
                }
            });
        }

        // pietre attorno al fuoco
        for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            ctx.fillStyle = lit ? (Math.sin(ang) > 0 ? "#6a5046" : "#3a3236") : "#2a2a34";
            ctx.fillRect(Math.round(a.x + Math.cos(ang) * 7) - 1, Math.round(a.y + Math.sin(ang) * 2), 2, 1);
        }
        // tronchi incrociati
        ctx.fillStyle = lit ? "#5e3d22" : "#2e2420";
        for (let i = -4; i <= 4; i++) ctx.fillRect(a.x + i, a.y - 1 - Math.round((4 - Math.abs(i)) * 0.3), 1, 1);
        ctx.fillStyle = lit ? "#3a2618" : "#1e1816";
        ctx.fillRect(a.x - 4, a.y, 9, 1);

        if (!lit) return;

        // fiamme animate
        const left = a.x - 4, top = a.y - 13;
        for (let y = 0; y < 12; y++) {
            for (let x = 0; x < 9; x++) {
                const v = heat[y * 9 + x];
                if (v < 3) continue;
                ctx.fillStyle = FIRE[Math.min(FIRE.length - 1, Math.floor((v - 3) / 4))];
                ctx.fillRect(left + x, top + y, 1, 1);
            }
        }

        // bandierina "SEI QUI" accanto al falò della settimana in corso
        if (state === "current") {
            const fx = a.x + 10, fy = a.y - 14;
            ctx.fillStyle = "#c9b48a";
            ctx.fillRect(fx, fy, 1, 15);
            const wave = Math.floor(t / 250) % 2;
            ctx.fillStyle = "#e8452c";
            for (let y = 0; y < 4; y++) ctx.fillRect(fx + 1, fy + y + (y > 1 ? wave : 0) * 0, 5 - (y === 3 ? wave : 0), 1);
            ctx.fillStyle = "#ff8a5a";
            ctx.fillRect(fx + 1, fy, 4 - wave, 1);
        }
    }


    // ---------- Fotogramma ----------

    function draw(time) {
        if (!scenery) return;
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(scenery, 0, 0);

        // il sentiero compare solo fin dove sei arrivato scorrendo
        const shown = Math.max(0, Math.min(H, reveal));
        if (shown > 0) ctx.drawImage(path, 0, 0, W, shown, 0, 0, W, shown);

        anchors.forEach(function (a, i) {
            const state = stops[i].dataset.state;
            const reached = a.y < reveal;
            drawBonfire(a, reached ? state : "locked", fires[i], time);
        });
    }

    // Fin dove arriva il sentiero: poco sotto il bordo inferiore dello schermo
    function update() {
        const box = wrap.getBoundingClientRect();
        reveal = reduceMotion ? H : Math.round((window.innerHeight * 0.85 - box.top) / PX);

        stops.forEach(function (stop, i) {
            if (anchors[i] && anchors[i].y < reveal && !stop.classList.contains("is-reached")) {
                stop.classList.add("is-reached");
            }
        });
    }

    let last = 0;
    function loop(time) {
        if (visible && time - last > 83) {
            last = time;
            anchors.forEach(function (a, i) {
                if (stops[i].dataset.state !== "locked") stepFire(fires[i], stops[i].dataset.state === "current" ? 0.8 : 1);
            });
            draw(time);
        }
        requestAnimationFrame(loop);
    }

    window.addEventListener("scroll", function () {
        update();
        if (reduceMotion) draw(0);
    }, { passive: true });

    let resizeTimer = null;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layout, 150);
    });

    // Anima solo quando il sentiero è sullo schermo
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
        }).observe(wrap);
    } else {
        visible = true;
    }

    function start() {
        layout();
        if (!reduceMotion) requestAnimationFrame(loop);
    }

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    else start();


    // ---------- Schermata del livello ----------

    if (!dialog) return;

    const kicker = dialog.querySelector(".level-kicker");
    const title = dialog.querySelector("#level-title");
    const date = dialog.querySelector(".level-date");
    const body = dialog.querySelector(".level-body");
    const stepButtons = dialog.querySelectorAll("[data-level-step]");
    let current = 0;
    let pushed = false;

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function fill(week) {
        const stop = stops[week - 1];
        const template = document.getElementById("livello-" + pad(week));
        if (!stop || !template) return false;

        current = week;
        const state = stop.dataset.state;
        kicker.textContent = "LIVELLO " + pad(week) + " · " + STATE_LABEL[state];
        kicker.dataset.state = state;
        title.textContent = stop.querySelector(".stop-title").textContent;
        date.textContent = stop.querySelector(".stop-date").textContent;

        body.innerHTML = "";
        if (state === "locked") {
            const note = document.createElement("p");
            note.className = "level-locked";
            note.textContent = "Questo falò è ancora spento: il livello si sblocca durante la settimana.";
            body.appendChild(note);
        }
        body.appendChild(template.content.cloneNode(true));

        stepButtons.forEach(function (button) {
            const target = week + Number(button.dataset.levelStep);
            button.disabled = target < 1 || target > stops.length;
        });
        dialog.querySelector(".panel-inner").scrollTop = 0;
        return true;
    }

    function open(week, fromHistory) {
        if (!fill(week)) return;
        document.querySelectorAll("dialog[open]").forEach(function (other) {
            if (other !== dialog) other.close();
        });
        if (!dialog.open) {
            dialog.showModal();
            root.classList.add("panel-open");
        }
        if (!fromHistory) {
            history.pushState({ level: week }, "", "#livello-" + pad(week));
            pushed = true;
        }
    }

    function weekFromHash() {
        const match = /^#livello-(\d{2})$/.exec(location.hash);
        return match ? Number(match[1]) : 0;
    }

    document.querySelectorAll("[data-level-open]").forEach(function (button) {
        button.addEventListener("click", function () {
            open(Number(button.dataset.levelOpen), false);
        });
    });

    // I link "Settimana 02" nei pannelli del progetto aprono il livello
    document.querySelectorAll('a[href^="#livello-"]').forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            open(Number(link.getAttribute("href").slice(9)), false);
        });
    });

    stepButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const week = current + Number(button.dataset.levelStep);
            if (fill(week)) history.replaceState({ level: week }, "", "#livello-" + pad(week));
        });
    });

    dialog.querySelector("[data-level-close]").addEventListener("click", function () {
        dialog.close();
    });

    dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
    });

    // Alla chiusura (X, clic fuori o Esc) l'indirizzo torna alla sezione dei livelli
    dialog.addEventListener("close", function () {
        root.classList.remove("panel-open");
        if (weekFromHash()) {
            if (pushed) {
                pushed = false;
                history.back();
            } else {
                history.replaceState(null, "", "#livelli");
            }
        }
    });

    // Il tasto "indietro" del browser chiude la schermata
    window.addEventListener("popstate", function () {
        pushed = false;
        const week = weekFromHash();
        if (week) open(week, true);
        else if (dialog.open) dialog.close();
    });

    // Un link come diario-stage/#livello-03 apre subito quel livello
    const initial = weekFromHash();
    if (initial) open(initial, true);
})();
