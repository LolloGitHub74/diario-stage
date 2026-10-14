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
        stop.querySelector(".state-icon").dataset.state = state;
        stop.setAttribute("aria-label", "Livello " + week + ": " + title + " — " + STOP_LABEL[state]);
        stop.title = title;
    });


    // ---------- Mondi ----------

    let world = 1;
    let knight = null;

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
        if (knight && document.body.dataset.screen === "livelli") knight.enter();
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


    // ---------- Il cavaliere ----------

    knight = makeKnight();

    // Entrando nel diario (o tornando al mondo 1) il cavaliere arriva da sinistra
    window.addEventListener("screen:show", function (event) {
        if (event.detail === "livelli" && !(dialog && dialog.open)) knight.enter();
    });

    function makeKnight() {
        const el = section.querySelector(".knight-walker");
        const noop = { enter: function () {}, walkTo: function () { return Promise.resolve(); }, placeAt: function () {} };
        if (!el) return noop;

        const page = el.closest(".world-page");
        const pageWorld = Number(page.dataset.world);
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // Il sentiero disegnato sulla mappa, come una linea di punti (in %)
        const path = (page.dataset.path || "").trim().split(/\s+/).map(function (pair) {
            const xy = pair.split(",").map(Number);
            return { x: xy[0], y: xy[1] };
        });
        // Lunghezza progressiva lungo il sentiero (la x conta il doppio: la mappa è 2:1)
        const along = [0];
        for (let i = 1; i < path.length; i++) {
            along.push(along[i - 1] + Math.hypot(path[i].x - path[i - 1].x, (path[i].y - path[i - 1].y) / 2));
        }

        // Punto del sentiero a una certa distanza dall'inizio
        function pointAt(s) {
            if (s <= 0) return path[0];
            for (let i = 1; i < path.length; i++) {
                if (s <= along[i]) {
                    const t = (s - along[i - 1]) / (along[i] - along[i - 1] || 1);
                    return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * t, y: path[i - 1].y + (path[i].y - path[i - 1].y) * t };
                }
            }
            return path[path.length - 1];
        }

        // Distanza lungo il sentiero del punto più vicino a una certa x
        function distanceAtX(x) {
            for (let i = 1; i < path.length; i++) {
                if (x <= path[i].x) {
                    const t = (x - path[i - 1].x) / (path[i].x - path[i - 1].x || 1);
                    return along[i - 1] + (along[i] - along[i - 1]) * Math.max(0, Math.min(1, t));
                }
            }
            return along[along.length - 1];
        }

        // Dove si ferma per ogni settimana: sul sentiero, appena prima del falò
        const spots = {};
        page.querySelectorAll(".world-stop").forEach(function (stop) {
            spots[Number(stop.dataset.worldWeek)] = distanceAtX(Number(stop.dataset.standX));
        });
        const weeksHere = Object.keys(spots).map(Number).sort(function (a, b) { return a - b; });
        const START = -3;      // appena fuori dal bordo sinistro

        let s = START;
        let at = 0;            // settimana a cui è fermo (0 = nessuna)
        let walk = null;       // camminata in corso
        let timer = null;

        function draw() {
            const p = s < 0 ? { x: path[0].x + s, y: path[0].y } : pointAt(s);
            el.style.left = p.x + "%";
            el.style.top = p.y + "%";
            current = p;
        }
        let current = path[0];

        // Riposa al falò della settimana in corso; se il mondo è finito, all'ultimo
        function restWeek() {
            const now = weeksHere.find(function (w) { return stage.state(w) === "current"; });
            if (now) return now;
            const done = weeksHere.filter(function (w) { return stage.state(w) === "done"; });
            return done.length ? done[done.length - 1] : weeksHere[0];
        }

        // Tiene il cavaliere al centro quando la mappa è più larga dello schermo
        function follow() {
            if (page.scrollWidth <= page.clientWidth) return;
            const x = el.parentElement.clientWidth * current.x / 100;
            page.scrollLeft = x - page.clientWidth / 2;
        }

        function finish() {
            if (!walk) return;
            const done = walk;
            walk = null;
            s = done.to;
            draw();
            follow();
            el.classList.remove("is-walking", "is-left");
            done.resolve();
        }

        // Mentre cammina guarda sempre di lato, verso dove va
        function face(sign) {
            el.classList.toggle("is-left", sign < 0);
        }

        // Cammina lungo il sentiero fino alla distanza "to"; speed in % al secondo
        function moveTo(to, speed, maxMs) {
            finish();
            const from = s;
            const distance = Math.abs(to - from);
            if (reduceMotion || distance < 0.3) {
                s = to;
                draw();
                follow();
                return Promise.resolve();
            }
            const duration = Math.min(maxMs, Math.max(250, distance / speed * 1000));
            el.classList.add("is-walking");
            el.classList.toggle("is-left", to < from);

            return new Promise(function (resolve) {
                const start = performance.now();
                walk = { to: to, resolve: resolve };
                function step(now) {
                    if (!walk || walk.to !== to) return;
                    const t = Math.min(1, (now - start) / duration);
                    s = from + (to - from) * t;
                    face(to > from ? 1 : -1);
                    draw();
                    follow();
                    if (t < 1) requestAnimationFrame(step);
                    else finish();
                }
                requestAnimationFrame(step);
            });
        }

        function enter() {
            if (world !== pageWorld || page.hidden) return;
            clearTimeout(timer);
            finish();
            const target = restWeek();
            el.classList.remove("is-resting");
            s = START;
            at = 0;
            draw();
            page.scrollLeft = 0;
            // Aspetta che la tenda si sia aperta, poi entra camminando
            timer = setTimeout(function () {
                moveTo(spots[target], 34, 2600).then(function () {
                    at = target;
                    // Arrivato al falò si gira di fronte, come quando scegli un livello
                    el.classList.add("is-resting");
                });
            }, reduceMotion ? 0 : 380);
        }

        function walkTo(week) {
            if (!spots[week]) return Promise.resolve();
            // Se stava già camminando verso questo falò, un secondo clic apre subito
            if (walk && walk.to === spots[week]) {
                finish();
                return Promise.resolve();
            }
            clearTimeout(timer);
            if (at === week && !walk) {
                el.classList.add("is-resting");
                return Promise.resolve();
            }
            el.classList.remove("is-resting");
            return moveTo(spots[week], 50, 1300).then(function () {
                at = week;
                // Arrivato al falò scelto, resta in piedi di fronte
                el.classList.add("is-resting");
            });
        }

        function placeAt(week) {
            const target = spots[week] ? week : restWeek();
            clearTimeout(timer);
            finish();
            s = spots[target];
            at = target;
            el.classList.add("is-resting");
            draw();
        }

        placeAt(restWeek());
        return { enter: enter, walkTo: walkTo, placeAt: placeAt };
    }


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

    document.querySelectorAll("[data-level-open]:not(.world-stop)").forEach(function (button) {
        button.addEventListener("click", function () {
            open(Number(button.dataset.levelOpen), false);
        });
    });

    // ---------- Riquadro del falò ----------
    // Clic su un cartellino: il cavaliere cammina fin lì, poi sopra il falò
    // si apre il riquadro con le quattro sezioni e "Scopri i dettagli"

    const firePanel = section.querySelector(".fire-panel");
    let panelWeek = 0;

    function closePanel() {
        if (!firePanel || !firePanel.open) return;
        firePanel.close();
        section.classList.remove("has-panel");
        section.querySelectorAll(".world-stop.is-open").forEach(function (stop) { stop.classList.remove("is-open"); });
        panelWeek = 0;
    }

    function openPanel(week, stop) {
        if (!firePanel) { open(week, false); return; }
        const state = weeks[week - 1].dataset.state;
        firePanel.querySelector(".fp-lv").textContent = "LV " + pad(week);
        firePanel.querySelector(".fp-state").textContent = STOP_LABEL[state];
        firePanel.querySelector(".fp-head .state-icon").dataset.state = state;
        firePanel.dataset.state = state;
        firePanel.style.left = stop.style.left;
        // Il riquadro con i dettagli si apre sotto il falò, il cartellino resta sopra
        firePanel.style.top = stop.dataset.panelTop;
        firePanel.classList.add("is-below");
        firePanel.style.setProperty("--shift", "0px");
        firePanel.style.setProperty("--drop", "0px");
        section.classList.add("has-panel");
        panelWeek = week;
        firePanel.show();

        // Resta dentro la parte visibile dello schermo
        const page = firePanel.closest(".world-page");
        const box = firePanel.getBoundingClientRect();
        const view = page.getBoundingClientRect();
        let shift = 0;
        if (box.left < view.left + 8) shift = view.left + 8 - box.left;
        if (box.right > view.right - 8) shift = view.right - 8 - box.right;
        firePanel.style.setProperty("--shift", shift + "px");
        // Non sale sotto il pulsante Menu e non esce in basso
        const minTop = view.top + 66;
        if (box.top < minTop) firePanel.style.setProperty("--drop", (minTop - box.top) + "px");
        else if (box.bottom > view.bottom - 8) firePanel.style.setProperty("--drop", (view.bottom - 8 - box.bottom) + "px");
        const first = firePanel.querySelector(".fp-row");
        if (first) first.focus({ preventScroll: true });
    }

    section.querySelectorAll(".world-stop").forEach(function (button) {
        button.addEventListener("click", function (event) {
            event.stopPropagation();
            const week = Number(button.dataset.levelOpen);
            closePanel();
            knight.walkTo(week).then(function () { openPanel(week, button); });
        });
    });

    if (firePanel) {
        // Una sezione apre la scheda della settimana direttamente su quella sezione
        firePanel.querySelectorAll(".fp-row").forEach(function (row) {
            row.addEventListener("click", function () {
                const week = panelWeek;
                const index = Number(row.dataset.section);
                closePanel();
                open(week, false);
                const target = body.querySelectorAll("section")[index];
                const inner = dialog.querySelector(".panel-inner");
                if (target && inner) inner.scrollTop = target.offsetTop - inner.offsetTop - 12;
            });
        });

        firePanel.querySelector(".fp-cta").addEventListener("click", function () {
            const week = panelWeek;
            closePanel();
            open(week, false);
        });

        firePanel.addEventListener("click", function (event) { event.stopPropagation(); });

        // Clic fuori, Esc, cambio di mondo o di schermata: si chiude
        section.addEventListener("click", closePanel);
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && firePanel.open) {
                event.preventDefault();
                event.stopImmediatePropagation();
                closePanel();
            }
        }, true);
        window.addEventListener("screen:show", closePanel);
        section.querySelectorAll("[data-world-step]").forEach(function (b) { b.addEventListener("click", closePanel); });
    }

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
    if (initial) {
        knight.placeAt(initial);
        open(initial, true);
    }
})();
