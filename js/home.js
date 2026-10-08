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
        if (body.dataset.screen && body.dataset.screen !== "home") return;
        if (forward.indexOf(event.key) === -1 && back.indexOf(event.key) === -1) return;

        const current = items.findIndex(function (item) { return item.classList.contains("is-selected"); });
        const next = forward.indexOf(event.key) !== -1
            ? (current + 1) % items.length
            : (current - 1 + items.length) % items.length;

        event.preventDefault();
        items[next].focus();
    });
})();


// ---------------------------------------------------
// Titolo della home: ogni lettera salta e riscende,
// una dopo l'altra, come un'onda
// ---------------------------------------------------

(function () {
    "use strict";

    const title = document.querySelector(".world-title");
    if (!title) return;

    // Il testo intero resta leggibile per i lettori di schermo
    title.setAttribute("aria-label", title.textContent.trim());

    let index = 0;

    function wrap(node) {
        Array.from(node.childNodes).forEach(function (child) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                wrap(child);
                return;
            }
            if (child.nodeType !== Node.TEXT_NODE) return;

            const fragment = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach(function (part) {
                if (!part) return;
                if (/^\s+$/.test(part)) {
                    fragment.appendChild(document.createTextNode(part));
                    return;
                }
                // Ogni parola resta intera quando va a capo
                const word = document.createElement("span");
                word.className = "title-word";
                word.setAttribute("aria-hidden", "true");
                Array.from(part).forEach(function (letter) {
                    const span = document.createElement("span");
                    span.className = "title-letter";
                    span.textContent = letter;
                    span.style.setProperty("--i", index++);
                    word.appendChild(span);
                });
                fragment.appendChild(word);
            });
            child.replaceWith(fragment);
        });
    }

    wrap(title);
})();
