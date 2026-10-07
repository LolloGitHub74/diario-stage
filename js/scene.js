// =========================================================
// Scena del falò: l'illustrazione fa da sfondo alla home e
// sopra si anima il fuoco. Il cavaliere resta fermo.
// Cielo e alberi si possono riaccendere da ANIMATE.
// =========================================================

(function () {
    "use strict";

    const world = document.querySelector(".world");
    const art = document.getElementById("scene-art");
    const canvas = document.getElementById("scene-fx");
    if (!world || !art || !canvas) return;

    const fx = canvas.getContext("2d");
    const ui = world.querySelector(".world-ui");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Cosa si muove: per ora solo il fuoco (fiamme, scintille, fumo e luce)
    const ANIMATE = { sky: false, trees: false, fire: true };

    // ---------- Misure dell'illustrazione (in pixel dell'immagine) ----------

    const IMAGE_W = 1672, IMAGE_H = 941;
    const RATIO = IMAGE_W / IMAGE_H;
    const PX = 8;                          // un pixel del disegno = 8 pixel dell'immagine
    const FOCUS_X = 0.33;                  // tra il fuoco e il protagonista
    const SAFE_TOP = 0.6;                  // sopra questa altezza non ci sono né fuoco né protagonista

    // Cielo e alberi (usati solo se si riaccendono in ANIMATE)
    const SKY_H = 560;                     // fin qui arrivano cielo e cime degli alberi
    const TRUNKS = [[80, 290], [1515, 1610]];   // colonne dei grandi tronchi, che restano fermi
    const FIRE_AREA = { x: 495, y: 664, w: 160, h: 134 };     // fiamme sopra i tronchi
    const FIRE_BASE = { x: 575, y: 795 };
    // La spada piantata nel fuoco (lama ed elsa dorata) resta ferma
    const SWORD = [{ x: 560, y: 640, w: 34, h: 170 }, { x: 512, y: 680, w: 120, h: 22 }];
    const LIGHT_RADIUS = 330;              // fin dove arriva la luce del fuoco
    const MOON = { x: 1290, y: 145 };
    const HORIZON = { x: 1060, y: 395 };

    let scale = 1;
    let plate = null, trees = null, flames = null, lit = null;
    let stars = [], clouds = [], embers = [], smoke = [];
    let shooting = null, nextShooting = 5;


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

        [art, canvas].forEach(function (element) {
            element.style.width = width + "px";
            element.style.height = height + "px";
            element.style.left = left + "px";
            element.style.top = top + "px";
        });

        art.classList.toggle("is-floating", top > 1);
        canvas.classList.toggle("is-floating", top > 1);

        // La tela ha la risoluzione dello schermo, per restare nitida
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        scale = canvas.width / IMAGE_W;
        fx.imageSmoothingEnabled = false;

        draw(performance.now());
    }


    // ---------- Lettura dell'immagine e livelli ritagliati ----------

    function makeCanvas(w, h) {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
    }

    function fromData(data) {
        const c = makeCanvas(data.width, data.height);
        c.getContext("2d").putImageData(data, 0, 0);
        return c;
    }

    function build() {
        const source = makeCanvas(IMAGE_W, IMAGE_H);
        const g = source.getContext("2d");
        g.drawImage(art, 0, 0);
        const d = g.getImageData(0, 0, IMAGE_W, IMAGE_H).data;

        function sum(x, y) {
            const i = (y * IMAGE_W + x) * 4;
            return d[i] + d[i + 1] + d[i + 2];
        }

        // Cime degli alberi: i pixel quasi neri contro il cielo
        function isTree(x, y) {
            if (TRUNKS.some(function (t) { return x >= t[0] && x < t[1]; })) return false;
            return sum(x, y) < 55;
        }

        // Il cielo "dietro" gli alberi: ogni pixel d'albero prende il colore
        // del cielo più vicino sulla stessa riga, così quando i rami si
        // spostano non compaiono buchi
        if (ANIMATE.sky || ANIMATE.trees) buildSky();

        function buildSky() {
        const plateData = new ImageData(IMAGE_W, SKY_H);
        const treeData = new ImageData(IMAGE_W, SKY_H);
        const left = new Int32Array(IMAGE_W), right = new Int32Array(IMAGE_W);

        for (let y = 0; y < SKY_H; y++) {
            let last = -1;
            for (let x = 0; x < IMAGE_W; x++) { if (!isTree(x, y)) last = x; left[x] = last; }
            last = -1;
            for (let x = IMAGE_W - 1; x >= 0; x--) { if (!isTree(x, y)) last = x; right[x] = last; }

            for (let x = 0; x < IMAGE_W; x++) {
                const i = (y * IMAGE_W + x) * 4;
                let src = x;
                if (isTree(x, y)) {
                    for (let k = 0; k < 4; k++) treeData.data[i + k] = d[i + k];
                    const l = left[x], r = right[x];
                    if (l < 0 && r >= 0) src = r;
                    else if (r < 0 && l >= 0) src = l;
                    else if (l >= 0 && r >= 0) src = x - l <= r - x ? l : r;
                }
                const s = (y * IMAGE_W + src) * 4;
                for (let k = 0; k < 4; k++) plateData.data[i + k] = d[s + k];
            }
        }
        plate = fromData(plateData);
        trees = fromData(treeData);
        }

        // Fiamme: solo i pixel arancioni e gialli, la spada resta ferma
        const a = FIRE_AREA;
        const flameData = new ImageData(a.w, a.h);
        for (let y = 0; y < a.h; y++) {
            for (let x = 0; x < a.w; x++) {
                const i = ((a.y + y) * IMAGE_W + a.x + x) * 4, o = (y * a.w + x) * 4;
                const px = a.x + x, py = a.y + y;
                const sword = SWORD.some(function (r) { return px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h; });
                if (!sword && d[i] > 150 && d[i] > d[i + 2] + 70) for (let k = 0; k < 4; k++) flameData.data[o + k] = d[i + k];
            }
        }
        flames = fromData(flameData);

        // Ciò che il fuoco illumina di arancio attorno a sé: terreno, pietre, tronco
        const litData = new ImageData(IMAGE_W, IMAGE_H);
        for (let y = 0; y < IMAGE_H; y++) {
            for (let x = 0; x < IMAGE_W; x++) {
                if (Math.hypot(x - FIRE_BASE.x, (y - FIRE_BASE.y) * 1.6) > LIGHT_RADIUS) continue;
                const i = (y * IMAGE_W + x) * 4;
                if (d[i] > 70 && d[i] > d[i + 2] + 35) for (let k = 0; k < 4; k++) litData.data[i + k] = d[i + k];
            }
        }
        lit = fromData(litData);

        // Stelle dipinte: pixel chiari isolati nel cielo (non la luna)
        stars = [];
        if (!ANIMATE.sky) return;
        for (let y = 4; y < 360; y += 2) {
            for (let x = 400; x < 1520; x += 2) {
                if (sum(x, y) < 330) continue;
                const p = (y * IMAGE_W + x) * 4;
                if (d[p] > d[p + 2] + 20) continue;   // pixel caldi: tronchi illuminati, non stelle
                if (Math.hypot(x - MOON.x, y - MOON.y) < 60) continue;
                if (stars.some(function (s) { return Math.abs(s.x - x) < 14 && Math.abs(s.y - y) < 14; })) continue;
                const bx = Math.max(0, x - PX * 2);
                const bi = (y * IMAGE_W + bx) * 4;
                stars.push({ x: x - 2, y: y - 2, painted: true, phase: Math.random() * 6.28, speed: 0.6 + Math.random(), bg: "rgb(" + d[bi] + "," + d[bi + 1] + "," + d[bi + 2] + ")" });
            }
        }

        // Stelline nuove, solo dove c'è cielo libero
        for (let n = 0; n < 160 && stars.length < 60; n++) {
            const x = 420 + Math.floor(Math.random() * 1120), y = 10 + Math.floor(Math.random() * 300);
            const s = sum(x, y);
            if (s < 85 || s > 135) continue;
            let clear = true;
            for (let k = -PX * 2; k <= PX * 2 && clear; k += PX) if (sum(Math.min(IMAGE_W - 1, Math.max(0, x + k)), y) < 60) clear = false;
            if (!clear) continue;
            stars.push({ x: x, y: y, painted: false, phase: Math.random() * 6.28, speed: 0.4 + Math.random() * 1.2 });
        }
    }


    // ---------- Nuvole ----------

    function makeCloud(length) {
        const c = makeCanvas(length + 12, 12);
        const g = c.getContext("2d");
        const puffs = [];
        for (let i = 0; i < length / 5; i++) puffs.push([6 + i * 5 + Math.random() * 3, 8 - Math.random() * 3, 3 + Math.random() * 4]);
        function inside(x, y) {
            return puffs.some(function (p) {
                const dx = x - p[0], dy = y - p[1];
                return dx * dx + dy * dy <= p[2] * p[2];
            });
        }
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < c.width; x++) {
                if (!inside(x, y)) continue;
                g.fillStyle = !inside(x, y - 1) ? "#4c5088" : !inside(x, y - 2) ? "#363f74" : y > 7 ? "#1d2852" : "#283362";
                g.fillRect(x, y, 1, 1);
            }
        }
        return c;
    }

    function setupClouds() {
        clouds = [[0.05, 120, 24, 9], [0.4, 200, 30, 6], [0.7, 150, 20, 11], [0.25, 270, 18, 8]].map(function (c) {
            return { image: makeCloud(c[2]), x: c[0] * IMAGE_W, y: c[1], speed: c[3] };
        });
    }


    // ---------- Particelle del fuoco ----------

    function stepParticles(dt) {
        if (Math.random() < 0.6) {
            embers.push({
                x: FIRE_BASE.x + (Math.random() - 0.5) * 90,
                y: FIRE_BASE.y - 90 - Math.random() * 90,
                vx: (Math.random() - 0.5) * 12,
                vy: -25 - Math.random() * 35,
                life: 0, max: 1.6 + Math.random() * 2
            });
        }
        if (Math.random() < 0.18) {
            smoke.push({ x: FIRE_BASE.x + (Math.random() - 0.5) * 30, y: FIRE_BASE.y - 200, life: 0, max: 4 + Math.random() * 2 });
        }
        embers = embers.filter(function (e) {
            e.life += dt;
            e.x += (e.vx + Math.sin(e.life * 5) * 8) * dt;
            e.y += e.vy * dt;
            return e.life < e.max;
        });
        smoke = smoke.filter(function (s) {
            s.life += dt;
            s.x += 9 * dt;
            s.y -= 22 * dt;
            return s.life < s.max;
        });

        // Ogni tanto una stella cadente
        nextShooting -= dt;
        if (ANIMATE.sky && !shooting && nextShooting <= 0) {
            shooting = { x: 520 + Math.random() * 700, y: 20 + Math.random() * 110, life: 0 };
            nextShooting = 9 + Math.random() * 10;
        }
        if (shooting) {
            shooting.life += dt;
            if (shooting.life > 0.9) shooting = null;
        }
    }


    // ---------- Disegno ----------

    // Rettangolo in coordinate dell'immagine, allineato ai pixel della tela
    function rect(x, y, w, h, color) {
        fx.fillStyle = color;
        const x0 = Math.round(x * scale), y0 = Math.round(y * scale);
        fx.fillRect(x0, y0, Math.round((x + w) * scale) - x0, Math.round((y + h) * scale) - y0);
    }

    function glowAt(x, y, radius, color, alpha) {
        const gradient = fx.createRadialGradient(x * scale, y * scale, 0, x * scale, y * scale, radius * scale);
        gradient.addColorStop(0, color + alpha + ")");
        gradient.addColorStop(1, color + "0)");
        fx.fillStyle = gradient;
        fx.fillRect((x - radius) * scale, (y - radius) * scale, radius * 2 * scale, radius * 2 * scale);
    }

    function draw(time) {
        const t = time / 1000;
        fx.clearRect(0, 0, canvas.width, canvas.height);
        if (!flames) return drawFireParticles(t);
        if (plate) drawSky(t);
        drawFire(t);
    }

    function drawSky(t) {
        // Cielo: lo sfondo senza le cime degli alberi
        fx.drawImage(plate, 0, 0, IMAGE_W, SKY_H, 0, 0, IMAGE_W * scale, SKY_H * scale);

        if (ANIMATE.sky) {
            // Bagliore viola all'orizzonte e alone della luna, che respirano piano
            fx.globalCompositeOperation = "lighter";
            glowAt(HORIZON.x, HORIZON.y, 380, "rgba(140, 60, 130, ", 0.05 + Math.sin(t * 0.5) * 0.025);
            glowAt(MOON.x, MOON.y, 110, "rgba(180, 190, 255, ", 0.07 + Math.sin(t * 0.7) * 0.03);
            fx.globalCompositeOperation = "source-over";

            // Stelle che brillano a turno
            stars.forEach(function (s) {
                const k = Math.sin(t * s.speed + s.phase);
                if (s.painted) {
                    if (k < -0.55) rect(s.x - 1, s.y - 1, PX + 2, PX + 2, s.bg);
                    else if (k > 0.85) {
                        rect(s.x - PX, s.y, PX, PX, "#6f7cc0");
                        rect(s.x + PX, s.y, PX, PX, "#6f7cc0");
                        rect(s.x, s.y - PX, PX, PX, "#6f7cc0");
                        rect(s.x, s.y + PX, PX, PX, "#6f7cc0");
                    }
                } else if (k > -0.2) {
                    rect(s.x, s.y, PX, PX, k > 0.7 ? "#dfe4ff" : "#7d89c8");
                }
            });

            // Stella cadente con la scia che si spegne
            if (shooting) {
                for (let i = 0; i < 7; i++) {
                    const p = shooting.life - i * 0.03;
                    if (p < 0) continue;
                    const fade = 1 - shooting.life / 0.9;
                    fx.globalAlpha = Math.max(0, fade * (1 - i / 7));
                    rect(shooting.x + p * 420, shooting.y + p * 160, PX, PX, i === 0 ? "#ffffff" : "#aab6ff");
                }
                fx.globalAlpha = 1;
            }

            // Nuvole che scorrono dietro gli alberi
            fx.globalAlpha = 0.85;
            clouds.forEach(function (c) {
                const w = c.image.width * PX;
                const span = IMAGE_W + w;
                const x = ((c.x + t * c.speed) % span + span) % span - w;
                const sx = Math.round(x / PX) * PX;
                fx.drawImage(c.image, sx * scale, c.y * scale, w * scale, c.image.height * PX * scale);
            });
            fx.globalAlpha = 1;
        }

        if (!ANIMATE.trees) return;

        // Cime degli alberi piegate dal vento: più in alto, più si muovono
        const gust = Math.sin(t * 0.9) * 0.7 + Math.sin(t * 2.1 + 1) * 0.3;
        for (let y = 0; y < SKY_H; y += PX) {
            const height = Math.min(1, Math.max(0, (SKY_H - y) / 300));
            const shift = Math.round(gust * height * 1.3) * PX;
            const h = Math.min(PX, SKY_H - y);
            fx.drawImage(trees, 0, y, IMAGE_W, h, shift * scale, y * scale, IMAGE_W * scale, h * scale);
        }
    }

    function drawFire(t) {
        // La luce del fuoco pulsa su tronchi, rocce e terreno
        const flicker = 0.6 + Math.sin(t * 7) * 0.2 + Math.random() * 0.2;
        fx.globalCompositeOperation = "lighter";
        fx.globalAlpha = 0.08 + flicker * 0.14;
        fx.drawImage(lit, 0, 0, IMAGE_W * scale, IMAGE_H * scale);
        fx.globalAlpha = 1;
        fx.globalCompositeOperation = "source-over";

        // Fiamme che ondeggiano: più in alto, più si muovono; la base resta ferma
        const a = FIRE_AREA;
        const stretch = 1 + Math.sin(t * 11) * 0.03 + Math.random() * 0.04;
        for (let y = 0; y < a.h; y += PX) {
            const height = (a.h - y) / a.h;
            const shift = Math.round(Math.sin(t * 9 + y / 14) * height * 1.4) * PX;
            const destY = FIRE_BASE.y - (FIRE_BASE.y - (a.y + y)) * stretch;
            fx.drawImage(flames, 0, y, a.w, PX, (a.x + shift) * scale, destY * scale, a.w * scale, PX * stretch * scale + 1);
        }

        drawFireParticles(t);
    }

    function drawFireParticles(t) {
        // Fumo che sale e si allarga
        smoke.forEach(function (s) {
            const k = s.life / s.max;
            fx.globalAlpha = 0.22 * (1 - k);
            const size = PX * (1 + Math.floor(k * 3));
            rect(Math.round(s.x / PX) * PX, Math.round(s.y / PX) * PX, size, size, "#5a5a78");
        });
        fx.globalAlpha = 1;

        // Bagliore caldo attorno al fuoco
        fx.globalCompositeOperation = "lighter";
        glowAt(FIRE_BASE.x, FIRE_BASE.y - 80, 260, "rgba(255, 130, 50, ", 0.1 + Math.random() * 0.05);
        fx.globalCompositeOperation = "source-over";

        // Scintille: gialle appena nate, poi arancioni e rosse
        embers.forEach(function (e) {
            const k = e.life / e.max;
            rect(Math.round(e.x / PX) * PX, Math.round(e.y / PX) * PX, PX, PX, k < 0.3 ? "#fff0a0" : k < 0.65 ? "#ffb02e" : "#d8400e");
        });
    }


    // ---------- Ciclo di animazione ----------

    let last = 0;
    function loop(time) {
        // 12 fotogrammi al secondo, come le animazioni dei giochi retrò
        if (time - last > 83) {
            const dt = last ? Math.min(0.2, (time - last) / 1000) : 0.083;
            last = time;
            stepParticles(dt);
            draw(time);
        }
        requestAnimationFrame(loop);
    }

    let resizeTimer = null;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layout, 150);
    });

    function start() {
        try {
            build();
        } catch (error) {
            // Se il browser non permette di leggere i pixel, restano scintille e bagliore
            plate = trees = flames = lit = null;
        }
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
