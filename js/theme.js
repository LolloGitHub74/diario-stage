// =========================================================
// Giorno e notte nella home. Il pulsante ☀/🌙 (o il cambio di
// modalità del dispositivo) avvia il tramonto o l'alba:
//  tramonto: luce arancione → arriva la notte → si accende il
//            fuoco → si accendono le stelle e le lucciole
//  alba:     il fuoco si spegne con un filo di fumo → spariscono
//            stelle e lucciole → luce rosa → torna il giorno
// =========================================================

(function () {
    "use strict";

    const root = document.documentElement;
    const button = document.getElementById("theme-toggle");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const deviceLight = window.matchMedia("(prefers-color-scheme: light)");
    let busy = false;
    let timers = [];

    function later(fn, ms) {
        timers.push(setTimeout(fn, ms));
    }

    function label() {
        if (!button) return;
        button.setAttribute("aria-label", root.dataset.theme === "day" ? "Passa alla notte" : "Passa al giorno");
    }

    // Si assicura che l'immagine dell'altra scena sia pronta prima di animare
    function ready(theme) {
        const img = document.querySelector(theme === "day" ? ".scene-day" : ".scene-night");
        if (!img) return Promise.resolve();
        if (!img.getAttribute("src")) img.src = img.dataset.src;
        if (img.complete && img.naturalWidth) return Promise.resolve();
        return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    }

    function setTheme(theme, animate) {
        if (theme === root.dataset.theme || busy) return;

        if (!animate || reduceMotion) {
            root.dataset.theme = theme;
            label();
            return;
        }

        busy = true;
        timers.forEach(clearTimeout);
        timers = [];

        ready(theme).then(function () {
            root.classList.add("theme-anim");

            if (theme === "night") {
                // Tramonto
                root.classList.add("is-dusk");
                later(function () {
                    root.dataset.theme = "night";
                    label();
                }, 600);
                later(function () { root.classList.remove("is-dusk"); }, 1300);
            } else {
                // Alba: prima il fuoco si spegne, poi arriva la luce
                root.classList.add("is-smoke");
                root.dataset.theme = "day";
                label();
                later(function () { root.classList.add("is-dawn"); }, 300);
                later(function () { root.classList.remove("is-dawn"); }, 1500);
                later(function () { root.classList.remove("is-smoke"); }, 1900);
            }

            later(function () {
                root.classList.remove("theme-anim");
                busy = false;
            }, 2300);
        });
    }

    if (button) {
        label();
        button.addEventListener("click", function () {
            const next = root.dataset.theme === "day" ? "night" : "day";
            try { localStorage.setItem("diario-tema", next); } catch (error) { /* memoria non disponibile */ }
            setTheme(next, true);
        });
    }

    // Se cambia la modalità del dispositivo e non hai scelto a mano, la segue
    deviceLight.addEventListener("change", function () {
        let saved = null;
        try { saved = localStorage.getItem("diario-tema"); } catch (error) { /* niente */ }
        if (saved) return;
        setTheme(deviceLight.matches ? "day" : "night", true);
    });
})();
