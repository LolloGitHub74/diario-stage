// =========================================================
// Mondi del diario: ogni cartellino sopra un falò mostra lo
// stato della settimana (calcolato in stage.js). Il clic apre
// la scheda della settimana (trail.js, attributo data-level-open)
// =========================================================

(function () {
    "use strict";

    const stage = window.STAGE;
    if (!stage) return;

    const LABEL = { done: "Completata", current: "In corso", locked: "Bloccata" };

    document.querySelectorAll("[data-world-week]").forEach(function (stop) {
        const week = Number(stop.dataset.worldWeek);
        const state = stage.state(week);
        stop.dataset.state = state;
        stop.querySelector(".world-stop-state").textContent = LABEL[state];

        // Titolo della settimana, preso dal sentiero, per i lettori di schermo
        const title = document.querySelector('.trail-stop[data-week="' + week + '"] .stop-title');
        stop.setAttribute("aria-label", "Livello " + week + (title ? ": " + title.textContent : "") + " — " + LABEL[state]);
        if (title) stop.title = title.textContent;
    });
})();
