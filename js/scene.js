// =========================================================
// Scena del falò: posiziona l'illustrazione in modo che il
// fuoco e il protagonista restino sempre sotto il menu.
// Per ora non c'è nessuna animazione.
// =========================================================

(function () {
    "use strict";

    const world = document.querySelector(".world");
    const scene = document.getElementById("scene");
    if (!world || !scene) return;

    const ui = world.querySelector(".world-ui");

    // Misure dell'illustrazione
    const RATIO = 3840 / 1920;
    const FOCUS_X = 0.27;      // tra il fuoco e il protagonista
    const SAFE_TOP = 0.6;      // sopra questa altezza non ci sono né fuoco né protagonista
    const SPARE_BOTTOM = 0.08; // erba in basso che si può tagliare se serve spazio

    // L'immagine copre la scena; se lo schermo è basso si rimpicciolisce o la
    // scena si allunga, così il fuoco e il protagonista restano sotto il menu
    function layout() {
        world.style.minHeight = "";
        const box = world.getBoundingClientRect();
        const uiBottom = ui ? ui.getBoundingClientRect().bottom - box.top + box.height * 0.015 : 0;

        let height = Math.max(box.height, box.width / RATIO);
        const limit = (box.height - uiBottom) / (1 - SAFE_TOP);
        if (height > limit) height = Math.max(limit, box.width / RATIO);

        // Se il fuoco finirebbe sotto il menu, l'immagine scende un po'
        // tagliando l'erba in basso; solo se non basta la scena si allunga
        let worldHeight = box.height;
        const drop = Math.min(SPARE_BOTTOM * height, Math.max(0, uiBottom - (worldHeight - (1 - SAFE_TOP) * height)));
        const needed = Math.ceil(uiBottom + (1 - SAFE_TOP - SPARE_BOTTOM) * height);
        if (needed > worldHeight + 1) {
            worldHeight = needed;
            world.style.minHeight = worldHeight + "px";
        }

        const width = height * RATIO;
        const left = Math.min(0, Math.max(box.width - width, box.width / 2 - FOCUS_X * width));
        const top = worldHeight - height + drop;

        scene.style.width = width + "px";
        scene.style.height = height + "px";
        scene.style.left = left + "px";
        scene.style.top = top + "px";

        // Se sopra l'immagine resta del cielo libero, il bordo alto sfuma
        scene.classList.toggle("is-floating", top > 1);
    }

    let resizeTimer = null;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layout, 150);
    });

    // Aspetta i caratteri, così l'altezza del menu è quella definitiva
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
