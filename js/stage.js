// =========================================================
// Avanzamento dello stage, calcolato dalle date: lo usano la
// barra del livello, il sentiero dei falò e la scheda del
// personaggio.
// =========================================================

window.STAGE = (function () {
    "use strict";

    const start = new Date(2026, 8, 7);     // lunedì 7 settembre 2026
    const end = new Date(2026, 11, 23);     // mercoledì 23 dicembre 2026
    const totalWeeks = 16;
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();

    function monday(week) {
        return new Date(start.getTime() + (week - 1) * 7 * dayMs);
    }

    // Una settimana è completata dal sabato successivo al suo lunedì
    let completed = 0;
    for (let week = 1; week <= totalWeeks; week++) {
        const saturday = new Date(monday(week).getTime() + 5 * dayMs);
        if (today >= saturday) completed = week;
    }

    const started = today >= start;
    const finished = completed === totalWeeks;
    const level = Math.max(1, Math.min(completed + 1, totalWeeks));

    // Stato di una settimana: "done" (falò acceso), "current" (in corso) o "locked"
    function state(week) {
        if (week <= completed) return "done";
        if (week === completed + 1 && today >= monday(week)) return "current";
        return "locked";
    }

    const daysTotal = Math.round((end - start) / dayMs) + 1;
    const daysDone = Math.max(0, Math.min(daysTotal, Math.floor((today - start) / dayMs) + 1));

    return {
        totalWeeks: totalWeeks,
        completed: completed,
        started: started,
        finished: finished,
        level: level,
        levelLabel: finished ? "MAX" : String(level).padStart(2, "0"),
        state: state,
        daysTotal: daysTotal,
        daysDone: started ? daysDone : 0,
        daysLeft: Math.max(0, daysTotal - (started ? daysDone : 0))
    };
})();
