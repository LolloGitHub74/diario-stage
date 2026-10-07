// =========================================================
// Scena del falò, costruita a livelli: cielo, sole e nuvole
// che scorrono, paesaggio, protagonista e fuoco animati a
// fotogrammi come gli sprite dei videogiochi.
// =========================================================

(function () {
    "use strict";

    const world = document.querySelector(".world");
    const scene = document.getElementById("scene");
    if (!world || !scene) return;

    const ui = world.querySelector(".world-ui");
    const fire = scene.querySelector(".scene-fire");
    const hero = scene.querySelector(".scene-hero");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Misure della scena (le stesse unità usate nell'HTML per posizionare i livelli)
    const SCENE_W = 2340, SCENE_H = 1316;
    const RATIO = SCENE_W / SCENE_H;
    const FOCUS_X = 0.4;       // tra il fuoco e il protagonista
    const SAFE_TOP = 0.74;     // sopra questa altezza non ci sono né fuoco né protagonista

    // Fotogrammi: il fuoco gira in continuo, il protagonista alterna
    // sguardo e occhi chiusi con calma (numero del fotogramma, durata in ms)
    const FIRE_FRAMES = 6, FIRE_MS = 120;
    const HERO_FRAMES = 4;
    const HERO_SEQUENCE = [[0, 2600], [1, 1400], [2, 900], [1, 700], [0, 2000], [3, 1800]];


    // ---------- Posizione della scena ----------

    // La scena copre lo schermo; se lo schermo è basso si rimpicciolisce o si
    // allunga, così il fuoco e il protagonista restano sempre sotto il menu
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

        scene.style.width = width + "px";
        scene.style.height = height + "px";
        scene.style.left = left + "px";
        scene.style.top = (worldHeight - height) + "px";
    }


    // ---------- Fotogrammi ----------

    function showFrame(element, frame, total) {
        element.style.backgroundPositionX = (frame / (total - 1)) * 100 + "%";
    }

    let heroStep = 0, heroNext = 0, last = 0;

    function loop(time) {
        if (time - last >= FIRE_MS) {
            last = time;
            if (fire) showFrame(fire, Math.floor(time / FIRE_MS) % FIRE_FRAMES, FIRE_FRAMES);
        }
        if (hero && time >= heroNext) {
            const step = HERO_SEQUENCE[heroStep];
            showFrame(hero, step[0], HERO_FRAMES);
            heroNext = time + step[1];
            heroStep = (heroStep + 1) % HERO_SEQUENCE.length;
        }
        requestAnimationFrame(loop);
    }


    let resizeTimer = null;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layout, 150);
    });

    // Aspetta i caratteri, così l'altezza del menu è quella definitiva
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    layout();
    fontsReady.then(layout);
    if (!reduceMotion) requestAnimationFrame(loop);
})();
