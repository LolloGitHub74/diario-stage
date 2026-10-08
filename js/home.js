// =========================================================
// Home: schermata START, barra del livello e menu di gioco
// =========================================================

(function () {
    "use strict";

    const body = document.body;
    const root = document.documentElement;
    const startScreen = document.getElementById("start-screen");
    const startButton = document.getElementById("start-button");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


    // ---------- Schermata START ----------

    function remember() {
        try { sessionStorage.setItem("diario-started", "1"); } catch (error) { /* memoria non disponibile */ }
    }

    function enterWorld() {
        remember();
        root.classList.remove("show-start");
        body.classList.add("started");

        const first = document.querySelector(".menu-item");
        if (first) first.focus({ preventScroll: true });
    }

    if (startScreen && startButton && root.classList.contains("show-start")) {
        startButton.focus();

        startButton.addEventListener("click", function () {
            if (startScreen.classList.contains("is-leaving")) return;

            startButton.classList.add("is-pressed");
            startScreen.classList.add("is-leaving");
            setTimeout(enterWorld, reduceMotion ? 0 : 650);
        });

        // Anche INVIO o la barra spaziatrice premono START
        document.addEventListener("keydown", function (event) {
            if (!root.classList.contains("show-start")) return;
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                startButton.click();
            }
        });
    } else {
        body.classList.add("started");
    }


    // ---------- Livello ed esperienza (calcolati in stage.js) ----------

    const stage = window.STAGE;

    document.querySelectorAll("[data-level]").forEach(function (element) {
        element.textContent = stage.levelLabel;
    });

    // Numeri della barra e della scheda del personaggio
    const stats = {
        xp: stage.completed,
        fires: stage.completed,
        "days-done": stage.daysDone,
        "days-left": stage.daysLeft,
        "days-total": stage.daysTotal
    };
    Object.keys(stats).forEach(function (key) {
        document.querySelectorAll("[data-" + key + "]").forEach(function (element) {
            element.textContent = stats[key];
        });
    });

    // Un blocco della barra per ogni settimana
    document.querySelectorAll(".hud-bar").forEach(function (bar) {
        bar.innerHTML = "";
        for (let week = 1; week <= stage.totalWeeks; week++) {
            const block = document.createElement("i");
            const state = stage.state(week);
            if (state === "done") block.className = "is-done";
            if (state === "current") block.className = "is-now";
            bar.appendChild(block);
        }
        bar.setAttribute("aria-valuenow", stage.completed);
    });


    // ---------- Menu di gioco ----------

    const items = Array.from(document.querySelectorAll(".menu-item"));

    function select(item) {
        items.forEach(function (other) {
            other.classList.toggle("is-selected", other === item);
        });
    }

    items.forEach(function (item) {
        item.addEventListener("mouseenter", function () { select(item); });
        item.addEventListener("focus", function () { select(item); });
    });

    // Frecce per passare da un pulsante all'altro, come in un vero menu
    const forward = ["ArrowDown", "ArrowRight"];
    const back = ["ArrowUp", "ArrowLeft"];

    document.addEventListener("keydown", function (event) {
        if (root.classList.contains("show-start") || items.length === 0) return;
        if (forward.indexOf(event.key) === -1 && back.indexOf(event.key) === -1) return;

        // Più in basso nella pagina le frecce tornano a far scorrere
        const inMenu = items.indexOf(document.activeElement) !== -1;
        if (!inMenu && window.scrollY > 40) return;

        const current = items.findIndex(function (item) { return item.classList.contains("is-selected"); });
        const next = forward.indexOf(event.key) !== -1
            ? (current + 1) % items.length
            : (current - 1 + items.length) % items.length;

        event.preventDefault();
        items[next].focus();
    });
})();


// ---------------------------------------------------
// Menu in alto: evidenzia la sezione in cui ti trovi
// ---------------------------------------------------

(function () {
    "use strict";

    const links = Array.from(document.querySelectorAll('.navigation a[href^="#"]'));
    if (links.length === 0 || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            links.forEach(function (link) {
                link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
            });
        });
    }, { rootMargin: "-45% 0px -50% 0px" });

    links.forEach(function (link) {
        const section = document.querySelector(link.getAttribute("href"));
        if (section) observer.observe(section);
    });
})();


// ---------------------------------------------------
// Sotto la scena del falò il menu resta fisso in alto
// ---------------------------------------------------

(function () {
    "use strict";

    const world = document.querySelector(".world");
    if (!world) return;

    function check() {
        const floating = world.getBoundingClientRect().bottom < 80;
        document.body.classList.toggle("nav-floating", floating);
    }

    window.addEventListener("scroll", check, { passive: true });
    check();
})();
