// =========================================================
// Scena del falò: cielo notturno, bosco, cavaliere e fuoco
// animato, tutto disegnato in pixel art su una tela piccola
// che viene ingrandita senza sfumare i pixel.
// =========================================================

(function () {
    "use strict";

    const canvas = document.getElementById("scene");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- Cavaliere seduto, rivolto verso il fuoco ----------

    const KNIGHT = [
        "..............000",
        ".............0rrr0",
        "...........00rrqq00",
        ".........00qrqq33560",
        "........0qqp023334560",
        ".......0qp002233244560",
        "......0pq00222332444560",
        ".....0pp0.0222332444560",
        ".....0p0..0227777777770",
        "......0...0222332333560",
        "..........0222332373760",
        "...........02233233370",
        "...........0023323560",
        ".........00c2g333560",
        "........0c02000000060",
        ".......0dc222333333560",
        "......0ddc222333333560",
        "......0dc0222333333560",
        "......0dc101111500000....000",
        ".....0ddc10111101123000004560",
        ".....0dcc110000001000230444560",
        ".....0dcc111222330112230333560",
        "....0ddcc111222333012230333560",
        "....0dcdc11122233301220003560",
        "....0dcdc111222333400022300060",
        "...0ddcddcbbbbbggbbbb022333560",
        "...0dcdddc11222333440022333560",
        "...0dcdddc11222000003302335600",
        "...0dcddddc0000222233300333060",
        "...0cddddcc1111222233301000560",
        "..0dcddddcc1111222233001123560",
        "..0dcdddccc1111222200.01123560",
        "..0cdccctttcc1122000..01123560",
        "..0cctttttttc000033c00000000000",
        ".0dcttttttttc333333330nnnnnnnn50",
        ".0ctttttttttc333333330nnnnnnnn500",
        ".0csssssssssc222222220nnnnnnnnnn50",
        "0dcsssssssssscccccc220bbbbbbbbbbb0",
        "0cdcsssssssssssssuucc0bbbbbbbbbbb0",
        ".0000ssssssssssssuu50.00000000000",
        ".....000sssssssss000"
    ];

    const KNIGHT_COLORS = {
        "0": "#0b0c1c", "1": "#262c45", "2": "#3a4262", "3": "#57618a",
        "4": "#7d88ae", "5": "#c4864e", "6": "#f0b46a", "7": "#070812",
        p: "#7e1a32", q: "#b52a45", r: "#e25a6e",
        c: "#1f1730", d: "#33264a", e: "#5c3443",
        b: "#2b211e", n: "#4a3730", g: "#d0a43a",
        s: "#24242f", t: "#3a3a4a", u: "#6a5040"
    };

    // Il busto (righe sopra questa) si alza di un pixel quando respira
    const KNIGHT_WAIST = 24;

    // ---------- Colori della scena ----------

    const SKY = ["#0a0c28", "#0e1236", "#131944", "#182152", "#1d2a61", "#24356f", "#2c417e", "#354d8a"];
    const NEAR_PINE = ["#08171b", "#0e2529", "#163639", "#214a49"];
    const MID_PINE = ["#0d1730", "#12203c", "#192b4a", "#223858"];
    const FIRE = ["#5a1206", "#9a1f08", "#d8400e", "#f57a1c", "#ffb02e", "#ffe066", "#fff6c8"];

    // ---------- Utilità ----------

    function rgb(hex) {
        return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }

    function mix(a, b, t) {
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }

    // Numero pseudo-casuale fisso per ogni coordinata: la scena è sempre uguale
    function hash(x, y) {
        const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return s - Math.floor(s);
    }

    let seed = 1;
    function random() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    }

    // Retino 4x4 per sfumare a pixel tra due colori
    const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

    // ---------- Stato ----------

    let W = 0, H = 0, S = 1;
    let groundY = 0, fireX = 0, knightX = 0, knightY = 0;
    let background = null;
    let knightCanvas = null;
    let stars = [], fireflies = [], embers = [];
    let heat = null;
    const FW = 22, FH = 30;

    // ---------- Sfondo statico (ridisegnato solo quando cambia la finestra) ----------

    function buildBackground() {
        const image = ctx.createImageData(W, H);
        const data = image.data;

        function set(x, y, color) {
            x = Math.round(x); y = Math.round(y);
            if (x < 0 || y < 0 || x >= W || y >= H) return;
            const i = (y * W + x) * 4;
            data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2]; data[i + 3] = 255;
        }

        const sky = SKY.map(rgb);
        const horizon = groundY - 4;

        // Cielo a bande con retino tra una banda e l'altra
        for (let y = 0; y < H; y++) {
            const f = Math.min(1, y / horizon) * (sky.length - 1);
            const i = Math.min(sky.length - 2, Math.floor(f));
            const frac = f - i;
            for (let x = 0; x < W; x++) {
                set(x, y, BAYER[y % 4][x % 4] / 16 < frac ? sky[i + 1] : sky[i]);
            }
        }

        // Luna con alone e crateri
        const mx = Math.round(W * 0.8), my = Math.max(30, Math.round(H * 0.16)), mr = 9;
        for (let y = -mr - 7; y <= mr + 7; y++) {
            for (let x = -mr - 7; x <= mr + 7; x++) {
                const d = Math.sqrt(x * x + y * y);
                if (d <= mr) {
                    const shade = d > mr - 2 || (x < -3 && y > 2) ? "#cdd0ef" : "#eeebff";
                    set(mx + x, my + y, rgb(shade));
                } else if (d <= mr + 7 && BAYER[(my + y) & 3][(mx + x) & 3] / 16 < (mr + 7 - d) / 10) {
                    set(mx + x, my + y, rgb("#3a4c8e"));
                }
            }
        }
        [[-3, -2, 2], [3, 3, 2], [1, -5, 1], [-5, 4, 1]].forEach(function (c) {
            for (let y = 0; y < c[2]; y++) for (let x = 0; x < c[2] + 1; x++) set(mx + c[0] + x, my + c[1] + y, rgb("#c4c7e8"));
        });

        // Nuvole sottili che attraversano il cielo
        [[0.62, 0.12, 46], [0.12, 0.22, 64], [0.78, 0.27, 38]].forEach(function (c) {
            const cx = W * c[0], cy = Math.round(H * c[1]) + 6, len = c[2];
            for (let x = -len / 2; x < len / 2; x++) {
                const thick = Math.round(3 * Math.sin(((x + len / 2) / len) * Math.PI));
                for (let y = 0; y < thick; y++) {
                    if (hash(cx + x, cy + y) > 0.2) set(cx + x, cy - y, rgb(y === 0 ? "#26336c" : "#2e3d7a"));
                }
            }
        });

        // Montagne lontane, con il bordo illuminato dalla luna
        function ridge(base, amp, freq, color, rim) {
            const c = rgb(color), r = rgb(rim);
            for (let x = 0; x < W; x++) {
                const h = base - Math.abs(Math.sin(x / freq + 1.3)) * amp - Math.abs(Math.sin(x / (freq * 0.41))) * amp * 0.4;
                const top = Math.round(h);
                for (let y = top; y < groundY; y++) set(x, y, y === top ? r : c);
            }
        }
        ridge(groundY - H * 0.24, 20, 31, "#181f4c", "#2a3570");
        ridge(groundY - H * 0.13, 14, 19, "#141a42", "#1f2856");

        // Linea di piccoli abeti all'orizzonte
        for (let x = -4; x < W + 4; x += 3 + Math.floor(hash(x, 7) * 4)) {
            const h = 6 + Math.floor(hash(x, 3) * 12);
            for (let y = 0; y < h; y++) {
                const w = Math.floor((y / h) * 3.2);
                for (let dx = -w; dx <= w; dx++) set(x + dx, groundY - 2 - h + y, rgb("#10163a"));
            }
        }

        // Prato con ciuffi d'erba
        const grass = ["#0e211d", "#132a24", "#18332a"].map(rgb);
        for (let y = groundY; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const n = hash(x, y);
                set(x, y, grass[n > 0.82 ? 2 : n > 0.35 ? 1 : 0]);
            }
        }
        for (let x = 0; x < W; x++) {
            const h = Math.floor(hash(x, 11) * 4);
            for (let y = 1; y <= h; y++) set(x, groundY - y, rgb(hash(x, 13) > 0.5 ? "#1c3a2f" : "#24493a"));
        }

        // Radura di terra battuta attorno al fuoco
        for (let y = groundY; y < Math.min(H, groundY + 14); y++) {
            for (let x = fireX - 60; x <= fireX + 60; x++) {
                const dx = (x - fireX) / 60, dy = (y - groundY - 4) / 10;
                const d = dx * dx + dy * dy;
                if (d < 1 && BAYER[y & 3][x & 3] / 16 > d * d) set(x, y, rgb(d < 0.35 ? "#3a2c26" : "#2a2220"));
            }
        }

        // Pini: prima quelli lontani, poi quelli vicini
        const gap = Math.max(52, Math.min(W * 0.2, 86));
        seed = 11;
        const midTrees = [], nearTrees = [];
        for (let x = 4; x < fireX - gap + 6; x += 9 + random() * 10) midTrees.push(x);
        for (let x = W - 4; x > fireX + gap - 6; x -= 9 + random() * 10) midTrees.push(x);
        for (let x = -6; x < fireX - gap - 14; x += 18 + random() * 16) nearTrees.push(x);
        for (let x = W + 6; x > fireX + gap + 14; x -= 18 + random() * 16) nearTrees.push(x);

        midTrees.forEach(function (x) {
            pine(set, x, groundY - 1, H * (0.24 + random() * 0.14), MID_PINE, 0);
        });
        nearTrees.forEach(function (x) {
            const warmth = Math.max(0, 1 - Math.abs(x - fireX) / (W * 0.42));
            pine(set, x, groundY + 3 + random() * 4, H * (0.48 + random() * 0.3), NEAR_PINE, warmth);
        });

        // Funghetti e fiori ai piedi degli alberi
        seed = 5;
        for (let i = 0; i < 10; i++) {
            const x = Math.round(random() * W);
            if (Math.abs(x - fireX) < gap) continue;
            const y = groundY + 1 + Math.round(random() * 3);
            if (random() > 0.5) {
                set(x, y, rgb("#d9d2c0")); set(x, y - 1, rgb("#b8343c")); set(x - 1, y - 1, rgb("#b8343c")); set(x + 1, y - 1, rgb("#8e2430"));
            } else {
                set(x, y, rgb("#24493a")); set(x, y - 1, rgb("#c9b8e8"));
            }
        }

        drawBonfire(set);

        const off = document.createElement("canvas");
        off.width = W; off.height = H;
        off.getContext("2d").putImageData(image, 0, 0);
        return off;
    }

    // Pino a più livelli di rami, con ombre e luce calda dal lato del fuoco
    function pine(set, cx, base, h, colors, warmth) {
        cx = Math.round(cx); base = Math.round(base); h = Math.round(h);
        const pal = colors.map(rgb);
        const warm = rgb("#8a5a2c");
        const light = cx < fireX ? 1 : -1;
        const trunkH = Math.max(3, Math.round(h * 0.12));
        const trunkW = Math.max(1, Math.round(h / 30));

        for (let y = base - trunkH; y <= base; y++) {
            for (let x = cx - trunkW; x <= cx + trunkW; x++) {
                set(x, y, rgb((x - cx) * light > 0 ? "#3a2a22" : "#22181a"));
            }
        }

        const top = base - h, bottom = base - trunkH * 0.5;
        const tiers = Math.max(3, Math.round(h / 12));
        const span = (bottom - top) / tiers;

        for (let t = 0; t < tiers; t++) {
            const ty = top + span * t * 0.96;
            const th = span * 1.75;
            const maxW = h * 0.27 * Math.pow((t + 1) / tiers, 0.85) + 2;

            for (let r = 0; r <= th; r++) {
                const y = Math.round(ty + r);
                const k = r / th;
                const w = maxW * Math.pow(k, 0.8);

                for (let x = Math.floor(cx - w - 2); x <= Math.ceil(cx + w + 2); x++) {
                    const dx = x - cx;
                    const edge = Math.abs(dx) - w;
                    const n = hash(x, y);
                    if (edge > 0 && !(edge < 1.6 && n > 0.55)) continue;
                    if (k > 0.82 && hash(x * 3, y) < (k - 0.82) * 4) continue;

                    const side = (dx * light) / (w + 1);
                    let s = 1;
                    if (side > 0.3) s = 2;
                    if (side < -0.3) s = 0;
                    if (k > 0.74) s = Math.max(0, s - 1);
                    if (k < 0.18 && side > -0.3) s = Math.min(3, s + 1);
                    if (n > 0.88) s = Math.max(0, s - 1);
                    if (n < 0.05) s = Math.min(3, s + 1);

                    let color = pal[s];
                    if (warmth > 0 && side > 0.55 && k > 0.3) color = mix(color, warm, warmth * (side - 0.4));
                    set(x, y, color);
                }
            }
        }
        set(cx, top - 1, pal[2]);
        set(cx, top - 2, pal[3]);
    }

    // Cerchio di pietre, tronchi incrociati e spada piantata nel fuoco
    function drawBonfire(set) {
        const fx = fireX, fy = groundY;

        // Cenere
        for (let x = -10; x <= 10; x++) for (let y = 0; y < 3; y++) if (hash(x, y + 50) > 0.3) set(fx + x, fy + y - 1, rgb(y === 0 ? "#4a3a36" : "#2e2624"));

        // Tronchi incrociati
        for (let i = -9; i <= 9; i++) {
            const y1 = fy - 2 - Math.round((9 - Math.abs(i)) * 0.25);
            set(fx + i, y1, rgb("#5e3d22")); set(fx + i, y1 + 1, rgb("#3a2618"));
        }
        set(fx - 9, fy - 2, rgb("#a07a4c")); set(fx + 9, fy - 2, rgb("#a07a4c"));

        // Spada: elsa, guardia e lama infilata tra le braci
        const top = fy - 40;
        set(fx, top, rgb("#d0a43a"));
        for (let y = top + 1; y < top + 5; y++) { set(fx, y, rgb("#3a2a20")); set(fx + 1, y, rgb("#5a4030")); }
        for (let x = -3; x <= 4; x++) set(fx + x, top + 5, rgb(x === -3 || x === 4 ? "#d0a43a" : "#6a5040"));
        for (let y = top + 6; y < fy - 1; y++) {
            set(fx, y, rgb((y & 3) === 0 ? "#6a7090" : "#a8b0cc"));
            set(fx + 1, y, rgb((y & 3) === 2 ? "#b07a44" : "#f0c48a"));
        }

        // Pietre attorno al fuoco: più calde quelle davanti
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const sx = Math.round(fx + Math.cos(a) * 14), sy = Math.round(fy + 1 + Math.sin(a) * 3);
            const front = Math.sin(a) > 0;
            for (let x = 0; x < 3; x++) {
                set(sx + x, sy, rgb(front ? "#5a4a46" : "#34303a"));
                set(sx + x, sy + 1, rgb(front ? "#3a3036" : "#24222c"));
            }
            set(sx + 1, sy - 1, rgb(front ? "#8a6a52" : "#4a4450"));
        }
    }

    // Disegna il cavaliere una volta su una tela a parte
    function buildKnight() {
        const c = document.createElement("canvas");
        c.width = Math.max.apply(null, KNIGHT.map(function (r) { return r.length; }));
        c.height = KNIGHT.length;
        const g = c.getContext("2d");
        KNIGHT.forEach(function (row, y) {
            for (let x = 0; x < row.length; x++) {
                const color = KNIGHT_COLORS[row[x]];
                if (color) { g.fillStyle = color; g.fillRect(x, y, 1, 1); }
            }
        });
        return c;
    }

    // ---------- Elementi animati ----------

    function setupLife() {
        seed = 3;
        stars = [];
        for (let i = 0; i < Math.round(W * H / 420); i++) {
            const x = Math.round(random() * W), y = Math.round(random() * (groundY - H * 0.3));
            stars.push({ x: x, y: y, big: random() > 0.93, speed: 0.5 + random() * 2, phase: random() * 6.28, bright: random() > 0.6 });
        }

        fireflies = [];
        for (let i = 0; i < 9; i++) {
            fireflies.push({ x: random() * W, y: groundY - 8 - random() * H * 0.25, phase: random() * 6.28, speed: 0.3 + random() * 0.5 });
        }

        heat = new Uint8Array(FW * FH);
        embers = [];
    }

    function px(x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }

    // Fuoco "alla Doom": il calore sale dalla base e si raffredda salendo
    function stepFire() {
        const center = (FW - 1) / 2;
        for (let x = 0; x < FW; x++) {
            const edge = Math.abs(x - center) / center;
            heat[(FH - 1) * FW + x] = edge > 0.85 ? 0 : Math.round((38 - edge * 12) * (0.85 + Math.random() * 0.15));
        }
        for (let y = 1; y < FH; y++) {
            for (let x = 0; x < FW; x++) {
                const value = heat[y * FW + x];
                const r = Math.floor(Math.random() * 3);
                const dx = Math.min(FW - 1, Math.max(0, x - r + 1));
                const edge = Math.abs(dx - center) / center;
                const decay = (r & 1) + (Math.random() < edge * 0.9 ? 1 : 0) + (edge > 0.85 ? 1 : 0);
                heat[(y - 1) * FW + dx] = Math.max(0, value - decay);
            }
        }
    }

    function drawFire() {
        const left = fireX - Math.floor(FW / 2) + 1, top = groundY - FH - 1;
        for (let y = 0; y < FH; y++) {
            for (let x = 0; x < FW; x++) {
                const v = heat[y * FW + x];
                if (v < 4) continue;
                const i = Math.min(FIRE.length - 1, Math.floor((v - 4) / 5));
                px(left + x, top + y, FIRE[i]);
            }
        }
    }

    function stepEmbers() {
        if (Math.random() < 0.55) {
            embers.push({ x: fireX + (Math.random() * 10 - 5), y: groundY - 14 - Math.random() * 10, vx: (Math.random() - 0.5) * 0.4, vy: -0.5 - Math.random() * 0.7, life: 0, max: 22 + Math.random() * 30 });
        }
        embers = embers.filter(function (e) {
            e.life++;
            e.x += e.vx + Math.sin(e.life / 3) * 0.25;
            e.y += e.vy;
            return e.life < e.max;
        });
    }

    function drawGlow(t) {
        const flicker = 0.85 + Math.sin(t / 130) * 0.06 + Math.random() * 0.09;
        // Anelli di luce schiacciati, una riga di pixel alla volta
        const rings = [[56, 0.03], [42, 0.04], [30, 0.055], [20, 0.07], [12, 0.09]];
        ctx.globalCompositeOperation = "lighter";
        rings.forEach(function (ring) {
            const r = ring[0], ry = Math.round(r * 0.5);
            ctx.fillStyle = "rgba(255, 130, 40, " + (ring[1] * flicker) + ")";
            for (let y = -ry; y <= ry; y++) {
                const k = y / ry;
                const w = Math.round(Math.sqrt(1 - k * k) * r * 1.4);
                ctx.fillRect(fireX - w, groundY - 12 + y, w * 2, 1);
            }
        });
        ctx.globalCompositeOperation = "source-over";
    }

    // ---------- Disegno di un fotogramma ----------

    function draw(t) {
        ctx.drawImage(background, 0, 0);

        stars.forEach(function (s) {
            const on = Math.sin(t / 1000 * s.speed + s.phase) > -0.2;
            const color = on ? (s.bright ? "#ffffff" : "#b9c0f0") : "#5b66a8";
            px(s.x, s.y, color);
            if (s.big && on) {
                px(s.x - 1, s.y, "#6f7bc0"); px(s.x + 1, s.y, "#6f7bc0");
                px(s.x, s.y - 1, "#6f7bc0"); px(s.x, s.y + 1, "#6f7bc0");
            }
        });

        drawGlow(t);

        // Il cavaliere respira: il busto si alza di un pixel ogni tanto
        const breath = Math.sin(t / 900) > 0.35 ? 1 : 0;
        const kw = knightCanvas.width;
        ctx.drawImage(knightCanvas, 0, KNIGHT_WAIST, kw, knightCanvas.height - KNIGHT_WAIST, knightX, knightY + KNIGHT_WAIST, kw, knightCanvas.height - KNIGHT_WAIST);
        ctx.drawImage(knightCanvas, 0, 0, kw, KNIGHT_WAIST + 1, knightX, knightY - breath, kw, KNIGHT_WAIST + 1);

        drawFire();

        embers.forEach(function (e) {
            const k = e.life / e.max;
            px(e.x, e.y, k < 0.3 ? "#fff0a0" : k < 0.65 ? "#ffb02e" : "#d8400e");
        });

        fireflies.forEach(function (f) {
            const x = f.x + Math.sin(t / 1000 * f.speed + f.phase) * 12;
            const y = f.y + Math.cos(t / 1300 * f.speed + f.phase) * 6;
            const glow = Math.sin(t / 500 + f.phase);
            if (glow > 0.2) px(x, y, glow > 0.7 ? "#e4ff8a" : "#8aa84a");
        });
    }

    // ---------- Dimensioni e ciclo di animazione ----------

    function resize() {
        const box = canvas.parentElement.getBoundingClientRect();
        S = Math.max(2, Math.round(Math.min(box.width / 360, box.height / 225)));
        W = Math.ceil(box.width / S);
        H = Math.ceil(box.height / S);

        canvas.width = W;
        canvas.height = H;
        canvas.style.width = W * S + "px";
        canvas.style.height = H * S + "px";

        groundY = Math.round(H * (W < 240 ? 0.86 : 0.84));
        fireX = Math.round(W * (W < 240 ? 0.6 : 0.56));
        knightCanvas = knightCanvas || buildKnight();
        knightX = fireX - knightCanvas.width - 8;
        knightY = groundY - knightCanvas.height + 3;

        setupLife();
        background = buildBackground();
        for (let i = 0; i < FH; i++) stepFire();
        draw(0);
    }

    let last = 0;
    function loop(t) {
        // 12 fotogrammi al secondo, come le animazioni dei giochi retrò
        if (t - last > 83) {
            last = t;
            stepFire();
            stepEmbers();
            draw(t);
        }
        requestAnimationFrame(loop);
    }

    let resizeTimer = null;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 150);
    });

    resize();
    if (!reduceMotion) requestAnimationFrame(loop);
})();
