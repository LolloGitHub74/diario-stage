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

    // ---------- Cavaliere che riposa con la schiena contro una colonna ----------

    const KNIGHT = [
        "......0000",
        "....00qrrq0",
        "...0qrrq8560",
        "..0qrq8838560",
        ".0qqp388388560",
        ".0pq33883888560",
        "0pp333343444560",
        "0p0333347777770",
        "0p0333343444560",
        ".00333343447470",
        "...03334347470",
        "....033434560",
        "...021344560",
        "..01881111160",
        "..044444444560",
        "..044444444560",
        "..0444444444160",
        ".04122222221560",
        ".04412222211560",
        ".044411111314560.....00.000",
        ".044441331111140..0008808560",
        ".0333331188888100044411888560",
        "..033331144444441444441444560",
        "..0333331133333313333314444560",
        "..03333311222222133333114441560",
        "...0222133111111113331110014560",
        "...0bbb3333333333311100331333560",
        "...02221333333333111220033133356000",
        "....022133333331122000..0021311145600",
        ".....00002222100000.......011444444560",
        ".........02000.............013333333560",
        "..........0.................033333333560",
        "............................0222222222160",
        ".............................00011160000",
        "................................0000"
    ];

    const KNIGHT_COLORS = {
        "0": "#0b0c1c", "1": "#2e3346", "2": "#5a6280", "3": "#8a93ad",
        "4": "#bcc3d6", "8": "#e9edf5", "5": "#c4864e", "6": "#f0b46a", "7": "#070812",
        p: "#7e1a32", q: "#b52a45", r: "#e25a6e",
        c: "#1f1730", d: "#33264a", e: "#5c3443",
        b: "#2b211e", n: "#4a3730", g: "#d0a43a",
        s: "#24242f", t: "#3a3a4a", u: "#6a5040"
    };

    // Il busto (righe sopra questa) si alza di un pixel quando respira
    const KNIGHT_WAIST = 20;

    // ---------- Colori della scena ----------

    const SKY = ["#0a0c28", "#0e1236", "#131944", "#182152", "#1d2a61", "#24356f", "#2c417e", "#354d8a"];
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
    let stars = [], fireflies = [], embers = [], windows = [];
    let heat = null;
    const FW = 22, FH = 30;

    // ---------- Sfondo statico (ridisegnato solo quando cambia la finestra) ----------

    function buildBackground() {
        const image = ctx.createImageData(W, H);
        const data = image.data;

        // Ricorda quali pixel non sono più cielo libero (per non metterci stelle)
        const covered = new Uint8Array(W * H);
        let skyDone = false;

        function set(x, y, color) {
            x = Math.round(x); y = Math.round(y);
            if (x < 0 || y < 0 || x >= W || y >= H) return;
            if (skyDone) covered[y * W + x] = 1;
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
        const mx = Math.round(W * (W < 240 ? 0.8 : 0.78)), my = Math.max(34, Math.round(H * 0.22)), mr = 10;
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

        skyDone = true;

        // Grandi nuvole illuminate dalla luna sul bordo superiore
        seed = 21;
        [[0.08, 0.2, 70], [0.38, 0.12, 90], [0.62, 0.3, 80], [0.9, 0.16, 70], [0.25, 0.36, 60]].forEach(function (c) {
            cloud(set, W * c[0], Math.round(H * c[1]) + 8, c[2]);
        });

        // Montagne lontane, basse e scure
        function ridge(base, amp, freq, color, rim) {
            const c = rgb(color), r = rgb(rim);
            for (let x = 0; x < W; x++) {
                const h = base - Math.abs(Math.sin(x / freq + 1.3)) * amp - Math.abs(Math.sin(x / (freq * 0.41))) * amp * 0.4;
                const top = Math.round(h);
                for (let y = top; y < groundY; y++) set(x, y, y === top ? r : c);
            }
        }
        ridge(groundY - H * 0.2, 16, 37, "#161c46", "#252f66");

        drawCastle(set);

        // Rovine a mezza distanza: muri bassi e spezzati, quasi in ombra
        seed = 31;
        for (let x = 0; x < W;) {
            const len = 14 + Math.floor(random() * 30), h = 6 + Math.floor(random() * 16);
            if (random() > 0.25) {
                stone(set, x, groundY - h, len, h, function (px, py) {
                    return py >= groundY - h + Math.floor(hash(Math.floor(px / 4), 9) * 6);
                }, 0.55);
            }
            x += len + 4 + Math.floor(random() * 18);
        }

        drawGround(set);
        drawArch(set);
        drawRightWall(set);
        drawPillar(set);
        drawBonfire(set);

        stars = stars.filter(function (star) {
            return !covered[star.y * W + star.x];
        });

        const off = document.createElement("canvas");
        off.width = W; off.height = H;
        off.getContext("2d").putImageData(image, 0, 0);
        return off;
    }

    // Quanto la luce del fuoco scalda un punto (0 = niente, 1 = moltissimo)
    function warmth(x, y) {
        const dx = (x - fireX) / 1.3, dy = y - (groundY - 10);
        const d = Math.sqrt(dx * dx + dy * dy);
        return Math.max(0, 1 - d / 90);
    }

    // Nuvola a sbuffi: base piatta, bordo alto chiaro dove la luna la colpisce
    function cloud(set, cx, cy, len) {
        const body = rgb("#1c2556"), lit = rgb("#33427e"), under = rgb("#161d48");
        const puffs = [];
        for (let i = 0; i < len / 9; i++) {
            puffs.push([cx - len / 2 + (i + 0.5) * 9 + (random() - 0.5) * 6, cy - random() * 5, 5 + random() * 7]);
        }
        for (let y = Math.floor(cy - 14); y <= cy + 3; y++) {
            for (let x = Math.floor(cx - len / 2 - 8); x <= cx + len / 2 + 8; x++) {
                let inside = false, top = false;
                puffs.forEach(function (p) {
                    const dx = x - p[0], dy = y - p[1];
                    const d = dx * dx + dy * dy;
                    if (d <= p[2] * p[2]) { inside = true; if (d > (p[2] - 2) * (p[2] - 2) && dy < 0) top = true; }
                });
                if (!inside || y > cy + 2) continue;
                const edge = top && !puffs.some(function (p) { const dx = x - p[0], dy = y - 1 - p[1]; return dx * dx + dy * dy <= (p[2] - 1) * (p[2] - 1); });
                set(x, y, edge ? lit : y > cy ? under : body);
            }
        }
    }

    // Muro di pietra a blocchi; mask(x, y) dice quali pixel fanno parte della forma
    function stone(set, x0, y0, w, h, mask, shade) {
        const pal = ["#1d1b26", "#2b2833", "#3a3540", "#4b4248"].map(rgb);
        const dark = rgb("#14121b");
        const warm = rgb("#b06a38");
        const bw = 8, bh = 4;
        for (let y = y0; y < y0 + h; y++) {
            const row = Math.floor((y - y0) / bh);
            const offset = row % 2 ? bw / 2 : 0;
            for (let x = x0; x < x0 + w; x++) {
                if (mask && !mask(x, y)) continue;
                const col = Math.floor((x - x0 + offset) / bw);
                const mortar = (y - y0) % bh === bh - 1 || (x - x0 + offset) % bw === 0;
                let c;
                if (mortar) c = dark;
                else {
                    let s = 1 + Math.floor(hash(col, row) * 2.6);
                    if ((y - y0) % bh === 0) s = Math.min(3, s + 1);
                    if (hash(x, y) > 0.9) s = Math.max(0, s - 1);
                    c = pal[s];
                }
                if (shade) c = mix(c, rgb("#10142e"), shade);
                const k = warmth(x, y);
                if (k > 0) c = mix(c, warm, k * k * (mortar ? 0.4 : 0.85));
                set(x, y, c);
            }
        }
    }

    // Castello gotico in rovina su una collina, con le finestre accese
    function drawCastle(set) {
        const cx = Math.round(W * (W < 240 ? 0.66 : 0.72));
        const base = Math.round(groundY - H * 0.27);
        const sil = rgb("#0f1330"), rim = rgb("#252e5c"), hill = rgb("#121636");

        // Collina
        for (let x = Math.round(cx - W * 0.32); x < Math.round(cx + W * 0.36); x++) {
            const t = (x - cx) / (W * 0.34);
            const top = Math.round(base + 6 + t * t * H * 0.18 + Math.sin(x / 5) * 1.5);
            for (let y = top; y < groundY; y++) set(x, y, y === top ? rim : hill);
        }

        // Acquedotto ad archi che esce dal castello verso sinistra
        const aqTop = base + 10, aqLeft = Math.round(cx - W * 0.42), aqRight = cx - 30;
        for (let x = aqLeft; x < aqRight; x++) {
            for (let y = aqTop; y < aqTop + 18; y++) {
                const local = (x - aqLeft) % 12;
                const ax = local - 6, ay = y - (aqTop + 9);
                const hole = ay > 0 ? Math.abs(ax) < 4 : ax * ax + ay * ay < 16;
                if (hole && y > aqTop + 4) continue;
                set(x, y, y === aqTop ? rim : sil);
            }
        }

        // Torri con tetti a punta e guglie
        const towers = [[-34, 6, 22, 8], [-25, 8, 34, 10], [-15, 7, 26, 9], [-6, 12, 48, 14], [7, 9, 58, 16], [17, 7, 36, 10], [26, 6, 28, 8], [34, 8, 40, 10], [44, 5, 20, 6]];
        windows = [];
        towers.forEach(function (t, i) {
            const x0 = cx + t[0], w = t[1], h = t[2], roof = t[3];
            for (let y = base - h; y <= base; y++) {
                for (let x = x0; x < x0 + w; x++) set(x, y, x === x0 ? rim : sil);
            }
            // tetto a punta (alcune torri sono crollate e non ce l'hanno)
            if (i % 4 !== 2) {
                for (let r = 0; r < roof; r++) {
                    const half = Math.round((w / 2 + 1) * (r / roof));
                    for (let x = x0 + w / 2 - half; x <= x0 + w / 2 + half; x++) set(x, base - h - roof + r, x <= x0 + w / 2 - half + 0 ? rim : sil);
                }
                set(x0 + Math.floor(w / 2), base - h - roof - 1, rim);
                set(x0 + Math.floor(w / 2), base - h - roof - 2, rim);
            } else {
                for (let x = x0; x < x0 + w; x += 2) set(x, base - h - 1, sil);
            }
            // finestre
            for (let k = 0; k < Math.floor(h / 9); k++) {
                const wx = x0 + 1 + Math.floor(hash(i, k) * (w - 2)), wy = base - h + 4 + k * 8;
                if (hash(k, i) > 0.35) windows.push({ x: wx, y: wy, phase: hash(i * 3, k) * 6.28 });
            }
        });

        // Mura merlate tra le torri
        for (let x = cx - 36; x < cx + 50; x++) {
            for (let y = base - 12; y <= base + 2; y++) {
                if (y < base - 10 && (x >> 1) % 2) continue;
                set(x, y, y === base - 12 ? rim : sil);
            }
        }
        for (let i = 0; i < 6; i++) windows.push({ x: cx - 30 + i * 13, y: base - 6, phase: i });
    }

    // Pavimento di lastre di pietra con ciuffi d'erba tra le fughe
    function drawGround(set) {
        const pal = ["#1a1a26", "#22222f", "#2a2936", "#33303b"].map(rgb);
        const gap = rgb("#111019");
        const grass = [rgb("#1f3a2c"), rgb("#2b4d36")];
        const warm = rgb("#a8673a");
        let y = groundY, row = 0;
        while (y < H) {
            const rh = 3 + Math.min(5, Math.floor((y - groundY) / 9));
            let x = -Math.floor(hash(row, 1) * 12);
            let col = 0;
            while (x < W) {
                const sw = 9 + Math.floor(hash(row, col) * 10) + rh;
                const s = Math.floor(hash(col, row + 7) * 4);
                for (let yy = y; yy < y + rh && yy < H; yy++) {
                    for (let xx = x; xx < x + sw; xx++) {
                        const edge = yy === y + rh - 1 || xx === x;
                        let c = edge ? gap : pal[yy === y ? Math.min(3, s + 1) : s];
                        const k = warmth(xx, yy);
                        if (k > 0) c = mix(c, warm, k * k * (edge ? 0.3 : 0.7));
                        set(xx, yy, c);
                    }
                }
                // ciuffo d'erba nella fuga
                if (hash(col * 5, row) > 0.7) {
                    const g = grass[Math.floor(hash(col, row * 3) * 2)];
                    set(x, y + rh - 2, g); set(x + 1, y + rh - 3, g); set(x - 1, y + rh - 2, g);
                }
                x += sw; col++;
            }
            y += rh; row++;
        }
        // erba lungo il bordo del pavimento
        for (let x = 0; x < W; x++) {
            const h = Math.floor(hash(x, 41) * 3);
            for (let k = 1; k <= h; k++) set(x, groundY - k, grass[(x + k) % 2]);
        }
    }

    // Arco di pietra diroccato a sinistra, con l'edera
    function drawArch(set) {
        const shift = W < 240 ? -26 : 0;
        const left = 4 + shift, pw = 12, span = 34;
        const spring = groundY - Math.round(Math.min(78, H * 0.36));
        const cx = left + pw + span / 2;
        const ro = span / 2 + pw, ri = span / 2;
        stone(set, left - 2, spring - ro - 2, pw * 2 + span + 4, groundY - spring + ro + 4, function (x, y) {
            if (y >= spring) {
                const leftPillar = x >= left && x < left + pw;
                const rightPillar = x >= left + pw + span && x < left + pw * 2 + span && y > spring + 10 + Math.floor(hash(Math.floor(x / 3), 5) * 8);
                return leftPillar || rightPillar;
            }
            const dx = x - cx, dy = y - spring;
            const d = Math.sqrt(dx * dx + dy * dy);
            // l'arco è spezzato sul lato destro
            const broken = dx > 6 && dy > -ro * 0.75 + hash(x, 3) * 4;
            return d <= ro && d >= ri && !broken;
        }, 0);
        // edera che pende dall'arco
        const ivy = [rgb("#1e3a24"), rgb("#2c5230"), rgb("#3d6a38")];
        for (let i = 0; i < 9; i++) {
            const x = left + Math.floor(hash(i, 77) * (pw + span * 0.6));
            const len = 4 + Math.floor(hash(i, 78) * 14);
            for (let k = 0; k < len; k++) set(x + (k % 3 === 2 ? 1 : 0), spring - ro * 0.6 + k + hash(i, 79) * 6, ivy[(i + k) % 3]);
        }
    }

    // Muro crollato a destra, a gradini
    function drawRightWall(set) {
        const x0 = W - (W < 240 ? 30 : 64);
        stone(set, x0, groundY - 46, W - x0, 47, function (x, y) {
            const step = Math.floor((x - x0) / 12);
            const top = groundY - 14 - step * 8 - Math.floor(hash(Math.floor(x / 3), 2) * 4);
            return y >= top;
        }, 0.1);
    }

    // Colonna spezzata a cui si appoggia il cavaliere
    function drawPillar(set) {
        const right = knightX + 6, width = 14;
        const top = groundY - 52;
        stone(set, right - width, top - 4, width, groundY - top + 5, function (x, y) {
            return y >= top + Math.floor(hash(Math.floor(x / 2), 11) * 6);
        }, 0);
        // un blocco caduto ai suoi piedi
        stone(set, right - width - 10, groundY - 6, 10, 7, null, 0.05);
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

        // Le finestre del castello tremolano come torce lontane
        windows.forEach(function (w) {
            const f = Math.sin(t / 400 + w.phase) + Math.sin(t / 170 + w.phase * 2) * 0.5;
            px(w.x, w.y, f > 0.6 ? "#ffd27a" : f > -0.6 ? "#f28a2e" : "#9a4a1c");
            px(w.x, w.y + 1, "#7a3a18");
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
        const world = canvas.parentElement;
        const ui = world.querySelector(".world-ui");
        knightCanvas = knightCanvas || buildKnight();

        world.style.minHeight = "";
        let box = world.getBoundingClientRect();
        S = Math.max(2, Math.round(Math.min(box.width / 360, box.height / 225)));
        W = Math.ceil(box.width / S);
        H = Math.ceil(box.height / S);

        // Il cavaliere deve stare sempre sotto il menu: se lo schermo è
        // troppo basso la scena si allunga e il falò resta visibile scorrendo
        groundY = Math.round(H * (W < 240 ? 0.86 : 0.84));
        if (ui) {
            const uiBottom = (ui.getBoundingClientRect().bottom - box.top) / S;
            groundY = Math.max(groundY, Math.ceil(uiBottom + knightCanvas.height + 4));
        }
        if (groundY > H - 14) {
            world.style.minHeight = (groundY + 14) * S + "px";
            box = world.getBoundingClientRect();
            H = Math.ceil(box.height / S);
        }

        canvas.width = W;
        canvas.height = H;
        canvas.style.width = W * S + "px";
        canvas.style.height = H * S + "px";

        fireX = Math.round(W * (W < 240 ? 0.68 : 0.44));
        knightX = fireX - knightCanvas.width - 12;
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
