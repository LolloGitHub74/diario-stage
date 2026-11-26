// =========================================================
// Effetti sonori, fatti nel codice (Web Audio): nessun file da scaricare.
// Ogni clic su un pulsante fa un "tac" morbido, come un tasto di tastiera:
// un tonfo corto e basso con un soffio di rumore filtrato, senza acuti.
// Ci sono quattro varianti a seconda del tipo di pulsante.
// Il pulsante in alto a destra (in basso nella home) accende e spegne
// l'audio (clic e musica), e si ricorda la scelta. La musica è in musica.js.
//
//   moneta    solo il tasto START: "tin-din" a onda quadra, la seconda nota più alta
//   tasto     pulsanti normali: il tac di un tasto
//   pieno     azioni importanti (menu, falò, armi, libri): più profondo
//   indietro  chiusure e ritorni: più leggero
//   lieve     frecce e filtri: brevissimo e quasi sussurrato
//   passo     i passi del cavaliere (li fa partire passi.js, a tempo con i piedi)
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
        let c;
        try { c = new AC({ latencyHint: "interactive" }); } catch (e) { c = new AC(); }
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

    // La "punta" del click: una sinusoide che scende appena e si spegne subito
    function punta(c, t, freq, durata, vol) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + durata);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.0015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
        o.connect(g);
        g.connect(c._out);
        o.start(t);
        o.stop(t + durata + 0.01);
    }

    let lato = 1;     // passo destro o sinistro

    const VOCI = {
        // La moneta: si bemolle 5 (988 Hz), breve, e poi mi 6 (1319 Hz), più lunga
        moneta: function (c, t) {
            nota(c, t, 987.77, 0.075, 0.42, 0.01);
            nota(c, t + 0.085, 1318.51, 0.12, 0.42, 0.34);
        },
        // Il click di un pulsante meccanico: un colpo secco e brevissimo quando
        // scende, e un "tic" più leggero quando risale (circa 45 ms dopo).
        // Niente tonfo basso: quello è dei passi.
        tasto: function (c, t) {
            const v = varia();
            soffio(c, t, 1600 * v, 1.1, 3000, 1.2, 0.013);
            punta(c, t, 1150 * v, 0.016, 0.34);
            soffio(c, t + 0.045, 1400 * v, 1.1, 2800, 0.45, 0.009);
        },
        pieno: function (c, t) {
            const v = varia();
            soffio(c, t, 1700 * v, 1.1, 3800, 1.0, 0.016);
            punta(c, t, 1150 * v, 0.02, 0.35);
            tonfo(c, t, 190 * v, 110 * v, 0.05, 0.22);        // un po' di corpo, per le azioni importanti
            soffio(c, t + 0.05, 1500 * v, 1.2, 3600, 0.45, 0.01);
        },
        indietro: function (c, t) {
            const v = varia();
            soffio(c, t, 1500 * v, 1.1, 2900, 0.85, 0.011);
            punta(c, t, 1050 * v, 0.013, 0.24);
            soffio(c, t + 0.04, 1300 * v, 1.1, 2700, 0.3, 0.007);
        },
        lieve: function (c, t) {
            const v = varia();
            soffio(c, t, 1900 * v, 1.2, 3300, 0.7, 0.009);
            punta(c, t, 1400 * v, 0.01, 0.2);
        },
        // Un passo sulla terra: tonfo sordo e un po' di fruscio; destro e sinistro
        // sono appena diversi, così la camminata non suona a macchinetta
        passo: function (c, t) {
            lato = -lato;
            const v = varia() * (lato > 0 ? 1.06 : 0.94);
            tonfo(c, t, 240 * v, 120 * v, 0.07, 0.55);
            soffio(c, t, 850 * v, 0.7, 1700, 0.5, 0.045);
        },
    };

    // Un solo contesto audio per tutto il sito (anche la musica usa questo)
    function ottieni() {
        if (!ctx) ctx = nuovoContesto();
        if (ctx && ctx.state === "suspended" && ctx.resume) {
            const r = ctx.resume();
            if (r && r.catch) r.catch(function () { /* ancora bloccato */ });
        }
        return ctx;
    }

    function suona(tipo) {
        if (muto) return;
        if (!ottieni()) return;
        (VOCI[tipo] || VOCI.tasto)(ctx, ctx.currentTime + 0.002);
        window.dispatchEvent(new CustomEvent("diario:suono", { detail: tipo }));
    }

    function tipoDi(el) {
        for (let i = 0; i < REGOLE.length; i++) {
            if (el.closest(REGOLE[i][1])) return REGOLE[i][0];
        }
        return "tasto";
    }

    // Il browser tiene l'audio fermo finché non c'è un gesto dell'utente: il primo
    // tocco, tasto o clic lo sblocca (il contesto è già pronto dal caricamento)
    function sblocca() {
        if (ctx && ctx.state === "suspended" && ctx.resume) {
            const r = ctx.resume();
            if (r && r.catch) r.catch(function () { /* ancora bloccato: riproverà al prossimo gesto */ });
        }
    }
    ["pointerdown", "keydown", "touchend", "click"].forEach(function (nome) {
        document.addEventListener(nome, sblocca, { capture: true, passive: true });
    });

    function cliccabile(el) {
        const x = el && el.closest && el.closest(CLICCABILI);
        if (!x || x.disabled || x.getAttribute("aria-disabled") === "true") return null;
        if (x.id === "suono") return null;     // l'interruttore ha il suo suono
        return x;
    }

    // Col mouse il suono parte quando premi il tasto, non quando lo rilasci:
    // il clic arriva solo al rilascio e si sentirebbe in ritardo.
    // Col dito e con la tastiera il clic è già immediato.
    let premuto = null;
    document.addEventListener("pointerdown", function (event) {
        if (event.pointerType === "touch" || event.button > 0) return;
        const el = cliccabile(event.target);
        if (!el) return;
        premuto = { el: el, t: performance.now() };
        suona(tipoDi(el));
    }, true);

    // Un solo ascoltatore per tutto il sito: vale anche per i pulsanti creati dopo
    document.addEventListener("click", function (event) {
        const el = cliccabile(event.target);
        if (!el) return;
        if (premuto && premuto.el === el && performance.now() - premuto.t < 3000) { premuto = null; return; }   // già suonato alla pressione
        premuto = null;
        suona(tipoDi(el));
    }, true);

    document.addEventListener("keydown", function () { premuto = null; }, true);

    // Prepara subito l'audio (resta fermo fino al primo gesto): così il primo suono non aspetta
    if (!muto) ottieni();

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
            window.dispatchEvent(new CustomEvent("diario:audio", { detail: { muto: muto } }));
            if (!muto) suona("tasto");
        });
        mostra();
    }

    window.sfx = { play: suona, ctx: ottieni, muto: function () { return muto; } };
})();
