// =========================================================
// La forgia (il progetto): la prima volta che entri le quattro
// zone si accendono una dopo l'altra, così si capisce dove cliccare
// =========================================================

(function () {
    "use strict";

    const section = document.getElementById("viaggio");
    if (!section) return;

    const spots = Array.from(section.querySelectorAll(".forge-spot"));
    let shown = false;

    window.addEventListener("screen:show", function (event) {
        if (event.detail !== "viaggio" || shown) return;
        shown = true;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        spots.forEach(function (spot, i) {
            setTimeout(function () {
                spot.classList.add("is-intro");
                setTimeout(function () { spot.classList.remove("is-intro"); }, 700);
            }, 600 + i * 450);
        });
    });
})();
