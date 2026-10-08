// =========================================================
// Falò della home: fiamme vive disegnate in codice con il
// "fuoco alla Doom", lo stesso dei falò del diario. Sotto c'è
// il falò con le fiamme disegnate tolte, sopra la spada.
// =========================================================

(function () {
    "use strict";

    const canvas = document.querySelector(".campfire");
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Griglia del fuoco: celle grandi circa come i "pixel" del disegno
    const W = 30;
    const H = 28;
    const MAX = 36;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(W, H);
    const heat = new Uint8Array(W * H);

    // Colori presi dalle fiamme del disegno: dal rosso scuro dei bordi
    // al giallo chiarissimo del cuore
    const STOPS = [
        [0, [0, 0, 0, 0]],
        [8, [168, 26, 14, 255]],
        [12, [224, 52, 26, 255]],
        [18, [247, 101, 28, 255]],
        [24, [255, 154, 42, 255]],
        [29, [255, 207, 69, 255]],
        [33, [255, 243, 184, 255]]
    ];
    const palette = [];
    for (let h = 0; h <= MAX; h++) {
        let color = STOPS[0][1];
        STOPS.forEach(function (stop) { if (h >= stop[0]) color = stop[1]; });
        palette.push(color);
    }

    const center = (W - 1) / 2;

    // La base del fuoco: piena al centro, più debole verso i bordi,
    // e ogni fotogramma cambia un po' così le fiamme non si ripetono
    function feed() {
        for (let x = 0; x < W; x++) {
            const d = Math.abs(x - center) / center;
            let value = 0;
            if (d < 0.62) value = MAX - Math.floor(d * 10) - (Math.random() < 0.25 ? 4 : 0);
            heat[(H - 1) * W + x] = Math.max(0, value);
        }
    }

    function step() {
        feed();
        for (let y = 0; y < H - 1; y++) {
            for (let x = 0; x < W; x++) {
                const below = heat[(y + 1) * W + x];
                const d = Math.abs(x - center) / center;
                // Si raffredda salendo, di più verso i lati: la fiamma si stringe in punta
                let decay = Math.random() < 0.62 ? 1 : (Math.random() < 0.5 ? 2 : 0);
                if (Math.random() < d * d * 1.8) decay += 1;
                const drift = Math.floor(Math.random() * 3) - 1;
                const target = Math.min(W - 1, Math.max(0, x + drift));
                heat[y * W + target] = Math.max(0, below - decay);
            }
        }
    }

    function draw() {
        const data = image.data;
        for (let i = 0; i < W * H; i++) {
            const c = palette[heat[i]];
            data[i * 4] = c[0];
            data[i * 4 + 1] = c[1];
            data[i * 4 + 2] = c[2];
            data[i * 4 + 3] = c[3];
        }
        ctx.putImageData(image, 0, 0);
    }

    // Prepara un fuoco già acceso prima di mostrarlo
    for (let i = 0; i < H * 2; i++) step();
    draw();
    if (reduceMotion) return;

    // Circa 12 fotogrammi al secondo, solo quando la home è sullo schermo
    let last = 0;
    function loop(time) {
        const onHome = !document.body.dataset.screen || document.body.dataset.screen === "home";
        if (onHome && !document.hidden && time - last > 83) {
            last = time;
            step();
            draw();
        }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
})();
