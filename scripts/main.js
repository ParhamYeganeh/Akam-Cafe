
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#primary-navigation");

if (menuToggle && siteNav) {
    const setMenuState = (isOpen) => {
        siteNav.classList.toggle("is-open", isOpen);
        menuToggle.classList.toggle("is-active", isOpen);

        menuToggle.setAttribute("aria-expanded", String(isOpen));

        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "بستن منو" : "باز کردن منو"
        );
    };

    menuToggle.addEventListener("click", () => {
        const isOpen =
            menuToggle.getAttribute("aria-expanded") === "true";

        setMenuState(!isOpen);
    });

    // Close the menu after selecting a navigation link.
    siteNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            setMenuState(false);
        });
    });

    // Close the menu when clicking outside it.
    document.addEventListener("click", (event) => {
        const clickedInsideMenu = siteNav.contains(event.target);
        const clickedToggle = menuToggle.contains(event.target);

        if (!clickedInsideMenu && !clickedToggle) {
            setMenuState(false);
        }
    });

    // Allow keyboard users to close the menu with Escape.
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenuState(false);
        }
    });

    // Reset the mobile menu when returning to desktop width.
    const desktopMedia = window.matchMedia("(min-width: 851px)");

    desktopMedia.addEventListener("change", (event) => {
        if (event.matches) {
            setMenuState(false);
        }
    });
}



/* =========================================
   AKAM — SCROLL REVEAL
========================================= */

const revealElements = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window && revealElements.length > 0) {
    document.documentElement.classList.add("has-reveal");

    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.12,
            rootMargin: "0px 0px -25px 0px"
        }
    );

    revealElements.forEach((element) => {
        revealObserver.observe(element);
    });
} else {
    revealElements.forEach((element) => {
        element.classList.add("is-visible");
    });
}

// Keep the copyright year updated on every page.
document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});