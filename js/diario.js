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

        // Falò acceso solo per le settimane raggiunte, spento per quelle bloccate
        const fire = stop.closest(".world-stage").querySelectorAll(".map-fire")[(week - 1) % 4];
        if (fire) fire.dataset.state = state;
    });


    // ---------- Mondi ----------

    let world = 1;
    const knights = {};    // un cavaliere per ogni mondo disegnato

    function knightOf(n) {
        return knights[n] || { enter: function () {}, walkTo: function () { return Promise.resolve(); }, placeAt: function () {}, leave: function () {}, week: function () { return 0; } };
    }

    // how: { from: "start" | "end" } fa entrare il cavaliere camminando
    function showWorld(n, how) {
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
        if (how && document.body.dataset.screen === "livelli") knightOf(n).enter(how.from, how.delay);
    }

    // Cambio di mondo: un cerchio nero si chiude subito, a schermo nero
    // cambia la mappa e il cerchio si riapre sul nuovo mondo
    const iris = document.getElementById("iris");
    const IRIS = { duration: 520, easing: "steps(10, end)", fill: "forwards" };
    let irisBusy = false;

    // origin: punto dello schermo su cui si chiude il cerchio (il cavaliere)
    function irisSwap(swap, origin) {
        if (irisBusy) return;
        if (!iris || !iris.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            swap();
            return;
        }
        irisBusy = true;
        iris.style.left = origin ? origin.x + "px" : "";
        iris.style.top = origin ? origin.y + "px" : "";
        iris.classList.add("is-on");
        iris.animate([
            { width: "300vmax", height: "300vmax" },
            { width: "0vmax", height: "0vmax" }
        ], IRIS).finished.then(function () {
            // Si riapre dal centro dello schermo sul nuovo mondo
            iris.style.left = "";
            iris.style.top = "";
            swap();
            return new Promise(function (resolve) { setTimeout(resolve, 120); });
        }).then(function () {
            return iris.animate([
                { width: "0vmax", height: "0vmax" },
                { width: "150vmax", height: "150vmax" }
            ], IRIS).finished;
        }).then(function () {
            iris.classList.remove("is-on");
            iris.getAnimations().forEach(function (animation) { animation.cancel(); });
            irisBusy = false;
        });
    }

    // Avanti: il cavaliere parte dall'inizio della strada verso il primo falò.
    // Indietro: arriva da destra verso l'ultimo falò del mondo
    function goWorld(n) {
        if (n < 1 || n > pages.length || n === world || irisBusy) return;
        const from = n > world ? "start" : "end";
        // Il cavaliere si avvia verso l'uscita mentre il cerchio si chiude,
        // poi nel nuovo mondo si muove mentre il cerchio si riapre
        knightOf(world).leave(n > world ? 1 : -1);
        const walker = pages[world - 1].querySelector(".knight-walker");
        let origin = null;
        if (walker) {
            const box = walker.getBoundingClientRect();
            origin = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        }
        irisSwap(function () { showWorld(n, { from: from, delay: 450 }); }, origin);
    }

    section.querySelectorAll("[data-world-step]").forEach(function (button) {
        button.addEventListener("click", function () {
            goWorld(world + Number(button.dataset.worldStep));
        });
    });

    // Frecce della tastiera: il cavaliere va al falò accanto; dal primo
    // o dall'ultimo falò del mondo passa al mondo vicino
    document.addEventListener("keydown", function (event) {
        if (document.body.dataset.screen !== "livelli" || (dialog && dialog.open)) return;
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        if (irisBusy) return;
        const step = event.key === "ArrowRight" ? 1 : -1;
        const knight = knights[world];
        const here = knight ? knight.week() : 0;
        // Verso un falò bloccato non si va
        if (here && stage.state(here + step) === "locked") return;
        if (!here || Math.ceil((here + step) / 4) !== world) {
            goWorld(world + step);
            return;
        }
        event.preventDefault();
        section.click();   // chiude il riquadro del falò, se aperto
        knight.walkTo(here + step);
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

    // ---------- Il cavaliere ----------

    section.querySelectorAll(".knight-walker").forEach(function (el) {
        knights[Number(el.closest(".world-page").dataset.world)] = makeKnight(el);
    });

    // Il diario si apre sul mondo della settimana in corso
    // (o dell'ultima completata), se quel mondo è già disegnato
    let startWorld = 1;
    weeks.forEach(function (item) {
        const n = Math.ceil(Number(item.dataset.week) / 4);
        if (item.dataset.state !== "locked" && knights[n]) startWorld = n;
    });
    showWorld(startWorld);

    // La prima volta che apri il diario il cavaliere arriva da sinistra
    // fino al falò attuale; le volte dopo resta dove l'avevi lasciato
    let entered = false;
    window.addEventListener("screen:show", function (event) {
        if (event.detail !== "livelli" || entered) return;
        entered = true;
        if (!(dialog && dialog.open)) knightOf(world).enter("current");
    });

    function makeKnight(el) {
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
        const END = along[along.length - 1];

        // Punto del sentiero a una certa distanza dall'inizio
        function pointAt(s) {
            if (s <= 0) return { x: path[0].x + s, y: path[0].y };
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
            return END;
        }

        // Dove si ferma per ogni settimana: lascia il sentiero all'altezza
        // di data-stand-x e, se serve, scende di qualche passo fino a
        // data-stand-y, di fianco al falò e sotto il cartellino
        const spots = {};
        page.querySelectorAll(".world-stop").forEach(function (stop) {
            const s = distanceAtX(Number(stop.dataset.standX));
            const onPath = pointAt(s);
            const y = Number(stop.dataset.standY);
            spots[Number(stop.dataset.worldWeek)] = {
                s: s,
                x: onPath.x,
                y: y - onPath.y > 0.8 ? y : onPath.y
            };
        });
        const weeksHere = Object.keys(spots).map(Number).sort(function (a, b) { return a - b; });
        // Entra da fuori il bordo sinistro, oppure esce da una porta della mappa
        const fromGate = page.dataset.enter === "gate";
        const START = fromGate ? 0 : -3;

        let s = START;         // distanza lungo il sentiero
        let pos = pointAt(s);  // dove si trova adesso (può essere fuori dal sentiero, al falò)
        let at = 0;            // settimana a cui è fermo (0 = nessuna)
        let token = 0;         // ogni nuova camminata annulla quella in corso
        let going = 0;         // settimana verso cui sta andando
        let timer = null;

        function draw(p) {
            pos = p;
            el.style.left = p.x + "%";
            el.style.top = p.y + "%";
        }

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
            const x = el.parentElement.clientWidth * pos.x / 100;
            page.scrollLeft = x - page.clientWidth / 2;
        }

        // Dove guarda mentre cammina: di lato, oppure di fronte quando scende.
        // La mappa è 2:1, quindi in pixel la x vale il doppio della y
        let facing = "side";
        let facingSince = 0;

        // steps: negli ultimi passi verso il falò (e indietro) si vede anche di schiena
        function face(dx, dy, steps) {
            let next = "side";
            if (dy > 0 && dy > Math.abs(dx) * 2 * 0.6) next = "down";
            if (steps && dy < 0 && -dy > Math.abs(dx) * 2 * 0.6) next = "up";
            // Di fronte resta almeno un attimo, così non sfarfalla
            const now = performance.now();
            if (next !== facing && now - facingSince < 220) next = facing;
            if (next !== facing) { facing = next; facingSince = now; }
            el.classList.toggle("is-down", facing === "down");
            el.classList.toggle("is-up", facing === "up");
            if (dx) el.classList.toggle("is-left", dx < 0);
        }

        function stopWalking() {
            el.classList.remove("is-walking", "is-left", "is-down", "is-up");
            facing = "side";
        }

        // Un pezzo di camminata: "at" dà il punto per t da 0 a 1.
        // Risolve true all'arrivo, false se nel frattempo è partita un'altra camminata
        function stride(duration, pointFor, mine, steps) {
            return new Promise(function (resolve) {
                if (mine !== token) { resolve(false); return; }
                if (reduceMotion || duration <= 0) { draw(pointFor(1)); resolve(true); return; }
                el.classList.add("is-walking");
                const start = performance.now();
                function step(now) {
                    if (mine !== token) { resolve(false); return; }
                    const t = Math.min(1, (now - start) / duration);
                    const before = pos;
                    const p = pointFor(t);
                    face(p.x - before.x, p.y - before.y, steps);
                    draw(p);
                    follow();
                    if (t < 1) requestAnimationFrame(step);
                    else resolve(true);
                }
                requestAnimationFrame(step);
            });
        }

        // Lungo il sentiero fino alla distanza "to"; speed in % al secondo
        function alongPath(to, speed, maxMs, mine) {
            const from = s;
            const distance = Math.abs(to - from);
            if (distance < 0.3) { s = to; return Promise.resolve(mine === token); }
            const duration = Math.min(maxMs, Math.max(250, distance / speed * 1000));
            return stride(duration, function (t) {
                s = from + (to - from) * t;
                return pointAt(s);
            }, mine);
        }

        // In linea retta tra due punti (per uscire dal sentiero fino al falò e tornare)
        function straight(target, speed, mine) {
            const from = pos;
            const distance = Math.hypot(target.x - from.x, (target.y - from.y) / 2);
            if (distance < 0.2) return Promise.resolve(mine === token);
            return stride(Math.max(200, distance / speed * 1000), function (t) {
                return { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t };
            }, mine, true);
        }

        function arrive(week) {
            const spot = spots[week];
            stopWalking();
            s = spot.s;
            at = week;
            going = 0;
            draw({ x: spot.x, y: spot.y });
            follow();
            // Arrivato al falò si gira di fronte e resta in piedi
            el.classList.add("is-resting");
        }

        // Cammina fino al falò di "week": torna sul sentiero, lo segue,
        // poi fa gli ultimi passi fino a fianco del falò
        function go(week, speed, maxMs) {
            const mine = ++token;
            const spot = spots[week];
            going = week;
            el.classList.remove("is-resting");
            return new Promise(function (resolve) {
                straight(pointAt(s), 14, mine)
                    .then(function (ok) { return ok && alongPath(spot.s, speed, maxMs, mine); })
                    .then(function (ok) { return ok && straight({ x: spot.x, y: spot.y }, 14, mine); })
                    .then(function (ok) {
                        if (!ok) return;
                        arrive(week);
                        resolve();
                    });
            });
        }

        // from: "current" = da sinistra fino al falò attuale,
        // "start" = da sinistra fino al primo falò, "end" = da destra fino all'ultimo
        function enter(from, delay) {
            if (world !== pageWorld || page.hidden) return;
            clearTimeout(timer);
            token++;
            stopWalking();
            const fromEnd = from === "end";
            // Solo verso falò già raggiunti: quelli bloccati sono inesplorabili
            const open = weeksHere.filter(function (w) { return stage.state(w) !== "locked"; });
            const target = from === "start" ? open[0]
                : fromEnd ? open[open.length - 1]
                : restWeek();
            el.classList.remove("is-resting");
            s = fromEnd ? END : START;
            at = 0;
            draw(pointAt(s));
            page.scrollLeft = fromEnd ? page.scrollWidth : 0;
            // Dove la strada parte da una porta (o dalla fine della mappa) appare dal buio
            if (fromEnd || fromGate) el.classList.add("is-faded");
            el.classList.toggle("is-left", fromEnd);
            // Aspetta che la transizione si sia aperta, poi entra camminando
            timer = setTimeout(function () {
                // Mondo ancora tutto bloccato: il cavaliere non entra
                if (!target) return;
                el.classList.remove("is-faded");
                go(target, 34, 2600);
            }, reduceMotion ? 0 : (delay || 380));
        }

        function walkTo(week) {
            if (!spots[week] || stage.state(week) === "locked") return Promise.resolve();
            clearTimeout(timer);
            el.classList.remove("is-faded");
            // Se stava già andando verso questo falò, un secondo clic apre subito
            if (going === week) {
                token++;
                arrive(week);
                return Promise.resolve();
            }
            if (at === week && !going) {
                el.classList.add("is-resting");
                return Promise.resolve();
            }
            at = 0;
            return go(week, 50, 1300);
        }

        function placeAt(week) {
            const target = spots[week] ? week : restWeek();
            clearTimeout(timer);
            token++;
            el.classList.remove("is-faded");
            arrive(target);
        }

        placeAt(restWeek());
        // Esce dal mondo: torna sulla strada e cammina verso l'uscita
        // (dir 1 = verso la fine, -1 = verso l'inizio); la transizione lo copre
        function leave(dir) {
            clearTimeout(timer);
            const mine = ++token;
            at = 0;
            going = 0;
            el.classList.remove("is-resting", "is-faded");
            straight(pointAt(s), 14, mine).then(function (ok) {
                return ok && alongPath(dir > 0 ? END : START, 34, 2600, mine);
            }).then(function (ok) {
                if (ok) stopWalking();
            });
        }

        // Il falò dove si trova (o verso cui sta andando)
        function week() {
            return going || at;
        }

        return { enter: enter, walkTo: walkTo, placeAt: placeAt, leave: leave, week: week };
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
        if (target !== world) {
            knightOf(target).placeAt(week);
            showWorld(target);
        }
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
        // Un solo riquadro per tutti i mondi: si sposta sulla mappa del falò scelto
        if (firePanel.parentElement !== stop.parentElement) stop.parentElement.appendChild(firePanel);
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
        // (misurato senza l'animazione di apertura, che lo rimpicciolisce)
        const page = firePanel.closest(".world-page");
        firePanel.style.animation = "none";
        const box = firePanel.getBoundingClientRect();
        const view = page.getBoundingClientRect();
        // ...e lontano dalle frecce dorate ai lati
        const edge = 60;
        let shift = 0;
        if (box.left < view.left + edge) shift = view.left + edge - box.left;
        if (box.right > view.right - edge) shift = view.right - edge - box.right;
        firePanel.style.setProperty("--shift", shift + "px");
        // Non sale sotto il pulsante Menu e non esce in basso
        const minTop = view.top + 66;
        if (box.top < minTop) firePanel.style.setProperty("--drop", (minTop - box.top) + "px");
        else if (box.bottom > view.bottom - 8) firePanel.style.setProperty("--drop", (view.bottom - 8 - box.bottom) + "px");
        void firePanel.offsetWidth;
        firePanel.style.animation = "";
        const first = firePanel.querySelector(".fp-row");
        if (first) first.focus({ preventScroll: true });
    }

    section.querySelectorAll(".world-stop").forEach(function (button) {
        button.addEventListener("click", function (event) {
            event.stopPropagation();
            const week = Number(button.dataset.levelOpen);
            // Livello bloccato: inesplorabile, il cartellino trema e basta
            if (button.dataset.state === "locked") {
                button.classList.remove("is-denied");
                void button.offsetWidth;
                button.classList.add("is-denied");
                return;
            }
            closePanel();
            knightOf(Math.ceil(week / 4)).walkTo(week).then(function () { openPanel(week, button); });
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
        knightOf(Math.ceil(initial / 4)).placeAt(initial);
        open(initial, true);
    }
})();
