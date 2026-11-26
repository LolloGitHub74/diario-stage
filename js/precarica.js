// =========================================================
// Precarica in sottofondo le immagini delle altre schermate.
// All'apertura il sito scarica solo ciò che serve per START e per la home;
// il resto arriva qui, a pagina ferma, un file alla volta e a priorità bassa,
// nell'ordine in cui probabilmente servirà: prima il mondo della settimana in
// corso, poi il Progetto, la scheda "Chi sono", gli altri mondi e le finestre.
// Con "risparmio dati" o con una connessione lenta non scarica niente in anticipo:
// ogni schermata prende le sue immagini quando la apri.
// =========================================================

(function () {
    "use strict";

    const conn = navigator.connection || {};
    if (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "")) return;

    const I = "immagini/";
    const lista = function (nomi) { return nomi.map(function (n) { return I + n + ".webp"; }); };

    // Il mondo della settimana in corso (4 settimane per mondo)
    function mondoAttuale() {
        const stage = window.STAGE;
        let w = 1;
        if (stage && stage.state) {
            for (let i = 1; i <= 16; i++) if (stage.state(i) !== "locked") w = i;
        }
        return Math.ceil(w / 4);
    }

    function gruppi() {
        const adesso = mondoAttuale();
        const altri = [1, 2, 3, 4].filter(function (n) { return n !== adesso; })
            .sort(function (a, b) { return Math.abs(a - adesso) - Math.abs(b - adesso); });
        return [
            lista(["mondo-" + adesso, "ui-cornice", "ui-freccia-next", "ui-freccia-prev", "falo-mappa", "falo-spento",
                   "cavaliere-riposo", "cavaliere-fermo", "cavaliere-cammina", "cavaliere-fronte", "cavaliere-schiena",
                   "ui-punta", "ui-check"]),
            lista(["forgia", "alone-simulatore", "alone-skillalab", "alone-attivita", "alone-strumenti",
                   "ui-stella", "ui-pergamena", "ui-spade", "ui-libro"]),
            lista(["scheda-sfondo", "scheda-info", "scheda-base", "scheda-fuoco", "scheda-cavaliere-strip", "scheda-rombo"]),
            lista(altri.map(function (n) { return "mondo-" + n; })),
            lista(["sim-cornice", "sim-incudine", "sim-pergamena", "sim-targa", "sim-riquadro", "sim-riquadro-attivo",
                   "sim-riquadro-spento", "sim-cartellino", "sim-cartellino-oro", "sim-spunta", "sim-lucchetto",
                   "sim-spada-1", "sim-spada-2", "sim-spada-3", "sim-spada-4", "sim-spada-5", "lav-chiudi"]),
            lista(["lav-legno", "lav-cornice", "lav-targa", "lav-linguetta", "lav-linguetta-attiva", "lav-pergamena-1",
                   "lav-pergamena-2", "lav-pergamena-3", "lav-freccia-sx", "lav-freccia-dx", "lav-clessidra",
                   "lav-pugnale", "lav-sigillo"]),
            lista(["lib-scaffale", "lib-libro", "lib-pagina-62", "lib-pagina-61", "lib-pagina-60", "lib-pagina-59",
                   "inv-lavagna", "inv-arma-spada", "inv-arma-arco", "inv-arma-balestra", "inv-arma-martello",
                   "inv-arma-corno", "inv-arma-lancia"])
        ];
    }

    function carica(url) {
        return new Promise(function (resolve) {
            const img = new Image();
            img.fetchPriority = "low";
            img.decoding = "async";
            img.onload = img.onerror = resolve;
            img.src = url;
        });
    }

    async function tutto() {
        const tutte = gruppi().reduce(function (a, g) { return a.concat(g); }, []);
        for (let i = 0; i < tutte.length; i++) {
            // Se l'utente ha nascosto la scheda, aspetta che torni
            while (document.hidden) await new Promise(function (r) { setTimeout(r, 1000); });
            await carica(tutte[i]);
            await new Promise(function (r) { setTimeout(r, 120); });
        }
    }

    function parti() {
        if ("requestIdleCallback" in window) requestIdleCallback(tutto, { timeout: 4000 });
        else setTimeout(tutto, 2500);
    }

    if (document.readyState === "complete") setTimeout(parti, 800);
    else window.addEventListener("load", function () { setTimeout(parti, 800); });
})();
