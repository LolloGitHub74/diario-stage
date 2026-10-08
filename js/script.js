// Menu hamburger per mobile
document.addEventListener("DOMContentLoaded", function () {

    const menuToggle = document.querySelector(".menu-toggle");
    const navigation = document.querySelector(".navigation");

    if (menuToggle && navigation) {

        menuToggle.addEventListener("click", function () {
            menuToggle.classList.toggle("active");
            navigation.classList.toggle("active");
        });

        // Chiude il menu quando si clicca su un link
        navigation.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                menuToggle.classList.remove("active");
                navigation.classList.remove("active");
            });
        });
    }
});


// ---------------------------------------------------
// Pannelli della pagina progetto
// ---------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {

    const panels = document.querySelectorAll("dialog.panel");

    if (panels.length === 0) return;

    function openPanel(name) {
        const panel = document.getElementById("panel-" + name);
        if (!panel || panel.open) return;

        panel.showModal();
        panel.querySelector(".panel-inner").scrollTop = 0;
        document.documentElement.classList.add("panel-open");
    }

    // Ogni riquadro apre il pannello indicato in data-panel
    document.querySelectorAll("[data-panel]").forEach(function (tile) {
        tile.addEventListener("click", function () {
            openPanel(tile.dataset.panel);
        });
    });

    panels.forEach(function (panel) {

        // La X chiude il pannello
        panel.querySelectorAll("[data-close]").forEach(function (button) {
            button.addEventListener("click", function () {
                panel.close();
            });
        });

        // Un clic sullo sfondo scuro (fuori dal pannello) lo chiude
        panel.addEventListener("click", function (event) {
            if (event.target === panel) panel.close();
        });

        // Alla chiusura (X, clic fuori o tasto Esc) la pagina torna a scorrere
        panel.addEventListener("close", function () {
            document.documentElement.classList.remove("panel-open");
        });
    });

    // Un link come progetto.html#simulatore apre subito quel pannello
    if (location.hash) {
        openPanel(location.hash.slice(1));
    }
});
