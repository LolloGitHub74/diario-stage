// =========================================================
// Passi del cavaliere: un colpo sordo ogni volta che un piede tocca terra.
// Non c'è un timer: ad ogni fotogramma si legge a che punto è l'animazione
// della camminata (lo dice il browser) e il suono parte quando l'animazione
// passa dal fotogramma in cui il piede atterra. Così sta sempre a tempo,
// anche se il computer rallenta o la scheda resta in secondo piano.
//
// Camminate:
//   .knight-walker.is-walking   nei mondi, tra un falò e l'altro (6 fotogrammi,
//                               animazione "knight-walk")
//   .char-knight                nella scheda "Chi sono" (14 fotogrammi,
//                               animazione "char-walk")
// I numeri in PASSI sono i fotogrammi in cui il piede atterra: due per giro.
// =========================================================

(function () {
    "use strict";

    const CAMMINATE = [
        { selettore: ".knight-walker.is-walking", animazione: "knight-walk", fotogrammi: 6, passi: [1, 4] },
        { selettore: ".char-knight", animazione: "char-walk", fotogrammi: 14, passi: [1, 8] }
    ];

    const ultimo = new WeakMap();      // l'ultimo fotogramma visto per ogni cavaliere

    function visibile(el) {
        return el.getClientRects().length > 0;
    }

    function controlla() {
        if (!window.sfx || window.sfx.muto()) return;
        CAMMINATE.forEach(function (c) {
            document.querySelectorAll(c.selettore).forEach(function (el) {
                if (!visibile(el)) { ultimo.delete(el); return; }
                const anim = el.getAnimations().find(function (a) { return a.animationName === c.animazione; });
                if (!anim || anim.playState !== "running" || anim.currentTime === null) { ultimo.delete(el); return; }
                const durata = anim.effect.getComputedTiming().duration;
                const t = Number(anim.currentTime) % durata;
                const f = Math.min(c.fotogrammi - 1, Math.floor(t / (durata / c.fotogrammi)));
                const prima = ultimo.get(el);
                ultimo.set(el, f);
                if (prima === undefined || prima === f) return;
                if (c.passi.indexOf(f) !== -1) window.sfx.play("passo");
            });
        });
    }

    let corre = false;
    function ciclo() {
        controlla();
        if (document.hidden) { corre = false; return; }
        requestAnimationFrame(ciclo);
    }
    function parti() {
        if (corre) return;
        corre = true;
        requestAnimationFrame(ciclo);
    }

    document.addEventListener("visibilitychange", function () { if (!document.hidden) parti(); });
    parti();

    window.passi = { _controlla: controlla };
})();
