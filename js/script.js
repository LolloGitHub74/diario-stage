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
