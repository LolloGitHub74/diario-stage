// =========================================================
// Effetti sonori, fatti nel codice (Web Audio): nessun file da scaricare.
// Ogni clic su un pulsante fa un suono metallico; ci sono quattro
// varianti a seconda del tipo di pulsante. Il pulsante in alto a destra
// (in basso nella home) accende e spegne l'audio, e si ricorda la scelta.
//
//   tink  pulsanti normali: "tin" metallico acuto
//   tonk  azioni importanti (menu, falò, armi, libri): più pieno, da forgia
//   close chiusure e ritorni: più morbido, scende un poco
//   tick  frecce e filtri: brevissimo
// =========================================================

(function () {
    "use strict";

    const CHIAVE = "diario-audio";
    const VOLUME = 0.22;

    // Che suono fa ogni pulsante (il primo che combacia vince)
    const REGOLE = [
        ["close", "[data-close], .lib-back, .mis-back, .lib-x, .panel-close, .back-menu"],
        ["tonk",  ".menu-item, .world-stop, .forge-spot, .lib-book-btn, .inv-arma, .inv-etichetta, .sim-stage, .mis-open, .lib-lv, .sim-lv, .mis-lv"],
        ["tick",  ".lib-nav, .world-arrow, .mis-arrow, .mis-filter, .world-dots"]
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

    // Una "campana" metallica: parziali non armonici che si spengono a velocità diverse
    function campana(c, t, base, parziali, durata, scivola) {
        parziali.forEach(function (p, i) {
            const o = c.createOscillator();
            const g = c.createGain();
            o.type = "sine";
            const f = base * p[0];
            o.frequency.setValueAtTime(f, t);
            if (scivola) o.frequency.exponentialRampToValueAtTime(f * scivola, t + durata * p[2]);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(p[1], t + 0.002);
            g.gain.exponentialRampToValueAtTime(0.0001, t + durata * p[2]);
            o.connect(g);
            g.connect(c._out);
            o.start(t);
            o.stop(t + durata * p[2] + 0.02);
        });
    }

    // Un colpetto di rumore filtrato: il "clic" dell'attacco
    function colpo(c, t, freq, vol, durata) {
        const n = Math.floor(c.sampleRate * durata);
        const buf = c.createBuffer(1, n, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const s = c.createBufferSource();
        s.buffer = buf;
        const f = c.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = freq;
        const g = c.createGain();
        g.gain.value = vol;
        s.connect(f);
        f.connect(g);
        g.connect(c._out);
        s.start(t);
    }

    // Ogni volta un poco diverso (±3%), così non stanca
    function varia() { return 1 + (Math.random() - 0.5) * 0.06; }

    const VOCI = {
        tink: function (c, t) {
            campana(c, t, 1900 * varia(), [[1, 0.5, 1], [2.76, 0.26, 0.66], [5.4, 0.1, 0.36]], 0.16);
            colpo(c, t, 3500, 0.14, 0.006);
        },
        tonk: function (c, t) {
            campana(c, t, 640 * varia(), [[1, 0.55, 1], [2.4, 0.3, 0.7], [3.9, 0.14, 0.45], [6.1, 0.06, 0.3]], 0.3);
            campana(c, t, 160, [[1, 0.5, 0.35]], 0.12, 0.7);
            colpo(c, t, 2500, 0.12, 0.008);
        },
        close: function (c, t) {
            campana(c, t, 1250 * varia(), [[1, 0.42, 1], [2.76, 0.18, 0.55]], 0.14, 0.9);
            colpo(c, t, 3000, 0.08, 0.005);
        },
        tick: function (c, t) {
            campana(c, t, 2300 * varia(), [[1, 0.34, 1], [3.1, 0.12, 0.5]], 0.07);
            colpo(c, t, 4500, 0.1, 0.004);
        }
    };

    function suona(tipo) {
        if (muto) return;
        if (!ctx) ctx = nuovoContesto();
        if (!ctx) return;
        if (ctx.state === "suspended" && ctx.resume) ctx.resume();
        (VOCI[tipo] || VOCI.tink)(ctx, ctx.currentTime + 0.005);
    }

    function tipoDi(el) {
        for (let i = 0; i < REGOLE.length; i++) {
            if (el.closest(REGOLE[i][1])) return REGOLE[i][0];
        }
        return "tink";
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
            if (!muto) suona("tink");
        });
        mostra();
    }

    window.sfx = { play: suona, contesto: function () { return ctx; }, muto: function () { return muto; } };
})();
