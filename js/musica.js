// =========================================================
// Musica di sottofondo: una marcia chiptune in stile RPG, scritta nel codice
// (Web Audio), senza file da scaricare. Va in loop senza salti: ogni battuta
// viene pianificata poco prima di suonare, quindi pesa pochissimo.
//
// Parte quando, dopo START, si apre il secondo cerchio sulla home
// (l'evento "diario:musica" lo manda home.js). Se la schermata START non
// compare (visite successive nella stessa sessione), parte al primo clic.
// Si ferma con l'interruttore dell'audio e quando la scheda non è visibile.
// =========================================================

(function () {
    "use strict";

    const BPM = 124;
    const BEAT = 60 / BPM;
    const BAR = BEAT * 4;
    const VOLUME = 0.14;     // sotto ai clic
    const ENTRATA = 2.5;     // dissolvenza in entrata, in secondi

    // Quattro battute di accordi, ripetute con variazioni: 16 battute in tutto
    const ACCORDI = ["C", "Am", "F", "G", "C", "Am", "F", "G", "Am", "F", "C", "G", "F", "G", "C", "G"];
    const MELODIA = [
        "G4 1.5, E4 0.5, G4 1, C5 1", "A4 1, C5 1, E5 1.5, D5 0.5", "C5 1.5, A4 0.5, F4 1, A4 1", "D5 1, G4 1, B4 1, D5 1",
        "E5 1.5, D5 0.5, C5 1, G4 1", "G4 1, B4 1, E5 1.5, B4 0.5", "A4 1, C5 1, F5 1.5, E5 0.5", "D5 2, B4 1, D5 1",
        "E5 1.5, C5 0.5, A4 1, C5 1", "F5 1.5, E5 0.5, D5 1, C5 1", "E5 1, G5 1.5, E5 0.5, C5 1", "D5 1, B4 1, G4 1, B4 1",
        "A4 1, C5 1, F5 1, E5 1", "D5 1.5, B4 0.5, D5 1, G5 1", "E5 1, G5 1, C6 2", "B5 1, G5 1, D5 1, B4 1"
    ].map(function (battuta) {
        return battuta.split(", ").map(function (n) { const p = n.split(" "); return [p[0], Number(p[1])]; });
    });
    const MIX = { lead: 0.25, basso: 0.22, arp: 0.085, perc: 0.45, hat: 0.1 };

    const PC = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
    const midi = function (nome) {
        const m = /^([A-G]#?)(\d)$/.exec(nome);
        return 12 * (Number(m[2]) + 1) + PC[m[1]];
    };
    const hz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

    // "Am" → nota del basso e triade nel registro medio
    function accordo(nome) {
        const minore = /m$/.test(nome);
        const pc = PC[nome.replace(/m$/, "")];
        let basso = 36 + pc; if (basso > 47) basso -= 12;
        let alto = 60 + pc; if (pc > 6) alto -= 12;
        return { basso: basso, tono: [alto, alto + (minore ? 3 : 4), alto + 7] };
    }

    // ---------- strumenti ----------

    const onde = {};
    function pulsa(ctx, duty) {
        if (onde[duty]) return onde[duty];
        const N = 48, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
        for (let n = 1; n <= N; n++) {
            re[n] = (2 / (n * Math.PI)) * Math.sin(2 * Math.PI * n * duty);
            im[n] = (2 / (n * Math.PI)) * (1 - Math.cos(2 * Math.PI * n * duty));
        }
        return (onde[duty] = ctx.createPeriodicWave(re, im));
    }

    let rumore = null;
    function bufferRumore(ctx) {
        if (rumore) return rumore;
        const n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
        let seme = 12345;
        for (let i = 0; i < n; i++) { seme = (seme * 1664525 + 1013904223) >>> 0; d[i] = seme / 2147483648 - 1; }
        return (rumore = b);
    }

    function nota(ctx, out, t, durata, m, o) {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        if (o.triangolo) osc.type = "triangle"; else osc.setPeriodicWave(pulsa(ctx, o.duty));
        osc.frequency.value = hz(m);
        const fine = t + durata * o.legato;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(o.vol, t + 0.006);
        g.gain.setValueAtTime(o.vol, Math.max(t + 0.02, fine - 0.02));
        g.gain.exponentialRampToValueAtTime(0.0001, fine + 0.03);
        osc.connect(g);
        g.connect(out);
        if (o.vib && durata > 0.45) {
            const lfo = ctx.createOscillator(), lg = ctx.createGain();
            lfo.frequency.value = 5.5;
            lg.gain.setValueAtTime(0, t);
            lg.gain.linearRampToValueAtTime(o.vib, t + 0.28);
            lfo.connect(lg);
            lg.connect(osc.detune);
            lfo.start(t);
            lfo.stop(fine + 0.05);
        }
        osc.start(t);
        osc.stop(fine + 0.06);
    }

    function colpo(ctx, out, t, tipo, vol) {
        if (tipo === "kick") {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.frequency.setValueAtTime(160, t);
            o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
            o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.17);
            return;
        }
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = bufferRumore(ctx);
        if (tipo === "snare") {
            f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = 0.7;
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
        } else {
            f.type = "highpass"; f.frequency.value = 5200;
            g.gain.setValueAtTime(vol * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        }
        s.connect(f); f.connect(g); g.connect(out);
        s.start(t, 0.1 * Math.random());
        s.stop(t + 0.14);
    }

    // Una battuta: basso a marcia, arpeggio, tamburi e melodia
    function battuta(ctx, vie, b, t) {
        const a = accordo(ACCORDI[b]);
        const quinta = a.basso + 7 > 50 ? a.basso - 5 : a.basso + 7;
        [a.basso, quinta, a.basso, quinta].forEach(function (m, i) {
            nota(ctx, vie.out, t + i * BEAT, BEAT, m, { triangolo: true, vol: MIX.basso, legato: 0.9 });
        });
        [0, 1, 2, 1, 0, 1, 2, 1].forEach(function (k, i) {
            nota(ctx, vie.out, t + i * BEAT / 2, BEAT / 2, a.tono[k], { duty: 0.125, vol: MIX.arp, legato: 0.9 });
        });
        [[0, "kick"], [1, "snare"], [2, "kick"], [3, "snare"]].forEach(function (c) { colpo(ctx, vie.out, t + c[0] * BEAT, c[1], MIX.perc); });
        for (let i = 0; i < 8; i++) colpo(ctx, vie.out, t + i * BEAT / 2, "hat", MIX.hat);
        let x = 0;
        MELODIA[b].forEach(function (n) {
            nota(ctx, vie.lead, t + x * BEAT, n[1] * BEAT, midi(n[0]), { duty: 0.25, vol: MIX.lead, vib: 12, legato: 0.94 });
            x += n[1];
        });
    }

    // ---------- avvio, loop, pausa ----------

    let ctx = null;
    let vie = null;          // i canali della musica in corso: { master, out, lead }
    let timer = null;
    let prossima = 0;
    let numero = 0;
    let voluta = false;      // la musica è stata richiesta (anche se ora è muta)

    function costruisciVie(c) {
        const master = c.createGain(), out = c.createGain(), lead = c.createGain();
        const eco = c.createDelay(1), ritorno = c.createGain(), misto = c.createGain();
        master.gain.setValueAtTime(0.0001, c.currentTime);
        master.gain.linearRampToValueAtTime(VOLUME, c.currentTime + ENTRATA);
        out.connect(master);
        lead.connect(out);
        eco.delayTime.value = BEAT * 0.75; ritorno.gain.value = 0.28; misto.gain.value = 0.22;   // eco sulla melodia
        lead.connect(eco); eco.connect(ritorno); ritorno.connect(eco); eco.connect(misto); misto.connect(out);
        master.connect(c.destination);
        return { master: master, out: out, lead: lead };
    }

    function pianifica() {
        if (!ctx || !vie) return;
        while (prossima < ctx.currentTime + 1.5) {
            battuta(ctx, vie, numero % ACCORDI.length, prossima);
            prossima += BAR;
            numero += 1;
        }
    }

    function avvia() {
        voluta = true;
        if (timer || !window.sfx || window.sfx.muto()) return;
        ctx = window.sfx.ctx();
        if (!ctx) return;
        vie = costruisciVie(ctx);
        prossima = ctx.currentTime + 0.12;
        numero = 0;
        pianifica();
        timer = setInterval(pianifica, 250);
    }

    function ferma() {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
        const vecchie = vie;
        vie = null;
        if (vecchie && ctx) {
            vecchie.master.gain.cancelScheduledValues(ctx.currentTime);
            vecchie.master.gain.setValueAtTime(vecchie.master.gain.value, ctx.currentTime);
            vecchie.master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
            setTimeout(function () { try { vecchie.master.disconnect(); } catch (e) { /* già staccato */ } }, 2500);
        }
    }

    window.addEventListener("diario:musica", avvia);
    window.addEventListener("diario:audio", function (event) {
        if (event.detail && event.detail.muto) ferma(); else if (voluta) avvia();
    });

    // A scheda nascosta tutto tace e non consuma; al ritorno riparte da dove era
    document.addEventListener("visibilitychange", function () {
        if (!ctx) return;
        if (document.hidden) { if (ctx.suspend) ctx.suspend(); } else if (ctx.resume) ctx.resume();
    });

    // Senza la schermata START (stessa sessione, altra visita) parte al primo gesto
    if (!document.documentElement.classList.contains("show-start")) {
        const primo = function () {
            document.removeEventListener("click", primo, true);
            document.removeEventListener("keydown", primo, true);
            avvia();
        };
        document.addEventListener("click", primo, true);
        document.addEventListener("keydown", primo, true);
    }

    window.musica = { avvia: avvia, ferma: ferma, _battuta: battuta, _vie: costruisciVie, BAR: BAR, N: ACCORDI.length };
})();
