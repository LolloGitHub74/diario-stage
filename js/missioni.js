// =========================================================
// Missioni: la lavagna delle attività di lavoro.
// Per aggiungere o cambiare una missione basta modificare
// l'elenco qui sotto: filtri, contatori, pagine, cartellino
// "Nuova" e collegamenti ai falò si aggiornano da soli.
//
//   stato:     "corso" | "attesa" | "completata"
//   fasi:      [nome, "fatta" | "attuale" | "futura"]
//   settimane: i livelli (falò) in cui ci ho lavorato
//   aggiunta:  data (AAAA-MM-GG) in cui l'ho inserita: per 7 giorni
//              compare il nastro "Nuova"
// =========================================================

(function () {
    "use strict";

    const MISSIONI = [
        {
            titolo: "Shorts di Marina",
            breve: "Un video breve creato con l'AI, dallo storyboard alle modifiche.",
            testo: "Un video breve realizzato con l'AI: dallo storyboard in formato verticale all'accesso a Google Flow, fino alle modifiche in base ai feedback delle ragazze.",
            stato: "corso",
            settimane: [5, 6, 7, 8],
            fasi: [["Storyboard", "fatta"], ["Feedback", "fatta"], ["Google Flow", "fatta"], ["Modifiche", "attuale"]],
            aggiunta: "2026-10-05"
        },
        {
            titolo: "Identità di team",
            breve: "Il team AI come hub per gli altri team: idee, loghi e mockup.",
            testo: "Il progetto per rendere il team AI un hub utile agli altri team: dal brainstorming dell'Open Day ai due loghi e al mockup dello spazio condiviso, presentati a inizio novembre, fino alla proposta puramente estetica da portare in una call.",
            stato: "corso",
            settimane: [6, 7, 8, 9, 10],
            fasi: [["Open Day", "fatta"], ["Loghi e spazio", "fatta"], ["Proposta estetica", "attuale"], ["Call di proposta", "futura"]],
            aggiunta: "2026-10-12"
        },
        {
            titolo: "Newsletter",
            breve: "Una newsletter di team: studio dei format e prima bozza.",
            testo: "La newsletter del team, con Martina e Ari: studio di canali e format, mockup e documento con le note, test sull'ambiente Viva Agent e call sulla direzione finale. Ora preparo la prossima call.",
            stato: "corso",
            settimane: [8, 9, 10],
            fasi: [["Format", "fatta"], ["Mockup", "fatta"], ["Viva Agent", "fatta"], ["Direzione finale", "fatta"], ["Prossima call", "attuale"]],
            aggiunta: "2026-11-01"
        },
        {
            titolo: "Gestione dei feedback",
            breve: "Come raccogliere i feedback degli utenti e usarli davvero.",
            testo: "Con Marti e Laura: come raccogliere i feedback lasciati dagli utenti sui simulatori e, soprattutto, come usarli nel concreto, con una proposta in Excel e una presentazione dei dati. Ora aspetto le indicazioni di Martina, dopo il confronto con Silvia.",
            stato: "attesa",
            settimane: [2, 4, 5, 6, 8, 10],
            fasi: [["Proposta", "fatta"], ["Presentazione", "fatta"], ["Indicazioni", "attuale"], ["Analisi", "futura"]],
            aggiunta: "2026-09-14"
        },
        {
            titolo: "Test di Aria",
            breve: "Test di Aria su diverse macro-categorie e nuove funzionalità.",
            testo: "Test di Aria, l'agente AI di Skilla, in un ambiente di prova: prima su diverse macro-categorie, poi sulle nuove funzionalità, per capire quanto supporto offre nel lavoro di ogni giorno. A metà novembre, con il nuovo file di Arianna, ho completato i test.",
            stato: "completata",
            settimane: [4, 6, 7, 8, 10],
            fasi: [["Primo giro", "fatta"], ["Nuove funzioni", "fatta"], ["File di Arianna", "fatta"], ["Test completati", "fatta"]],
            aggiunta: "2026-09-28"
        },
        {
            titolo: "Prova dei simulatori",
            breve: "Provare i simulatori di SkillaCloud e lasciare feedback.",
            testo: "Esplorazione dei simulatori di SkillaCloud per capire come sono costruiti: Flavio, Giulia & co., Davide, Elena & co., Agata e Marina. Poi prove e feedback ogni venerdì, e il documento con i feedback sui simulatori assegnati. Per ora i test sono in stand-by: il server degli strumenti è spento.",
            stato: "attesa",
            settimane: [1, 3, 8, 9, 10],
            fasi: [["Esplorazione", "fatta"], ["Feedback", "fatta"], ["Stand-by", "attuale"], ["Riprendere i test", "futura"]],
            aggiunta: "2026-09-07"
        },
        {
            titolo: "Revisione dei contratti",
            breve: "Analisi dei contratti dei clienti per un progetto interno.",
            testo: "Insieme ad altri stagisti, analisi dei contratti dei clienti per Elena Testoni, raccogliendo le informazioni utili allo sviluppo di un progetto interno.",
            stato: "completata",
            settimane: [2],
            fasi: [["Lettura", "fatta"], ["Raccolta dati", "fatta"]],
            aggiunta: "2026-09-14"
        },
        {
            titolo: "Testi per le traduzioni",
            breve: "Testi dei simulatori pronti per la traduzione.",
            testo: "Controllo e preparazione dei file con i testi dei simulatori Chiara e Sebastiano, pronti per la traduzione in inglese e spagnolo.",
            stato: "completata",
            settimane: [2],
            fasi: [["Controllo", "fatta"], ["Preparazione", "fatta"]],
            aggiunta: "2026-09-14"
        },
        {
            titolo: "Il Diario di Stage",
            breve: "Il sito di questo diario, il mio progetto finale.",
            testo: "L'elaborato finale: il sito del diario di stage, con i mondi dei falò, la forgia del progetto e la scheda del personaggio. Il 23, 24 e 25 novembre ho tre pomeriggi dedicati, poi la rifinitura e la presentazione.",
            stato: "corso",
            settimane: [5, 6, 10],
            fasi: [["Il sito", "attuale"], ["Rifinitura", "futura"], ["Presentazione", "futura"], ["Modifiche", "futura"]],
            aggiunta: "2026-10-05"
        },
        {
            titolo: "Progetti 2027",
            breve: "Le idee per i progetti del 2027, presentate alla call.",
            testo: "Ho pensato le idee per i progetti del 2027: tre per il team e una mia personale. Le ho presentate alla call del team, dove sono stato invitato a partecipare.",
            stato: "completata",
            settimane: [10],
            fasi: [["Idee", "fatta"], ["Call", "fatta"]],
            aggiunta: "2026-11-11"
        },
        {
            titolo: "Video di Flora",
            breve: "Lo storyboard del video di Flora, in attesa di feedback.",
            testo: "Ho testato Flora e capito come introdurla, poi ho scritto e consegnato lo storyboard del video: c'è solo l'immagine del personaggio, nessun altro input grafico. Ora aspetto i feedback.",
            stato: "attesa",
            settimane: [10],
            fasi: [["Test di Flora", "fatta"], ["Storyboard", "fatta"], ["Feedback", "attuale"]],
            aggiunta: "2026-11-12"
        }
    ];

    const STATI = {
        corso:      { nome: "In corso",   icona: "pugnale",  ordine: 0 },
        attesa:     { nome: "In attesa",  icona: "clessidra", ordine: 1 },
        completata: { nome: "Completata", icona: "sigillo",  ordine: 2 }
    };
    const FILTRI = [["tutte", "Tutte"], ["corso", "In corso"], ["attesa", "In attesa"], ["completata", "Completate"]];
    const PER_PAGINA = 6;
    const INCLINAZIONI = [-1.6, 1.2, -0.8, 1.8, -1.2, 0.9];

    const win = document.getElementById("panel-attivita");
    if (!win) return;

    const filtri = win.querySelector(".mis-filters");
    const griglia = win.querySelector(".mis-grid");
    const detail = win.querySelector(".mis-detail");
    const prev = win.querySelector(".mis-prev");
    const next = win.querySelector(".mis-next");
    const thumb = win.querySelector(".mis-track i");
    const stage = window.STAGE;

    let filtro = "tutte";
    let pagina = 0;

    function esc(text) {
        return String(text).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }

    function ultimaSettimana(m) { return Math.max.apply(null, m.settimane); }

    // In corso per prime, poi in attesa, poi completate; a parità la più recente
    const ordinate = MISSIONI.slice().sort(function (a, b) {
        return STATI[a.stato].ordine - STATI[b.stato].ordine || ultimaSettimana(b) - ultimaSettimana(a);
    });

    function nuova(m) {
        const giorni = (Date.now() - new Date(m.aggiunta + "T12:00:00").getTime()) / 86400000;
        return giorni >= -1 && giorni <= 7;
    }

    function visibili() {
        return ordinate.filter(function (m) { return filtro === "tutte" || m.stato === filtro; });
    }

    function conta(chiave) {
        return ordinate.filter(function (m) { return chiave === "tutte" || m.stato === chiave; }).length;
    }

    // Nel cartellino ci stanno le ultime 4 settimane; nel dettaglio tutte
    function chips(m, massimo) {
        const elenco = massimo ? m.settimane.slice(-massimo) : m.settimane;
        return elenco.map(function (w) {
            const aperta = !stage || stage.state(w) !== "locked";
            const nome = '<span class="pre">LV </span>' + String(w).padStart(2, "0");
            return aperta
                ? '<a class="mis-lv" href="#livello-' + String(w).padStart(2, "0") + '" data-week="' + w + '" aria-label="Livello ' + w + '"><img src="immagini/lav-fiamma.webp" alt="">' + nome + "</a>"
                : '<span class="mis-lv is-locked"><img src="immagini/lav-fiamma.webp" alt="">' + nome + "</span>";
        }).join("");
    }

    function puntini(m) {
        return '<span class="mis-dots" aria-hidden="true">' + m.fasi.map(function (f) {
            return '<i class="is-' + f[1] + '" title="' + esc(f[0]) + '"></i>';
        }).join("") + "</span>";
    }

    function disegna() {
        filtri.innerHTML = FILTRI.map(function (f) {
            return '<button type="button" role="tab" class="mis-filter' + (f[0] === filtro ? " is-on" : "") + '" data-f="' + f[0] + '" aria-selected="' + (f[0] === filtro) + '">'
                + "<span>" + f[1] + "</span><b>" + conta(f[0]) + "</b></button>";
        }).join("");

        const lista = visibili();
        const pagine = Math.max(1, Math.ceil(lista.length / PER_PAGINA));
        pagina = Math.min(pagina, pagine - 1);
        const fetta = lista.slice(pagina * PER_PAGINA, pagina * PER_PAGINA + PER_PAGINA);

        griglia.innerHTML = fetta.map(function (m, i) {
            const stato = STATI[m.stato];
            return '<article class="mis-card is-' + m.stato + '" style="--rot: ' + INCLINAZIONI[i % INCLINAZIONI.length] + 'deg" data-id="' + ordinate.indexOf(m) + '">'
                + '<button type="button" class="mis-open" aria-label="' + esc(m.titolo + ", " + stato.nome + ". Apri il dettaglio") + '"></button>'
                + '<div class="mis-text' + (m.titolo.length > 19 ? " is-long" : "") + '"><h3>' + esc(m.titolo) + "</h3><p>" + esc(m.breve) + "</p></div>"
                + puntini(m)
                + '<div class="mis-chips">' + chips(m, 4) + "</div>"
                + '<img class="mis-state mis-state-' + stato.icona + '" src="immagini/lav-' + stato.icona + '.webp" alt="' + stato.nome + '">'
                + (nuova(m) ? '<span class="mis-new">Nuova</span>' : "")
                + "</article>";
        }).join("");

        prev.disabled = pagina === 0;
        next.disabled = pagina >= pagine - 1;
        win.querySelector(".mis-pager").classList.toggle("is-single", pagine === 1);
        thumb.style.width = 100 / pagine + "%";
        thumb.style.left = pagina * 100 / pagine + "%";
    }

    function apriDettaglio(m) {
        const stato = STATI[m.stato];
        detail.innerHTML = '<div class="mis-sheet">'
            + '<button type="button" class="mis-back">‹ Indietro</button>'
            + '<img class="mis-state mis-state-' + stato.icona + '" src="immagini/lav-' + stato.icona + '.webp" alt="">'
            + "<h3>" + esc(m.titolo) + " <em>· " + stato.nome.toLowerCase() + "</em></h3>"
            + "<p>" + esc(m.testo) + "</p>"
            + '<ol class="mis-steps">' + m.fasi.map(function (f) {
                return '<li class="is-' + f[1] + '"><i></i><span>' + esc(f[0]) + "</span></li>";
            }).join("") + "</ol>"
            + '<div class="mis-chips">' + chips(m) + "</div>"
            + "</div>";
        detail.hidden = false;
        detail.querySelector(".mis-back").focus({ preventScroll: true });
    }

    function chiudiDettaglio() {
        detail.hidden = true;
        detail.innerHTML = "";
    }

    filtri.addEventListener("click", function (event) {
        const bottone = event.target.closest(".mis-filter");
        if (!bottone) return;
        filtro = bottone.dataset.f;
        pagina = 0;
        griglia.scrollTop = 0;
        disegna();
    });

    prev.addEventListener("click", function () { pagina--; disegna(); });
    next.addEventListener("click", function () { pagina++; disegna(); });

    function clicChip(event) {
        const chip = event.target.closest("a.mis-lv");
        if (!chip) return;
        event.preventDefault();
        event.stopPropagation();
        if (window.openLevel) window.openLevel(Number(chip.dataset.week));
    }
    win.addEventListener("click", clicChip, true);

    griglia.addEventListener("click", function (event) {
        const carta = event.target.closest(".mis-card");
        if (carta && event.target.closest(".mis-open")) apriDettaglio(ordinate[Number(carta.dataset.id)]);
    });

    detail.addEventListener("click", function (event) {
        if (event.target.closest(".mis-back") || event.target === detail) chiudiDettaglio();
    });

    // Esc chiude prima il dettaglio, poi la finestra
    win.addEventListener("cancel", function (event) {
        if (!detail.hidden) {
            event.preventDefault();
            chiudiDettaglio();
        }
    });

    // Ogni volta che si apre, riparte pulita
    new MutationObserver(function () {
        if (win.open) {
            filtro = "tutte";
            pagina = 0;
            chiudiDettaglio();
            disegna();
            win.focus();
        }
    }).observe(win, { attributes: true, attributeFilter: ["open"] });

    disegna();
})();
