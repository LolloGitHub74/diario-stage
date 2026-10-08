// =========================================================
// Scena del falò: posiziona l'illustrazione in modo che il
// fuoco e il protagonista restino sempre visibili accanto
// al menu. Per ora non c'è nessuna animazione.
// =========================================================

(function () {
    "use strict";

    const world = document.querySelector(".world");
    const scene = document.getElementById("scene");
    if (!world || !scene) return;

    const ui = world.querySelector(".world-ui");
    const menu = world.querySelector(".game-menu");

    // Misure dell'illustrazione, in proporzione alla sua larghezza e altezza
    const RATIO = 3840 / 1920;
    const FIRE_RIGHT = 0.36;   // bordo destro del fuoco
    const FOCUS_X = 0.27;      // tra il fuoco e il protagonista
    const SAFE_TOP = 0.6;      // sopra questa altezza non ci sono né fuoco né protagonista
    const SPARE_BOTTOM = 0.08; // erba in basso che si può tagliare se serve spazio

    function place(width, height, left, top) {
        scene.style.width = width + "px";
        scene.style.height = height + "px";
        scene.style.left = left + "px";
        scene.style.top = top + "px";

        // Se sopra l'immagine resta del cielo libero, il bordo alto sfuma
        scene.classList.toggle("is-floating", top > 1);
    }

    // Schermi orizzontali: l'immagine copre tutto e scorre di lato quanto
    // basta perché il fuoco resti a sinistra del menu
    function landscape(box) {
        const height = Math.max(box.height, box.width / RATIO);
        const width = height * RATIO;
        const menuLeft = menu ? menu.getBoundingClientRect().left - box.left : box.width / 2;
        const wanted = menuLeft - FIRE_RIGHT * width - box.width * 0.012;
        const left = Math.min(0, Math.max(box.width - width, wanted));
        place(width, height, left, box.height - height);
    }

    // Schermi verticali: il menu occupa tutta la larghezza, quindi il fuoco
    // e il protagonista devono stare sotto; se serve la scena si allunga
    function portrait(box) {
        const uiBottom = ui ? ui.getBoundingClientRect().bottom - box.top + box.height * 0.015 : 0;

        let height = Math.max(box.height, box.width / RATIO);
        const limit = (box.height - uiBottom) / (1 - SAFE_TOP);
        if (height > limit) height = Math.max(limit, box.width / RATIO);

        let worldHeight = box.height;
        const drop = Math.min(SPARE_BOTTOM * height, Math.max(0, uiBottom - (worldHeight - (1 - SAFE_TOP) * height)));
        const needed = Math.ceil(uiBottom + (1 - SAFE_TOP - SPARE_BOTTOM) * height);
        if (needed > worldHeight + 1) {
            worldHeight = needed;
            world.style.minHeight = worldHeight + "px";
        }

        const width = height * RATIO;
        const left = Math.min(0, Math.max(box.width - width, box.width / 2 - FOCUS_X * width));
        place(width, height, left, worldHeight - height + drop);
    }

    function layout() {
        world.style.minHeight = "";
        const box = world.getBoundingClientRect();
        if (box.width > box.height) landscape(box);
        else portrait(box);
    }

    // Tornando alla home la scena si riposiziona subito
    window.addEventListener("screen:show", function (event) {
        if (event.detail === "home") layout();
    });

    let resizeTimer = null;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layout, 150);
    });

    // Aspetta i caratteri, così le misure del menu sono quelle definitive
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
