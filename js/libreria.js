// =========================================================
// Addestramento: la libreria con due mensole.
// Per aggiungere un libro basta un blocco nell'elenco qui sotto:
// dorso, targhetta, pagina e cartellino LV si creano da soli.
//
//   tipo:     "skillalab" (mensola in alto) | "formazione" (in basso)
//   settimana: il livello (falò) collegato
//   icona:    nome del file immagini/lib-icona-NOME.webp
//   dorso:    1-6 (colore); "tinta" cambia il colore di un dorso già usato
//   testo:    una sola pagina di testo (a capo con una riga vuota: \n\n)
//   pagine:   in alternativa, un elenco di pagine: la prima sta a destra
//             della copertina, le altre riempiono le doppie pagine che si sfogliano
// =========================================================

(function () {
    "use strict";

    const LIBRI = [
        { titolo: "Il primo laboratorio", tipo: "skillalab", settimana: 1, icona: "porta", dorso: 1,
          pagine: [
              "L'incontro di apertura, che mi ha lasciato molta curiosità per i laboratori successivi.",
              "PAGINA DI PROVA 2. Qui racconterò di cosa abbiamo parlato durante il laboratorio.\n\nSecondo paragrafo di prova, per vedere come va a capo il testo.",
              "PAGINA DI PROVA 3. Qui scriverò cosa ho imparato di nuovo.\n\nAltro paragrafo di prova.",
              "PAGINA DI PROVA 4. E qui cosa mi porto via da questo laboratorio."
          ] },
        { titolo: "Dare e ricevere feedback", tipo: "skillalab", settimana: 2, icona: "feedback", dorso: 2,
          testo: "Ho scoperto quanto un feedback, dato o ricevuto, possa influenzare davvero il lavoro di un team." },
        { titolo: "Scoprire il proprio talento", tipo: "skillalab", settimana: 4, icona: "talento", dorso: 3,
          testo: "Il più stimolante finora: per riflettere bene su un tema non bisogna dare per scontato nulla, nemmeno la prima soluzione che sembra funzionare." },
        { titolo: "Problem solving", tipo: "skillalab", settimana: 9, icona: "puzzle", dorso: 4,
          testo: "Il laboratorio sul problem solving, svolto nella settimana 9. Il racconto arriva presto." },
        { titolo: "RAG e modelli AI", tipo: "formazione", settimana: 2, icona: "cervello-ingranaggi", dorso: 5,
          testo: "Una formazione sui RAG e su come «ragionano» i modelli AI: ho approfondito cosa sono i token, i chunk e come funziona l'embedding." },
        { titolo: "Prompt design", tipo: "formazione", settimana: 5, icona: "penna", dorso: 6,
          testo: "Una formazione con Fede, insieme a Laura: molto utile e interessante, perché le nozioni imparate le posso usare anche nel mio uso personale delle AI." },
        { titolo: "Bias e pensiero critico", tipo: "formazione", settimana: 5, icona: "cervello-lente", dorso: 2, tinta: 215,
          testo: "Alcune pillole sui bias, super utili: mi sono reso conto che siamo tutti condizionati da questi bias senza neanche saperlo." }
    ];

    // Posizione dei libri sulle mensole (in px dell'immagine della libreria, 1186x495)
    const MENSOLE = {
        skillalab:  { x: 130, y: 90 },
        formazione: { x: 124, y: 312 }
    };
    const PASSO = 88;

    const win = document.getElementById("panel-skillalab");
    if (!win) return;

    const board = win.querySelector(".lib-board");
    const plaques = board.querySelectorAll(".lib-plaque");
    const view = win.querySelector(".lib-view");
    const stage = window.STAGE;
    const el = {
        title: view.querySelector(".lib-title"),
        lv: view.querySelector(".lib-lv"),
        icon: view.querySelector(".lib-icon"),
        left: view.querySelector(".lib-left"),
        ltext: view.querySelector(".lib-ltext"),
        rtext: view.querySelector(".lib-rtext"),
        flip: view.querySelector(".lib-flip")
    };
    let corrente = -1;
    let doppia = 0;          // 0 = copertina; poi 1, 2... le doppie pagine
    let inCorso = false;     // la pagina sta girando

    // Le immagini della pagina che gira (la 62 è la pagina appena sollevata,
    // la 59 quella che sta atterrando a sinistra)
    const FRAME = ["62", "61", "60", "59"].map(function (n) { return "immagini/lib-pagina-" + n + ".webp"; });
    const PASSO_MS = 85;
    let caricati = false;

    function telefono() {
        return window.matchMedia("(max-width: 700px), (max-height: 520px)").matches;
    }

    function senzaMoto() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function precarica() {
        if (caricati) return;
        caricati = true;
        FRAME.forEach(function (src) { new Image().src = src; });
    }

    function pagineDi(libro) {
        return libro.pagine || [libro.testo];
    }

    function numeroDoppie(libro) {
        return 1 + Math.ceil((pagineDi(libro).length - 1) / 2);
    }

    function paragrafi(testo) {
        return String(testo || "").split(/\n\n+/).map(function (p) {
            return "<p>" + esc(p) + "</p>";
        }).join("");
    }

    function esc(text) {
        return String(text).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }

    // I libri di una mensola, uno accanto all'altro
    function disegna() {
        board.querySelectorAll(".lib-book-btn").forEach(function (b) { b.remove(); });
        ["skillalab", "formazione"].forEach(function (tipo, riga) {
            let dopo = plaques[riga];
            LIBRI.forEach(function (libro, indice) {
                if (libro.tipo !== tipo) return;
                const pos = MENSOLE[tipo];
                const n = LIBRI.slice(0, indice).filter(function (l) { return l.tipo === tipo; }).length;
                const bottone = document.createElement("button");
                bottone.type = "button";
                bottone.className = "lib-book-btn";
                bottone.dataset.i = indice;
                bottone.style.setProperty("--x", pos.x + n * PASSO);
                bottone.style.setProperty("--y", pos.y);
                bottone.setAttribute("aria-label", libro.titolo + ", settimana " + libro.settimana);
                bottone.innerHTML = '<img src="immagini/lib-dorso-' + libro.dorso + '.webp" alt=""'
                    + (libro.tinta ? ' style="filter: hue-rotate(' + libro.tinta + 'deg)"' : "") + ">"
                    + '<span class="lib-num">' + libro.settimana + "</span>"
                    + '<span class="lib-tip">' + esc(libro.titolo) + "</span>";
                dopo.after(bottone);
                dopo = bottone;
            });
        });
    }

    // Mette sul libro la copertina o la doppia pagina richiesta
    function riempi(indice, n) {
        corrente = (indice + LIBRI.length) % LIBRI.length;
        const libro = LIBRI[corrente];
        const pagine = pagineDi(libro);
        const w = libro.settimana;
        const aperto = !stage || stage.state(w) !== "locked";
        const nome = "LV " + String(w).padStart(2, "0");
        doppia = n;
        el.left.classList.toggle("is-text", n > 0);
        el.title.textContent = libro.titolo;
        el.icon.src = "immagini/lib-icona-" + libro.icona + ".webp";
        el.lv.innerHTML = '<img src="immagini/lav-fiamma.webp" alt="">' + nome;
        el.lv.dataset.week = w;
        el.lv.classList.toggle("is-locked", !aperto);
        el.lv.setAttribute("href", aperto ? "#livello-" + String(w).padStart(2, "0") : "#");
        if (telefono()) {
            // Sul telefono tutte le pagine di seguito, su un'unica pergamena
            el.ltext.innerHTML = "";
            el.rtext.innerHTML = paragrafi(pagine.join("\n\n"));
        } else if (n === 0) {
            el.ltext.innerHTML = "";
            el.rtext.innerHTML = paragrafi(pagine[0]);
        } else {
            el.ltext.innerHTML = paragrafi(pagine[2 * n - 1]);
            el.rtext.innerHTML = paragrafi(pagine[2 * n]);
        }
    }

    function mostra(indice) {
        precarica();
        riempi(indice, 0);
        view.hidden = false;
        view.querySelector(".lib-back").focus({ preventScroll: true });
    }

    // Pagina che si gira, a scatti: avanti (dir = 1) o indietro (dir = -1)
    function sfoglia(dir) {
        if (inCorso) return;
        const libro = LIBRI[corrente];
        let indice = corrente;
        let n = doppia + dir;
        if (n >= numeroDoppie(libro)) {
            indice = corrente + 1;
            n = 0;
        } else if (n < 0) {
            indice = (corrente - 1 + LIBRI.length) % LIBRI.length;
            n = numeroDoppie(LIBRI[indice]) - 1;
        }
        if (telefono()) {
            // Su telefono si passa da un libro all'altro, senza pagine da girare
            const vicino = (corrente + dir + LIBRI.length) % LIBRI.length;
            riempi(vicino, 0);
            view.scrollTop = 0;
            return;
        }
        const cambia = function () { riempi(indice, n); };
        if (senzaMoto()) { cambia(); return; }

        inCorso = true;
        view.classList.add("is-flipping");
        const frames = dir > 0 ? FRAME : FRAME.slice().reverse();
        let i = 0;
        el.flip.hidden = false;
        const passo = function () {
            if (i >= frames.length) {
                el.flip.hidden = true;
                view.classList.remove("is-flipping");
                inCorso = false;
                return;
            }
            el.flip.src = frames[i];
            if (i === 1) cambia();      // il testo cambia mentre è ancora nascosto
            i += 1;
            setTimeout(passo, PASSO_MS);
        };
        passo();
    }

    function chiudiLibro() {
        view.hidden = true;
        el.flip.hidden = true;
        view.classList.remove("is-flipping");
        inCorso = false;
        const btn = board.querySelector('.lib-book-btn[data-i="' + corrente + '"]');
        if (btn) btn.focus({ preventScroll: true });
    }

    board.addEventListener("click", function (event) {
        const btn = event.target.closest(".lib-book-btn");
        if (btn) mostra(Number(btn.dataset.i));
    });

    view.querySelector(".lib-nav-prev").addEventListener("click", function () { sfoglia(-1); });
    view.querySelector(".lib-nav-next").addEventListener("click", function () { sfoglia(1); });
    view.querySelector(".lib-back").addEventListener("click", chiudiLibro);

    // Un clic sul buio intorno al libro lo richiude
    view.addEventListener("click", function (event) {
        if (event.target === view) chiudiLibro();
    });

    // Il cartellino LV chiude la finestra e apre la settimana
    el.lv.addEventListener("click", function (event) {
        event.preventDefault();
        if (el.lv.classList.contains("is-locked")) return;
        if (window.openLevel) window.openLevel(Number(el.lv.dataset.week));
    });

    win.addEventListener("keydown", function (event) {
        if (view.hidden) return;
        if (event.key === "ArrowRight") { event.preventDefault(); sfoglia(1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); sfoglia(-1); }
    });

    // Esc chiude prima il libro, poi la finestra
    win.addEventListener("cancel", function (event) {
        if (!view.hidden) {
            event.preventDefault();
            chiudiLibro();
        }
    });

    new MutationObserver(function () {
        if (win.open) {
            view.hidden = true;
            win.focus();
        }
    }).observe(win, { attributes: true, attributeFilter: ["open"] });

    disegna();
})();
