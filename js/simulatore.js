// =========================================================
// Missione principale: le cinque tappe della forgia.
// Un clic su una spada ne mostra il dettaglio nella pergamena
// =========================================================

(function () {
    "use strict";

    const win = document.getElementById("panel-simulatore");
    if (!win) return;

    const stages = Array.from(win.querySelectorAll(".sim-stage"));
    const details = Array.from(win.querySelectorAll(".sim-detail"));

    function select(index) {
        stages.forEach(function (stage, i) {
            const on = i === index;
            stage.classList.toggle("is-selected", on);
            stage.setAttribute("aria-selected", on ? "true" : "false");
        });
        details.forEach(function (detail) {
            detail.hidden = Number(detail.dataset.stage) !== index;
        });
    }

    stages.forEach(function (stage, i) {
        stage.addEventListener("click", function () { select(i); });
    });

    // Ogni volta che la finestra si apre parte dalla tappa in corso
    const start = Math.max(0, stages.findIndex(function (stage) { return stage.dataset.state === "current"; }));
    new MutationObserver(function () {
        if (win.open) select(start);
    }).observe(win, { attributes: true, attributeFilter: ["open"] });

    select(start);
})();
