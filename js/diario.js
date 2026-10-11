// =========================================================
// Diario: quattro mondi a tutto schermo, uno per mese.
// Sopra ogni falò un cartellino apre la scheda della
// settimana; le frecce passano da un mondo all'altro con la
// tenda nera. I mondi ancora da disegnare sono "in lavorazione".
// =========================================================

(function () {
    "use strict";

    const stage = window.STAGE;
    const section = document.getElementById("livelli");
    const dialog = document.getElementById("level-screen");
    if (!stage || !section) return;

    const root = document.documentElement;
    const pages = Array.from(section.querySelectorAll(".world-page"));
    const weeks = Array.from(section.querySelectorAll(".week-data li"));
    const dots = Array.from(section.querySelectorAll(".world-dots i"));

    const STATE_LABEL = { done: "FALÒ ACCESO", current: "SEI QUI", locked: "BLOCCATO" };
    const STOP_LABEL = { done: "Completata", current: "In corso", locked: "Bloccata" };


    // ---------- Stato di ogni settimana ----------

    weeks.forEach(function (item) {
        item.dataset.state = stage.state(Number(item.dataset.week));
    });

    section.querySelectorAll("[data-world-week]").forEach(function (stop) {
        const week = Number(stop.dataset.worldWeek);
        const state = stage.state(week);
        const title = weeks[week - 1] ? weeks[week - 1].querySelector(".stop-title").textContent : "";
        stop.dataset.state = state;
        stop.querySelector(".world-stop-state").textContent = STOP_LABEL[state];
        stop.setAttribute("aria-label", "Livello " + week + ": " + title + " — " + STOP_LABEL[state]);
        stop.title = title;
    });


    // ---------- Mondi ----------

    let world = 1;

    function showWorld(n) {
        world = n;
        pages.forEach(function (page) {
            page.hidden = Number(page.dataset.world) !== n;
        });
        const page = pages[n - 1];
        section.querySelector("[data-world-label]").textContent = "MONDO " + n;
        section.querySelector("[data-world-name]").textContent = page.dataset.name;
        section.querySelector("[data-world-month]").textContent = page.dataset.month;
        dots.forEach(function (dot, i) { dot.classList.toggle("is-on", i === n - 1); });
        section.querySelector(".world-prev").disabled = n === 1;
        section.querySelector(".world-next").disabled = n === pages.length;
        page.scrollLeft = 0;
    }

    function goWorld(n) {
        if (n < 1 || n > pages.length || n === world) return;
        const swap = function () { showWorld(n); };
        if (window.curtainSwap) window.curtainSwap(swap, n > world ? "forward" : "back");
        else swap();
    }

    section.querySelectorAll("[data-world-step]").forEach(function (button) {
        button.addEventListener("click", function () {
            goWorld(world + Number(button.dataset.worldStep));
        });
    });

    // Frecce della tastiera: cambiano mondo quando sei nel diario
    document.addEventListener("keydown", function (event) {
        if (document.body.dataset.screen !== "livelli" || (dialog && dialog.open)) return;
        if (event.key === "ArrowRight") goWorld(world + 1);
        if (event.key === "ArrowLeft") goWorld(world - 1);
    });

    // Sugli schermi stretti la mappa è più larga dello schermo:
    // la rotella del mouse la fa scorrere di lato
    pages.forEach(function (page) {
        page.addEventListener("wheel", function (event) {
            if (page.scrollWidth <= page.clientWidth) return;
            if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
            event.preventDefault();
            page.scrollLeft += event.deltaY;
        }, { passive: false });
    });

    showWorld(1);


    // ---------- Schermata del livello ----------

    if (!dialog) return;

    const kicker = dialog.querySelector(".level-kicker");
    const title = dialog.querySelector("#level-title");
    const date = dialog.querySelector(".level-date");
    const body = dialog.querySelector(".level-body");
    const stepButtons = dialog.querySelectorAll("[data-level-step]");
    let current = 0;
    let pushed = false;

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function fill(week) {
        const item = weeks[week - 1];
        const template = document.getElementById("livello-" + pad(week));
        if (!item || !template) return false;

        current = week;
        const state = item.dataset.state;
        kicker.textContent = "LIVELLO " + pad(week) + " · " + STATE_LABEL[state];
        kicker.dataset.state = state;
        title.textContent = item.querySelector(".stop-title").textContent;
        date.textContent = item.querySelector(".stop-date").textContent;

        body.innerHTML = "";
        if (state === "locked") {
            const note = document.createElement("p");
            note.className = "level-locked";
            note.textContent = "Questo falò è ancora spento: il livello si sblocca durante la settimana.";
            body.appendChild(note);
        }
        body.appendChild(template.content.cloneNode(true));

        stepButtons.forEach(function (button) {
            const target = week + Number(button.dataset.levelStep);
            button.disabled = target < 1 || target > weeks.length;
        });
        dialog.querySelector(".panel-inner").scrollTop = 0;
        return true;
    }

    function open(week, fromHistory) {
        if (!fill(week)) return;
        // Il mondo dietro la scheda è quello della settimana
        const target = Math.ceil(week / 4);
        if (target !== world) showWorld(target);
        document.querySelectorAll("dialog[open]").forEach(function (other) {
            if (other !== dialog) other.close();
        });
        if (!dialog.open) {
            dialog.showModal();
            root.classList.add("panel-open");
        }
        if (!fromHistory) {
            history.pushState({ level: week }, "", "#livello-" + pad(week));
            pushed = true;
        }
    }

    function weekFromHash() {
        const match = /^#livello-(\d{2})$/.exec(location.hash);
        return match ? Number(match[1]) : 0;
    }

    document.querySelectorAll("[data-level-open]").forEach(function (button) {
        button.addEventListener("click", function () {
            open(Number(button.dataset.levelOpen), false);
        });
    });

    // I link "Settimana 02" nei pannelli del progetto aprono il livello
    document.querySelectorAll('a[href^="#livello-"]').forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            open(Number(link.getAttribute("href").slice(9)), false);
        });
    });

    stepButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const week = current + Number(button.dataset.levelStep);
            if (fill(week)) history.replaceState({ level: week }, "", "#livello-" + pad(week));
        });
    });

    dialog.querySelector("[data-level-close]").addEventListener("click", function () {
        dialog.close();
    });

    dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
    });

    // Alla chiusura (X, clic fuori o Esc) l'indirizzo torna al diario
    dialog.addEventListener("close", function () {
        root.classList.remove("panel-open");
        if (weekFromHash()) {
            if (pushed) {
                pushed = false;
                history.back();
            } else {
                history.replaceState(null, "", "#livelli");
            }
        }
    });

    // Il tasto "indietro" del browser chiude la schermata
    window.addEventListener("popstate", function () {
        pushed = false;
        const week = weekFromHash();
        if (week) open(week, true);
        else if (dialog.open) dialog.close();
    });

    // Un link come diario-stage/#livello-03 apre subito quel livello
    const initial = weekFromHash();
    if (initial) open(initial, true);
})();
