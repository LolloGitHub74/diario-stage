// =========================================================
// Schermate: la home e le tre sezioni del menu si vedono una
// alla volta. Per passare dall'una all'altra una tenda nera
// a pixel attraversa lo schermo: entra da un lato, copre
// tutto, cambia la schermata e se ne va dall'altro lato.
// =========================================================

(function () {
    "use strict";

    const body = document.body;
    const curtain = document.getElementById("curtain");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Quali sezioni formano ogni schermata
    const SCREENS = {
        home: ["home"],
        viaggio: ["viaggio"],
        livelli: ["livelli"],
        personaggio: ["personaggio", "titoli"]
    };

    // Indirizzi che portano a una schermata (anche i pannelli e i livelli)
    const ALIASES = {
        "": "home",
        titoli: "personaggio",
        attivita: "viaggio",
        skillalab: "viaggio",
        simulatore: "viaggio",
        strumenti: "viaggio"
    };

    const sections = {};
    Object.keys(SCREENS).forEach(function (name) {
        sections[name] = SCREENS[name]
            .map(function (id) { return document.getElementById(id); })
            .filter(Boolean);
    });

    let current = null;
    let busy = false;

    function screenFor(hash) {
        const id = hash.replace(/^#/, "");
        if (/^livello-\d{2}$/.test(id)) return "livelli";
        if (SCREENS[id]) return id;
        return ALIASES[id] || null;
    }

    function show(name) {
        Object.keys(sections).forEach(function (key) {
            sections[key].forEach(function (section) {
                section.hidden = key !== name;
            });
        });
        current = name;
        body.dataset.screen = name;
        window.scrollTo({ top: 0, behavior: "instant" });

        // Avvisa scena e sentiero: ora hanno le misure vere e possono ridisegnarsi
        window.dispatchEvent(new CustomEvent("screen:show", { detail: name }));
    }

    function focusScreen(name) {
        const target = name === "home"
            ? document.querySelector(".menu-item.is-selected") || document.querySelector(".menu-item")
            : document.querySelector(".back-menu");
        if (target) target.focus({ preventScroll: true });
    }

    // Tenda: "forward" va da sinistra a destra, "back" da destra a sinistra
    const OFF_LEFT = "translateX(calc(-100% - 64px))";
    const OFF_RIGHT = "translateX(calc(100% + 64px))";
    const COVER = "translateX(0)";
    const SLIDE = { duration: 300, easing: "steps(8, end)", fill: "forwards" };

    function wipe(from, to) {
        return curtain.animate([{ transform: from }, { transform: to }], SLIDE).finished;
    }

    function wait(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function go(name, direction) {
        if (busy || name === current) return Promise.resolve();

        if (reduceMotion || !curtain || !curtain.animate) {
            show(name);
            focusScreen(name);
            return Promise.resolve();
        }

        busy = true;
        const start = direction === "back" ? OFF_RIGHT : OFF_LEFT;
        const end = direction === "back" ? OFF_LEFT : OFF_RIGHT;

        curtain.classList.add("is-active");
        return wipe(start, COVER)
            .then(function () {
                show(name);
                return wait(80);
            })
            .then(function () {
                return wipe(COVER, end);
            })
            .then(function () {
                curtain.classList.remove("is-active");
                curtain.getAnimations().forEach(function (animation) { animation.cancel(); });
                busy = false;
                focusScreen(name);
            });
    }

    function directionTo(name) {
        return name === "home" ? "back" : "forward";
    }

    // Clic sui link che portano a una schermata (menu, "‹ Menu", "Torna al falò")
    document.addEventListener("click", function (event) {
        const link = event.target.closest('a[href^="#"]');
        if (!link || event.defaultPrevented) return;

        const hash = link.getAttribute("href");
        if (/^#livello-/.test(hash)) return;   // i livelli li apre trail.js

        const name = screenFor(hash);
        if (!name) return;

        event.preventDefault();
        if (name === current || busy) return;

        history.pushState({ screen: name }, "", name === "home" ? location.pathname + location.search : "#" + name);
        go(name, directionTo(name));
    });

    // Tasto "indietro" o "avanti" del browser
    window.addEventListener("popstate", function () {
        const name = screenFor(location.hash) || "home";
        if (name !== current) go(name, directionTo(name));
    });

    // ESC dentro una schermata riporta al menu (se non c'è un pannello aperto)
    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape" || current === "home" || busy) return;
        if (document.querySelector("dialog[open]")) return;
        history.pushState({ screen: "home" }, "", location.pathname + location.search);
        go("home", "back");
    });

    // All'apertura si mostra subito la schermata dell'indirizzo, senza tenda
    show(screenFor(location.hash) || "home");
})();
