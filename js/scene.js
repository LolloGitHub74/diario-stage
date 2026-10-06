// =========================================================
// Scena del falò: l'illustrazione fa da sfondo alla home e
// sopra, su una tela trasparente, si animano le scintille e
// il bagliore del fuoco.
// =========================================================

(function () {
    "use strict";

    const world = document.querySelector(".world");
    const art = document.getElementById("scene-art");
    const canvas = document.getElementById("scene");
    if (!world || !art || !canvas) return;

    const ctx = canvas.getContext("2d");
    const ui = world.querySelector(".world-ui");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Misure dell'illustrazione e punti importanti, in frazioni dell'immagine
    const IMAGE_W = 1661, IMAGE_H = 947;
    const RATIO = IMAGE_W / IMAGE_H;
    const FOCUS_X = 0.5;                  // a metà tra il fuoco e il cavaliere
    const SAFE_TOP = 0.36;                // sopra questa altezza non ci sono né fuoco né cavaliere
    const FIRE = { x: 0.352, y: 0.74 };  // base del fuoco
    const ART_PIXEL = 5;                  // un pixel dell'illustrazione = 5 pixel dell'immagine

    let W = 0, H = 0;
    let embers = [];

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

        // Se sopra l'immagine resta del cielo libero, il bordo alto sfuma
        art.classList.toggle("is-floating", top > 1);

        // La tela usa pixel grandi quanto quelli dell'illustrazione
        const pixel = (width / IMAGE_W) * ART_PIXEL;
        W = Math.max(1, Math.round(width / pixel));
        H = Math.max(1, Math.round(height / pixel));
        canvas.width = W;
        canvas.height = H;
        embers = [];
        draw(0);
    }

    // ---------- Animazione ----------

    function stepEmbers() {
        const fx = FIRE.x * W, fy = FIRE.y * H;
        if (Math.random() < 0.7) {
            embers.push({
                x: fx + (Math.random() - 0.5) * W * 0.05,
                y: fy - H * (0.08 + Math.random() * 0.16),
                vx: (Math.random() - 0.5) * 0.25,
                vy: -0.35 - Math.random() * 0.5,
                life: 0,
                max: 20 + Math.random() * 35
            });
        }
        embers = embers.filter(function (e) {
            e.life++;
            e.x += e.vx + Math.sin(e.life / 3) * 0.2;
            e.y += e.vy;
            return e.life < e.max && e.y > 0;
        });
    }

    function draw(t) {
        ctx.clearRect(0, 0, W, H);

        // Bagliore caldo che respira attorno al fuoco
        const fx = FIRE.x * W, fy = FIRE.y * H - H * 0.08;
        const flicker = 0.75 + Math.sin(t / 140) * 0.1 + Math.random() * 0.15;
        const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, W * 0.2);
        glow.addColorStop(0, "rgba(255, 150, 60, " + 0.16 * flicker + ")");
        glow.addColorStop(0.5, "rgba(255, 110, 40, " + 0.06 * flicker + ")");
        glow.addColorStop(1, "rgba(255, 90, 30, 0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";

        // Scintille: gialle appena nate, poi arancioni e rosse mentre si spengono
        embers.forEach(function (e) {
            const k = e.life / e.max;
            ctx.fillStyle = k < 0.3 ? "#fff0a0" : k < 0.65 ? "#ffb02e" : "#d8400e";
            ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
        });
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
        layout();
        if (!reduceMotion) requestAnimationFrame(loop);
    }

    // Aspetta che l'immagine e i caratteri siano pronti per misurare bene
    const ready = [];
    if (!art.complete) ready.push(new Promise(function (resolve) { art.addEventListener("load", resolve, { once: true }); art.addEventListener("error", resolve, { once: true }); }));
    if (document.fonts && document.fonts.ready) ready.push(document.fonts.ready);
    Promise.all(ready).then(start);
})();
