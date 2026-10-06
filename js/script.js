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


    // ---------------------------------------------------
    // Slider del diario settimanale
    // ---------------------------------------------------

    const sliderWindow = document.querySelector(".slider-window");
    const sliderTrack = document.querySelector(".slider-track");
    const prevButton = document.querySelector(".slider-button.previous");
    const nextButton = document.querySelector(".slider-button.next");
    const dotsContainer = document.querySelector(".slider-dots");

    if (sliderWindow && sliderTrack) {

        const cards = Array.from(sliderTrack.children);
        const gap = 25; // deve corrispondere al "gap" del CSS (.slider-track)

        let currentIndex = 0;

        // Durante lo scorrimento avviato dalle frecce, la posizione
        // intermedia non deve cambiare la card corrente
        let scrollTarget = null;
        let scrollTargetTimer = null;

        // Quante card stanno interamente nella finestra visibile, in base
        // alla larghezza attuale dello schermo (1 su mobile, 2 su tablet, ecc.)
        function getVisibleCount() {
            const cardWidth = cards[0].getBoundingClientRect().width;
            const windowWidth = sliderWindow.getBoundingClientRect().width;
            return Math.max(1, Math.round((windowWidth + gap) / (cardWidth + gap)));
        }

        // L'ultima posizione valida, oltre la quale non si può scorrere
        function getMaxIndex() {
            return Math.max(0, cards.length - getVisibleCount());
        }

        // Distanza tra l'inizio di una card e quella successiva
        function getStep() {
            return cards[0].getBoundingClientRect().width + gap;
        }

        // Aggiorna frecce e pallini in base alla posizione attuale
        function updateControls() {
            const maxIndex = getMaxIndex();

            if (prevButton) prevButton.disabled = currentIndex === 0;
            if (nextButton) nextButton.disabled = currentIndex >= maxIndex;

            updateDots();
        }

        // Scorre la finestra fino alla card indicata
        function goToIndex(index) {
            const maxIndex = getMaxIndex();
            currentIndex = Math.min(Math.max(index, 0), maxIndex);

            scrollTarget = Math.min(currentIndex * getStep(), sliderWindow.scrollWidth - sliderWindow.clientWidth);
            clearTimeout(scrollTargetTimer);
            scrollTargetTimer = setTimeout(function () { scrollTarget = null; }, 700);

            sliderWindow.scrollTo({ left: scrollTarget });

            updateControls();
        }

        // Quando si scorre con il dito o con il trackpad, capisce
        // quale card è arrivata in prima posizione
        sliderWindow.addEventListener("scroll", function () {
            if (scrollTarget !== null) {
                if (Math.abs(sliderWindow.scrollLeft - scrollTarget) < 2) scrollTarget = null;
                return;
            }

            const index = Math.round(sliderWindow.scrollLeft / getStep());
            const maxIndex = getMaxIndex();

            // A fine corsa l'ultima posizione potrebbe non essere un multiplo esatto
            const atEnd = sliderWindow.scrollLeft + sliderWindow.clientWidth >= sliderWindow.scrollWidth - 2;
            const newIndex = atEnd ? maxIndex : Math.min(index, maxIndex);

            if (newIndex !== currentIndex) {
                currentIndex = newIndex;
                updateControls();
            }
        });

        // Ricrea i pallini: uno per ogni posizione raggiungibile dallo slider
        function buildDots() {
            if (!dotsContainer) return;

            dotsContainer.innerHTML = "";
            const maxIndex = getMaxIndex();

            for (let i = 0; i <= maxIndex; i++) {
                const dot = document.createElement("span");
                dot.classList.add("dot");
                dot.addEventListener("click", function () {
                    goToIndex(i);
                });
                dotsContainer.appendChild(dot);
            }

            updateDots();
        }

        function updateDots() {
            if (!dotsContainer) return;

            const dots = dotsContainer.querySelectorAll(".dot");
            dots.forEach(function (dot, i) {
                dot.classList.toggle("active", i === currentIndex);
            });
        }

        if (prevButton) {
            prevButton.addEventListener("click", function () {
                goToIndex(currentIndex - 1);
            });
        }

        if (nextButton) {
            nextButton.addEventListener("click", function () {
                goToIndex(currentIndex + 1);
            });
        }

        // Se la finestra viene ridimensionata (es. rotazione del telefono,
        // o resize della finestra su desktop), ricalcola tutto da capo
        window.addEventListener("resize", function () {
            buildDots();
            goToIndex(currentIndex);
        });

        buildDots();
        goToIndex(0);
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


// ---------------------------------------------------
// Stile pixel: lettere animate, sfondo e livelli
// ---------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Divide il testo in parole e lettere, così ogni lettera può animarsi
    // da sola. Le parole restano intere per non andare a capo a metà.
    function splitChars(element) {
        let index = 0;

        function walk(node) {
            Array.from(node.childNodes).forEach(function (child) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const fragment = document.createDocumentFragment();

                    child.textContent.split(/(\s+)/).forEach(function (part) {
                        if (part === "") return;

                        if (/^\s+$/.test(part)) {
                            fragment.appendChild(document.createTextNode(" "));
                            return;
                        }

                        const word = document.createElement("span");
                        word.className = "word";

                        Array.from(part).forEach(function (letter) {
                            const char = document.createElement("span");
                            char.className = "char";
                            char.textContent = letter;
                            char.style.setProperty("--i", index++);
                            word.appendChild(char);
                        });

                        fragment.appendChild(word);
                    });

                    child.replaceWith(fragment);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    walk(child);
                }
            });
        }

        walk(element);
        return index;
    }

    document.querySelectorAll("[data-wave], [data-type]").forEach(function (element) {
        const letters = splitChars(element);

        // Il titolo principale si scrive lettera per lettera
        if (element.hasAttribute("data-type") && !reduceMotion) {
            const caret = document.createElement("span");
            caret.className = "type-caret";
            caret.setAttribute("aria-hidden", "true");
            element.appendChild(caret);

            element.classList.add("typing");
            setTimeout(function () {
                element.classList.remove("typing");
            }, letters * 45 + 100);
        }
    });


    // Quadratini che lampeggiano piano sullo sfondo
    const field = document.createElement("div");
    field.className = "pixel-field";
    field.setAttribute("aria-hidden", "true");

    const colors = ["#0000d0", "#1fc8ff", "#ff4f8b", "#ffcf33", "#0000d0"];
    const sizes = [8, 12, 16, 24];

    for (let i = 0; i < 36; i++) {
        const pixel = document.createElement("span");
        pixel.style.left = (Math.random() * 100) + "%";
        pixel.style.top = (Math.random() * 100) + "%";
        pixel.style.setProperty("--size", sizes[i % sizes.length] + "px");
        pixel.style.setProperty("--color", colors[i % colors.length]);
        pixel.style.setProperty("--speed", (2 + Math.random() * 4) + "s");
        pixel.style.setProperty("--delay", (-Math.random() * 6) + "s");
        field.appendChild(pixel);
    }

    document.body.prepend(field);


    // Livello ed esperienza calcolati dalle date dello stage:
    // ogni settimana è completata dal sabato successivo al suo lunedì
    const stageStart = new Date(2026, 8, 7);
    const totalWeeks = 16;
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();

    let completed = 0;
    for (let week = 1; week <= totalWeeks; week++) {
        const saturday = new Date(stageStart.getTime() + ((week - 1) * 7 + 5) * dayMs);
        if (today >= saturday) completed = week;
    }

    const level = Math.min(completed + 1, totalWeeks);
    const finished = completed === totalWeeks;

    const levelValue = document.querySelector("[data-level]");
    const xpValue = document.querySelector("[data-xp]");
    const xpBar = document.querySelector(".xp-bar");
    const xpFill = document.querySelector(".xp-fill");

    if (levelValue) levelValue.textContent = finished ? "MAX" : String(level).padStart(2, "0");
    if (xpValue) xpValue.textContent = completed;
    if (xpBar) xpBar.setAttribute("aria-valuenow", completed);
    if (xpFill) xpFill.style.setProperty("--xp", (completed / totalWeeks * 100) + "%");

    // Stato di ogni livello: completato, in corso o bloccato
    document.querySelectorAll(".week-card[data-week]").forEach(function (card) {
        const week = Number(card.dataset.week);
        const state = card.querySelector(".week-state");
        const monday = new Date(stageStart.getTime() + (week - 1) * 7 * dayMs);

        if (week <= completed) {
            card.classList.add("is-done");
            if (state) state.textContent = "COMPLETATO";
        } else if (week === completed + 1 && today >= monday) {
            card.classList.add("is-current");
            if (state) state.textContent = "IN CORSO";
        } else {
            card.classList.add("is-locked");
            if (state) state.textContent = "BLOCCATO";
        }
    });
});
