// =========================================================
// Effetti sonori, fatti nel codice (Web Audio): nessun file da scaricare.
// Ogni clic su un pulsante fa un "tac" morbido, come un tasto di tastiera:
// un tonfo corto e basso con un soffio di rumore filtrato, senza acuti.
// Ci sono quattro varianti a seconda del tipo di pulsante.
// Il pulsante in alto a destra (in basso nella home) accende e spegne
// l'audio, e si ricorda la scelta.
//
//   moneta    solo il tasto START: "tin-din" a onda quadra, la seconda nota più alta
//   tasto     pulsanti normali: il tac di un tasto
//   pieno     azioni importanti (menu, falò, armi, libri): più profondo
//   indietro  chiusure e ritorni: più leggero
//   lieve     frecce e filtri: brevissimo e quasi sussurrato
// =========================================================

(function () {
    "use strict";

    const CHIAVE = "diario-audio";
    const VOLUME = 0.28;

    // Che suono fa ogni pulsante (il primo che combacia vince)
    const REGOLE = [
        ["moneta", ".start-button"],
        ["indietro", "[data-close], .lib-back, .mis-back, .lib-x, .panel-close, .back-menu"],
        ["pieno",  ".menu-item, .world-stop, .forge-spot, .lib-book-btn, .inv-arma, .inv-etichetta, .sim-stage, .mis-open, .lib-lv, .sim-lv, .mis-lv"],
        ["lieve",  ".lib-nav, .world-arrow, .mis-arrow, .mis-filter, .world-dots"]
    ];
    const CLICCABILI = "button, a[href], [role='tab'], .forge-spot";

    let ctx = null;
    let muto = false;
    try { muto = localStorage.getItem(CHIAVE) === "off"; } catch (e) { /* storage non disponibile */ }

    function nuovoContesto() {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        const c = new AC();
        const master = c.createGain();
        master.gain.value = VOLUME;
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 6;
        master.connect(comp);
        comp.connect(c.destination);
        c._out = master;
        return c;
    }

    // Piccolo scarto casuale (±5%), così due clic non sono mai identici
    function varia() { return 1 + (Math.random() - 0.5) * 0.1; }

    // Il tonfo del tasto: un'onda bassa che scende subito di tono e si spegne
    function tonfo(c, t, da, a, durata, vol) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(da, t);
        o.frequency.exponentialRampToValueAtTime(a, t + durata * 0.7);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.004);       // attacco morbido
        g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
        o.connect(g);
        g.connect(c._out);
        o.start(t);
        o.stop(t + durata + 0.02);
    }

    // Il "tac" della plastica: rumore filtrato a banda, che sfuma subito
    function soffio(c, t, freq, q, taglio, vol, durata) {
        const n = Math.floor(c.sampleRate * durata);
        const buf = c.createBuffer(1, n, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) {
            const k = 1 - i / n;
            d[i] = (Math.random() * 2 - 1) * k * k;
        }
        const s = c.createBufferSource();
        s.buffer = buf;
        const banda = c.createBiquadFilter();
        banda.type = "bandpass";
        banda.frequency.value = freq;
        banda.Q.value = q;
        const basso = c.createBiquadFilter();        // niente acuti
        basso.type = "lowpass";
        basso.frequency.value = taglio;
        const g = c.createGain();
        g.gain.value = vol;
        s.connect(banda);
        banda.connect(basso);
        basso.connect(g);
        g.connect(c._out);
        s.start(t);
    }

    // Una nota a onda quadra, come nei giochi 8 bit: attacco netto, poi si spegne
    function nota(c, t, freq, durata, vol, coda) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.003);
        g.gain.setValueAtTime(vol, t + durata);                       // la nota tiene...
        g.gain.exponentialRampToValueAtTime(0.0001, t + durata + coda); // ...poi sfuma
        o.connect(g);
        g.connect(c._out);
        o.start(t);
        o.stop(t + durata + coda + 0.02);
    }

    const VOCI = {
        // La moneta: si bemolle 5 (988 Hz), breve, e poi mi 6 (1319 Hz), più lunga
        moneta: function (c, t) {
            nota(c, t, 987.77, 0.075, 0.42, 0.01);
            nota(c, t + 0.085, 1318.51, 0.12, 0.42, 0.34);
        },
        tasto: function (c, t) {
            const v = varia();
            tonfo(c, t, 420 * v, 210 * v, 0.07, 0.7);
            soffio(c, t, 1400 * v, 0.9, 2600, 0.7, 0.035);
        },
        pieno: function (c, t) {
            const v = varia();
            tonfo(c, t, 300 * v, 140 * v, 0.11, 0.85);
            soffio(c, t, 1000 * v, 0.8, 2200, 0.7, 0.05);
        },
        indietro: function (c, t) {
            const v = varia();
            tonfo(c, t, 360 * v, 230 * v, 0.06, 0.5);
            soffio(c, t, 1200 * v, 0.9, 2300, 0.45, 0.03);
        },
        lieve: function (c, t) {
            const v = varia();
            tonfo(c, t, 480 * v, 320 * v, 0.04, 0.3);
            soffio(c, t, 1500 * v, 1, 2500, 0.35, 0.02);
        }
    };

    function suona(tipo) {
        if (muto) return;
        if (!ctx) ctx = nuovoContesto();
        if (!ctx) return;
        if (ctx.state === "suspended" && ctx.resume) ctx.resume();
        (VOCI[tipo] || VOCI.tasto)(ctx, ctx.currentTime + 0.005);
    }

    function tipoDi(el) {
        for (let i = 0; i < REGOLE.length; i++) {
            if (el.closest(REGOLE[i][1])) return REGOLE[i][0];
        }
        return "tasto";
    }

    // Un solo ascoltatore per tutto il sito: vale anche per i pulsanti creati dopo
    document.addEventListener("click", function (event) {
        const el = event.target.closest && event.target.closest(CLICCABILI);
        if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
        if (el.id === "suono") return;     // l'interruttore ha il suo suono
        suona(tipoDi(el));
    }, true);

    // ---------- Interruttore ----------

    const toggle = document.getElementById("suono");

    function mostra() {
        if (!toggle) return;
        toggle.setAttribute("aria-pressed", muto ? "false" : "true");
        toggle.setAttribute("aria-label", muto ? "Accendi l'audio" : "Spegni l'audio");
        toggle.title = muto ? "Audio spento" : "Audio acceso";
    }

    if (toggle) {
        toggle.addEventListener("click", function () {
            muto = !muto;
            try { localStorage.setItem(CHIAVE, muto ? "off" : "on"); } catch (e) { /* ignora */ }
            mostra();
            if (!muto) suona("tasto");
        });
        mostra();
    }

    window.sfx = { play: suona, contesto: function () { return ctx; }, muto: function () { return muto; } };
})();
