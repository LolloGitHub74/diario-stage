// =========================================================
// Scena del falò: l'illustrazione fa da sfondo alla home e
// sopra si animano nuvole, fiamme e scintille. Il cavaliere
// resta fermo.
// =========================================================

(function () {
    "use strict";

    const world = document.querySelector(".world");
    const art = document.getElementById("scene-art");
    const canvas = document.getElementById("scene");
    const fxCanvas = document.getElementById("scene-fx");
    if (!world || !art || !canvas || !fxCanvas) return;

    const ctx = canvas.getContext("2d");
    const fx = fxCanvas.getContext("2d");
    const ui = world.querySelector(".world-ui");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- Misure dell'illustrazione (in pixel dell'immagine) ----------

    const IMAGE_W = 1672, IMAGE_H = 941;
    const RATIO = IMAGE_W / IMAGE_H;
    const ART_PIXEL = 4;                    // un pixel del disegno = 4 pixel dell'immagine
    const FOCUS_X = 0.52;                   // tra il fuoco e il cavaliere
    const SAFE_TOP = 0.62;                  // sopra questa altezza non ci sono né fuoco né cavaliere

    const FIRE_AREA = { x: 696, y: 560, w: 150, h: 208 };      // fiamme sopra i tronchi
    const FIRE_BASE = { x: 772, y: 765 };
    const SKY_BOTTOM = 190;                                     // dove finisce il cielo libero

    // Tela delle nuvole e delle scintille: un pixel = un pixel del disegno
    const W = Math.round(IMAGE_W / ART_PIXEL), H = Math.round(IMAGE_H / ART_PIXEL);
    canvas.width = W;
    canvas.height = H;

    let fireLayer = null;
    let clouds = [], embers = [];
    let scale = 1;

    // ---------- Posizione dell'immagine ----------

    // L'immagine copre la scena; se lo schermo è basso si rimpicciolisce o la
    // scena si allunga, così il fuoco e il cavaliere restano sempre sotto il menu
    function layout() {
        world.style.minHeight = "";
        const box = world.getBoundingClientRect();
        const uiBottom = ui ? ui.getBoundingClientRect().bottom - box.top + 12 : 0;

        let height = Math.max(box.height, box.width / RATIO);
        const limit = (box.height - uiBottom) / (1 - SAFE_TOP);
        if (height > limit) height = Math.max(limit, box.width / RATIO);

        let worldHeight = box.height;
        const needed = Math.ceil(uiBottom + (1 - SAFE_TOP) * height);
        if (needed > worldHeight) {
            worldHeight = needed;
            world.style.minHeight = worldHeight + "px";
        }

        const width = height * RATIO;
        const left = Math.min(0, Math.max(box.width - width, box.width / 2 - FOCUS_X * width));
        const top = worldHeight - height;

        [art, canvas, fxCanvas].forEach(function (element) {
            element.style.width = width + "px";
            element.style.height = height + "px";
            element.style.left = left + "px";
            element.style.top = top + "px";
        });

        art.classList.toggle("is-floating", top > 1);

        // La tela dei dettagli ha la risoluzione dello schermo, per restare nitida
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        fxCanvas.width = Math.round(width * dpr);
        fxCanvas.height = Math.round(height * dpr);
        scale = fxCanvas.width / IMAGE_W;
        fx.imageSmoothingEnabled = false;

        draw(0);
    }

    // ---------- Livelli ritagliati dall'immagine ----------

    // Copia una zona dell'immagine tenendo solo i pixel che soddisfano keep(r, g, b)
    function cutLayer(area, keep) {
        const c = document.createElement("canvas");
        c.width = area.w;
        c.height = area.h;
        const g = c.getContext("2d");
        g.drawImage(art, area.x, area.y, area.w, area.h, 0, 0, area.w, area.h);
        const image = g.getImageData(0, 0, area.w, area.h);
        const d = image.data;
        for (let i = 0; i < d.length; i += 4) {
            if (!keep(d[i], d[i + 1], d[i + 2])) d[i + 3] = 0;
        }
        g.putImageData(image, 0, 0);
        return c;
    }

    function buildLayers() {
        try {
            // Fiamme: solo i pixel arancioni e gialli, la spada resta ferma
            fireLayer = cutLayer(FIRE_AREA, function (r, g, b) {
                return r > 150 && r > b + 70;
            });
        } catch (error) {
            // Se il browser non permette di leggere i pixel, restano scintille e nuvole
            fireLayer = null;
        }
    }

    // ---------- Nuvole ----------

    function makeCloud(length) {
        const c = document.createElement("canvas");
        c.width = length + 16;
        c.height = 18;
        const g = c.getContext("2d");
        const puffs = [];
        for (let i = 0; i < length / 7; i++) {
            puffs.push([8 + i * 7 + Math.random() * 4, 11 - Math.random() * 4, 4 + Math.random() * 5]);
        }
        function inside(x, y, shrink) {
            return puffs.some(function (p) {
                const dx = x - p[0], dy = y - p[1], r = p[2] - shrink;
                return dx * dx + dy * dy <= r * r;
            });
        }
        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < c.width; x++) {
                if (!inside(x, y, 0)) continue;
                let color = "#24375e";
                if (!inside(x, y - 1, 0)) color = "#4a6597";
                else if (!inside(x, y - 2, 0)) color = "#36507e";
                else if (y > 11) color = "#1a2a4c";
                g.fillStyle = color;
                g.fillRect(x, y, 1, 1);
            }
        }
        return c;
    }

    function setupClouds() {
        clouds = [];
        const sky = SKY_BOTTOM / ART_PIXEL;
        [[0.1, 0.3, 46], [0.45, 0.12, 60], [0.78, 0.42, 40], [0.3, 0.62, 34]].forEach(function (c, i) {
            clouds.push({
                image: makeCloud(c[2]),
                x: c[0] * W,
                y: Math.round(c[1] * (sky - 18)),
                speed: 0.6 + i * 0.25
            });
        });
    }

    // ---------- Scintille ----------

    function stepEmbers() {
        const bx = FIRE_BASE.x / ART_PIXEL, by = FIRE_BASE.y / ART_PIXEL;
        if (Math.random() < 0.6) {
            embers.push({
                x: bx + (Math.random() - 0.5) * 18,
                y: by - 14 - Math.random() * 18,
                vx: (Math.random() - 0.5) * 0.25,
                vy: -0.35 - Math.random() * 0.45,
                life: 0,
                max: 25 + Math.random() * 35
            });
        }
        embers = embers.filter(function (e) {
            e.life++;
            e.x += e.vx + Math.sin(e.life / 3) * 0.2;
            e.y += e.vy;
            return e.life < e.max && e.y > 0;
        });
    }

    // ---------- Disegno di un fotogramma ----------

    function draw(t) {
        const seconds = t / 1000;

        // Nuvole che scorrono piano davanti alla luna (tela a pixel grandi)
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = 0.8;
        clouds.forEach(function (c) {
            const span = W + c.image.width;
            const x = Math.round(((c.x + seconds * c.speed) % span + span) % span - c.image.width);
            ctx.drawImage(c.image, x, c.y);
        });
        ctx.globalAlpha = 1;

        // Bagliore caldo che respira attorno al fuoco
        const gx = FIRE_BASE.x / ART_PIXEL, gy = FIRE_BASE.y / ART_PIXEL - 14;
        const flicker = 0.75 + Math.sin(t / 140) * 0.1 + Math.random() * 0.15;
        const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 70);
        glow.addColorStop(0, "rgba(255, 150, 60, " + 0.16 * flicker + ")");
        glow.addColorStop(0.5, "rgba(255, 110, 40, " + 0.05 * flicker + ")");
        glow.addColorStop(1, "rgba(255, 90, 30, 0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";

        embers.forEach(function (e) {
            const k = e.life / e.max;
            ctx.fillStyle = k < 0.3 ? "#fff0a0" : k < 0.65 ? "#ffb02e" : "#d8400e";
            ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
        });

        // Dettagli nitidi: fiamme che ondeggiano
        fx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

        if (fireLayer) {
            const a = FIRE_AREA;
            const stretch = 1 + Math.sin(t / 90) * 0.03 + Math.random() * 0.04;
            for (let y = 0; y < a.h; y += ART_PIXEL) {
                // più in alto è la fiamma, più si muove; la base resta ferma
                const height = (a.y + a.h - (a.y + y)) / a.h;
                const shift = Math.round(Math.sin(t / 110 + y / 9) * height * 1.6) * ART_PIXEL;
                const destY = FIRE_BASE.y - (FIRE_BASE.y - (a.y + y)) * stretch;
                fx.drawImage(fireLayer, 0, y, a.w, ART_PIXEL,
                    (a.x + shift) * scale, destY * scale, a.w * scale, ART_PIXEL * stretch * scale + 1);
            }
        }
    }

    let last = 0;
    function loop(t) {
        // 12 fotogrammi al secondo, come le animazioni dei giochi retrò
        if (t - last > 83) {
            last = t;
            stepEmbers();
            draw(t);
        }
        requestAnimationFrame(loop);
    }

    let resizeTimer = null;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layout, 150);
    });

    function start() {
        buildLayers();
        setupClouds();
        layout();
        if (!reduceMotion) requestAnimationFrame(loop);
    }

    // Aspetta che l'immagine e i caratteri siano pronti per misurare bene
    const ready = [];
    if (!art.complete) {
        ready.push(new Promise(function (resolve) {
            art.addEventListener("load", resolve, { once: true });
            art.addEventListener("error", resolve, { once: true });
        }));
    }
    if (document.fonts && document.fonts.ready) ready.push(document.fonts.ready);
    Promise.all(ready).then(start);
})();
