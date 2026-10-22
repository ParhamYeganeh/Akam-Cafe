
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // =========================================
    // 1. SELECT ELEMENTS
    // =========================================

    const categoryNav = document.querySelector(".menu-categories");

    const categoryLinks = [
        ...document.querySelectorAll(".menu-category")
    ];

    const menuSections = [
        ...document.querySelectorAll(".menu-section")
    ];

    const heroImages = document.querySelectorAll(".menu-intro__image");

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    // Load the latest prices from the backend. The values written in the
    // HTML remain a fallback when this page is hosted without the API
    // (for example, on GitHub Pages before the backend is deployed).
    async function loadPublicMenuPrices() {
        const priceElements = document.querySelectorAll("[data-price-id]");

        if (priceElements.length === 0) {
            return;
        }

        try {
            const response = await fetch("/api/menu-prices", {
                method: "GET",
                headers: { Accept: "application/json" },
                cache: "no-store"
            });

            if (!response.ok) {
                return;
            }

            const payload = await response.json();

            if (!payload || !Array.isArray(payload.items)) {
                return;
            }

            const pricesById = new Map(
                payload.items
                    .filter((item) => item && typeof item.id === "string")
                    .map((item) => [item.id, String(item.value ?? "")])
            );

            priceElements.forEach((element) => {
                const price = pricesById.get(element.dataset.priceId);

                if (typeof price === "string" && price.trim() !== "") {
                    element.textContent = price;
                }
            });
        } catch {
            // Keep the static HTML prices if the backend is unavailable.
        }
    }

    loadPublicMenuPrices();

    
    // Back to the top of the menu page
    const backToTopButton = document.querySelector(".menu-back-top");

    if (backToTopButton) {
        backToTopButton.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: reduceMotion.matches ? "auto" : "smooth"
            });
        });
    }

    


    // =========================================
    // 2. HERO IMAGE FALLBACK
    // =========================================

    heroImages.forEach((image) => {
        const showImage = () => {
            if (image.naturalWidth > 0) {
                image.classList.add("is-loaded");
            }
        };

        image.addEventListener("load", showImage);

        image.addEventListener("error", () => {
            image.classList.remove("is-loaded");
        });

        // Handle cached images.
        if (image.complete) {
            showImage();
        }
    });

    // Stop if navigation elements are unavailable.
    if (
        !categoryNav ||
        categoryLinks.length === 0 ||
        menuSections.length === 0
    ) {
        return;
    }

    // =========================================
    // 3. MAP CATEGORIES TO SECTIONS
    // =========================================

    const sectionMap = new Map();

    categoryLinks.forEach((link) => {
        const href = link.getAttribute("href");

        if (!href || !href.startsWith("#")) {
            return;
        }

        const targetId = href.slice(1);
        const section = document.getElementById(targetId);

        if (section) {
            sectionMap.set(section, link);
        }
    });

    // =========================================
    // 4. STATE
    // =========================================

    let activeSection = null;
    let pendingSection = null;

    let scrollFrame = null;
    let pendingTimer = null;

    // =========================================
    // 5. NAVIGATION METRICS
    // =========================================

    function getNavigationMetrics() {
        const navStyles = window.getComputedStyle(categoryNav);

        const stickyTop =
            Number.parseFloat(navStyles.top) || 0;

        const navHeight =
            categoryNav.getBoundingClientRect().height;

        const gap = 18;

        return {
            stickyTop,
            navHeight,
            gap,

            // Vertical position where a section is considered active.
            activationLine: stickyTop + navHeight + gap + 6,

            // Expected position of a section after clicking its category.
            targetTop: stickyTop + navHeight + gap
        };
    }

    // =========================================
    // 6. ACTIVE CATEGORY STYLING
    // =========================================

    function setActiveCategory(section) {
        if (!section || !sectionMap.has(section)) {
            return;
        }

        const activeLink = sectionMap.get(section);

        if (activeSection === section) {
            return;
        }

        activeSection = section;

        categoryLinks.forEach((link) => {
            const isActive = link === activeLink;

            link.classList.toggle("is-active", isActive);

            if (isActive) {
                link.setAttribute("aria-current", "location");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        // Scroll the category bar horizontally only.
        revealActiveCategory(activeLink);
    }

    // =========================================
    // 7. HORIZONTAL CATEGORY VISIBILITY
    // =========================================

    function revealActiveCategory(link) {
        if (!link) {
            return;
        }

        // Desktop navigation may show every category.
        if (
            categoryNav.scrollWidth <=
            categoryNav.clientWidth + 2
        ) {
            return;
        }

        const navRect = categoryNav.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();

        const edgeGap = 12;

        let delta = 0;

        if (linkRect.left < navRect.left + edgeGap) {
            delta = linkRect.left - navRect.left - edgeGap;
        } else if (linkRect.right > navRect.right - edgeGap) {
            delta = linkRect.right - navRect.right + edgeGap;
        }

        if (delta !== 0) {
            categoryNav.scrollBy({
                left: delta,
                behavior: reduceMotion.matches ? "auto" : "smooth"
            });
        }
    }

    // =========================================
    // 8. CLEAR PENDING NAVIGATION
    // =========================================

    function clearPendingNavigation() {
        pendingSection = null;

        if (pendingTimer !== null) {
            window.clearTimeout(pendingTimer);
            pendingTimer = null;
        }
    }

    // =========================================
    // 9. SCROLL TO A SECTION
    // =========================================

    function scrollToSection(section, options = {}) {
        if (!section || !sectionMap.has(section)) {
            return;
        }

        const { instant = false, updateHash = false } = options;

        // Immediately highlight the category the user selected.
        pendingSection = section;
        setActiveCategory(section);

        if (updateHash) {
            history.replaceState(null, "", `#${section.id}`);
        }

        if (pendingTimer !== null) {
            window.clearTimeout(pendingTimer);
            pendingTimer = null;
        }

        requestAnimationFrame(() => {
            // Measure after the current layout has settled.
            const { stickyTop, navHeight, gap } =
                getNavigationMetrics();

            const sectionTop =
                window.scrollY +
                section.getBoundingClientRect().top;

            const destination =
                sectionTop - stickyTop - navHeight - gap;

            window.scrollTo({
                top: Math.max(0, destination),
                behavior: instant || reduceMotion.matches
                    ? "auto"
                    : "smooth"
            });

            // Instant navigation can settle immediately.
            if (instant || reduceMotion.matches) {
                pendingTimer = window.setTimeout(() => {
                    clearPendingNavigation();
                    updateActiveSection();
                }, 80);

                return;
            }

            // Safety fallback if a scrollend event is unavailable.
            pendingTimer = window.setTimeout(() => {
                clearPendingNavigation();
                updateActiveSection();
            }, 3000);
        });
    }

    // =========================================
    // 10. DETERMINE ACTIVE SECTION
    // =========================================

    function updateActiveSection() {
        const metrics = getNavigationMetrics();

        // While smooth scrolling to a chosen category,
        // don't let intermediate sections overwrite its highlight.
        if (pendingSection) {
            const actualTop =
                pendingSection.getBoundingClientRect().top;

            const distanceFromTarget =
                Math.abs(actualTop - metrics.targetTop);

            if (distanceFromTarget <= 40) {
                clearPendingNavigation();
            } else {
                setActiveCategory(pendingSection);
                return;
            }
        }

        let currentSection = menuSections[0];

        for (const section of menuSections) {
            const sectionTop =
                section.getBoundingClientRect().top;

            if (sectionTop <= metrics.activationLine) {
                currentSection = section;
            } else {
                break;
            }
        }

        setActiveCategory(currentSection);
    }

    // =========================================
    // 11. THROTTLED SCROLL UPDATES
    // =========================================

    function scheduleActiveSectionUpdate() {
        if (scrollFrame !== null) {
            return;
        }

        scrollFrame = requestAnimationFrame(() => {
            scrollFrame = null;
            updateActiveSection();
        });
    }

    window.addEventListener("scroll", scheduleActiveSectionUpdate, {
        passive: true
    });

    window.addEventListener("resize", scheduleActiveSectionUpdate);

    window.addEventListener("load", scheduleActiveSectionUpdate);

    // Modern browsers fire scrollend when scrolling finishes.
    window.addEventListener("scrollend", () => {
        if (!pendingSection) {
            updateActiveSection();
            return;
        }

        const target = pendingSection;
        const { targetTop } = getNavigationMetrics();

        const isAtTarget =
            Math.abs(target.getBoundingClientRect().top - targetTop) <= 40;

        clearPendingNavigation();

        if (isAtTarget) {
            setActiveCategory(target);
        } else {
            updateActiveSection();
        }
    });

    // =========================================
    // 12. CATEGORY CLICK HANDLERS
    // =========================================

    categoryLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            const href = link.getAttribute("href");

            if (!href || !href.startsWith("#")) {
                return;
            }

            const section = document.getElementById(href.slice(1));

            if (!section || !sectionMap.has(section)) {
                return;
            }

            event.preventDefault();

            scrollToSection(section, {
                updateHash: true
            });
        });
    });

    // =========================================
    // 13. INITIAL PAGE POSITION
    // =========================================

    const initialId = window.location.hash.slice(1);

    const initialSection = initialId
        ? document.getElementById(initialId)
        : null;

    if (initialSection && sectionMap.has(initialSection)) {
        // Support direct links such as #tea-bar.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                scrollToSection(initialSection, {
                    instant: true
                });
            });
        });
    } else {
        // Default to the first menu category.
        setActiveCategory(menuSections[0]);

        requestAnimationFrame(() => {
            updateActiveSection();
        });
    }
});

    // Handle hot-drink product images
    const hotDrinkImages = document.querySelectorAll(
        ".hot-drink-card__image"
    );

    hotDrinkImages.forEach((image) => {
        const media = image.closest(".hot-drink-card__media");

        if (!media) return;

        const updateImageState = () => {
            if (image.naturalWidth > 0) {
                media.classList.add("is-loaded");
            } else {
                media.classList.remove("is-loaded");
            }
        };

        image.addEventListener("load", updateImageState);
        image.addEventListener("error", updateImageState);

        // Also handle images that finished loading before this code ran.
        if (image.complete) {
            updateImageState();
        }
    });

    
    // Handle brewed-coffee images
    const brewImages = document.querySelectorAll(".brew-card__image");

    brewImages.forEach((image) => {
        const media = image.closest(".brew-card__media");

        if (!media) return;

        const updateImageState = () => {
            if (image.naturalWidth > 0) {
                media.classList.add("is-loaded");
            } else {
                media.classList.remove("is-loaded");
            }
        };

        image.addEventListener("load", updateImageState);
        image.addEventListener("error", updateImageState);

        // Handle images that have already finished loading.
        if (image.complete) {
            updateImageState();
        }
    });

    // Handle Tea Bar product images
    const teaImages = document.querySelectorAll(".tea-card__image");

    teaImages.forEach((image) => {
        const media = image.closest(".tea-card__media");

        if (!media) return;

        const updateImageState = () => {
            media.classList.toggle("is-loaded", image.naturalWidth > 0);
        };

        image.addEventListener("load", updateImageState);
        image.addEventListener("error", updateImageState);

        // Support images that loaded before the listeners were attached.
        if (image.complete) {
            updateImageState();
        }
    });

    
    // Handle cold-drink product images
    const coldImages = document.querySelectorAll(".cold-card__image");

    coldImages.forEach((image) => {
        const media = image.closest(".cold-card__media");

        if (!media) return;

        const updateImageState = () => {
            media.classList.toggle("is-loaded", image.naturalWidth > 0);
        };

        image.addEventListener("load", updateImageState);
        image.addEventListener("error", updateImageState);

        // Handle images that have already completed loading.
        if (image.complete) {
            updateImageState();
        }
    });

    // Handle dietary and protein product images
    const dietImages = document.querySelectorAll(".diet-card__image");

    dietImages.forEach((image) => {
        const media = image.closest(".diet-card__media");

        if (!media) return;

        const updateImageState = () => {
            media.classList.toggle("is-loaded", image.naturalWidth > 0);
        };

        image.addEventListener("load", updateImageState);
        image.addEventListener("error", updateImageState);

        if (image.complete) {
            updateImageState();
        }
    });

    // Handle cake and dessert images
    const dessertImages = document.querySelectorAll(
        ".dessert-card__image"
    );

    dessertImages.forEach((image) => {
        const media = image.closest(".dessert-card__media");

        if (!media) return;

        const updateImageState = () => {
            media.classList.toggle(
                "is-loaded",
                image.naturalWidth > 0
            );
        };

        image.addEventListener("load", updateImageState);
        image.addEventListener("error", updateImageState);

        // Handle images that completed loading before initialization.
        if (image.complete) {
            updateImageState();
        }
    });
