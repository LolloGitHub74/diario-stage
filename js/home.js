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


    // ---------- Livello ed esperienza ----------

    // Ogni settimana è completata dal sabato successivo al suo lunedì
    const stageStart = new Date(2026, 8, 7);
    const totalWeeks = 16;
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();

    let completed = 0;
    for (let week = 1; week <= totalWeeks; week++) {
        const saturday = new Date(stageStart.getTime() + ((week - 1) * 7 + 5) * dayMs);
        if (today >= saturday) completed = week;
    }

    const started = today >= stageStart;
    const finished = completed === totalWeeks;
    const level = Math.max(1, Math.min(completed + 1, totalWeeks));

    document.querySelectorAll("[data-level]").forEach(function (element) {
        element.textContent = finished ? "MAX" : String(level).padStart(2, "0");
    });

    document.querySelectorAll("[data-xp], [data-fires]").forEach(function (element) {
        element.textContent = completed;
    });

    // Un blocco della barra per ogni settimana
    const bar = document.querySelector(".hud-bar");
    if (bar) {
        bar.innerHTML = "";
        for (let week = 1; week <= totalWeeks; week++) {
            const block = document.createElement("i");
            if (week <= completed) block.className = "is-done";
            else if (week === completed + 1 && started) block.className = "is-now";
            bar.appendChild(block);
        }
        bar.setAttribute("aria-valuenow", completed);
    }

    // Stato di ogni livello: completato, in corso o bloccato
    document.querySelectorAll(".week-card[data-week]").forEach(function (card) {
        const week = Number(card.dataset.week);
        const state = card.querySelector(".week-state");
        const monday = new Date(stageStart.getTime() + (week - 1) * 7 * dayMs);

        if (week <= completed) {
            card.classList.add("is-done");
            if (state) state.textContent = "FALÒ ACCESO";
        } else if (week === completed + 1 && today >= monday) {
            card.classList.add("is-current");
            if (state) state.textContent = "IN CORSO";
        } else {
            card.classList.add("is-locked");
            if (state) state.textContent = "BLOCCATO";
        }
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

    // Frecce su e giù per spostare la fiammella, come in un vero menu
    document.addEventListener("keydown", function (event) {
        if (root.classList.contains("show-start") || items.length === 0) return;
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

        // Più in basso nella pagina le frecce tornano a far scorrere
        const inMenu = items.indexOf(document.activeElement) !== -1;
        if (!inMenu && window.scrollY > 40) return;

        const current = items.findIndex(function (item) { return item.classList.contains("is-selected"); });
        const next = event.key === "ArrowDown"
            ? (current + 1) % items.length
            : (current - 1 + items.length) % items.length;

        event.preventDefault();
        items[next].focus();
    });
})();
