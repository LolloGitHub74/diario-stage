// =========================================================
// Inventario: la bacheca delle armi, una per ogni strumento.
// Per aggiungere o cambiare uno strumento basta modificare
// l'elenco qui sotto.
//
//   arma:      nome del file immagini/inv-arma-NOME.webp
//   x, y, w, h: posizione e misura dell'arma, in px dell'immagine della lavagna (1766x824)
//   targa:     posizione e misura della targhetta sopra l'arma
//   etichetta: scritta sulla targhetta (se il nome è troppo lungo)
// =========================================================

(function () {
    "use strict";

    const STRUMENTI = [
        { nome: "SkillaCloud", arma: "spada", desc: "La piattaforma dei simulatori, dove ho testato simulatori e Aria",
          x: 234, y: 210, w: 394, h: 130, targa: [316, 151, 227, 40] },
        { nome: "Google Flow", arma: "arco", desc: "Generazione di video con l'AI",
          x: 679, y: 222, w: 418, h: 91, targa: [778, 151, 220, 40] },
        { nome: "Veo", arma: "balestra", desc: "Il modello di Google per creare video con l'AI",
          x: 1177, y: 203, w: 358, h: 145, targa: [1237, 151, 232, 40] },
        { nome: "ElevenLabs", arma: "corno", desc: "Generazione di voci con l'AI",
          x: 245, y: 420, w: 356, h: 180, targa: [317, 373, 226, 40] },
        { nome: "Excel", arma: "martello", desc: "Il progetto sulla gestione dei feedback",
          x: 705, y: 423, w: 342, h: 153, targa: [776, 373, 219, 40] },
        { nome: "Microsoft Teams e Outlook", etichetta: "Teams e Outlook", arma: "lancia",
          desc: "Call, riunioni di allineamento e comunicazione con il team",
          x: 1124, y: 435, w: 462, h: 124, targa: [1238, 373, 231, 40] }
    ];

    const INTRO = "Gli strumenti con cui ho lavorato durante lo stage, molti dei quali non avevo mai usato prima. Tocca un'arma per scoprire a cosa mi è servita.";

    const win = document.getElementById("panel-strumenti");
    if (!win) return;

    const testo = win.querySelector(".inv-testo");
    const lista = win.querySelector(".inv-lista");
    let scelto = -1;

    function esc(text) {
        return String(text).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }

    function stile(x, y, w, h) {
        return "--x:" + x + ";--y:" + y + ";--w:" + w + ";--h:" + h;
    }

    function disegna() {
        const prima = testo;
        STRUMENTI.forEach(function (s, i) {
            const etichetta = document.createElement("span");
            etichetta.className = "inv-etichetta";
            etichetta.dataset.i = i;
            etichetta.setAttribute("style", stile.apply(null, s.targa));
            etichetta.textContent = s.etichetta || s.nome;
            win.insertBefore(etichetta, prima);

            const bottone = document.createElement("button");
            bottone.type = "button";
            bottone.className = "inv-arma";
            bottone.dataset.i = i;
            bottone.setAttribute("style", stile(s.x, s.y, s.w, s.h));
            bottone.setAttribute("aria-pressed", "false");
            bottone.setAttribute("aria-label", s.nome + ": " + s.desc);
            bottone.innerHTML = '<img loading="lazy" src="immagini/inv-arma-' + s.arma + '.webp" alt="">';
            win.insertBefore(bottone, prima);
        });

        lista.innerHTML = STRUMENTI.map(function (s) {
            return '<li><img loading="lazy" src="immagini/inv-arma-' + s.arma + '.webp" alt="">'
                + "<div><strong>" + esc(s.nome) + "</strong><span>" + esc(s.desc) + "</span></div></li>";
        }).join("");
    }

    // Mette in evidenza l'arma scelta e scrive la descrizione sulla pergamena
    function mostra() {
        win.querySelectorAll(".inv-arma").forEach(function (b) {
            const on = Number(b.dataset.i) === scelto;
            b.classList.toggle("is-selected", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        win.querySelectorAll(".inv-etichetta").forEach(function (e) {
            e.classList.toggle("is-selected", Number(e.dataset.i) === scelto);
        });
        if (scelto < 0) {
            testo.innerHTML = "<span>" + esc(INTRO) + "</span>";
        } else {
            const s = STRUMENTI[scelto];
            testo.innerHTML = "<strong>" + esc(s.nome) + "</strong><span>" + esc(s.desc) + "</span>";
        }
    }

    // Un secondo clic sulla stessa arma la lascia e torna al messaggio iniziale
    function scegli(i) {
        scelto = (i === scelto) ? -1 : i;
        mostra();
    }

    win.addEventListener("click", function (event) {
        const el = event.target.closest(".inv-arma, .inv-etichetta");
        if (el) scegli(Number(el.dataset.i));
    });

    // Ogni volta che la finestra si apre riparte dal messaggio iniziale
    new MutationObserver(function () {
        if (win.open) { scelto = -1; mostra(); }
    }).observe(win, { attributes: true, attributeFilter: ["open"] });

    disegna();
    mostra();
})();
