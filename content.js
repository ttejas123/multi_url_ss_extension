(() => {
    const killModals = () => {
        if (!document.body || !document.documentElement) return;

        /* 1️⃣ Remove known modal / overlay roles */
        document.querySelectorAll(
            `
        [role="dialog"],
        [aria-modal="true"],
        dialog,
        iframe[src*="consent"],
        iframe[src*="privacy"]
        `
        ).forEach(el => el.remove());

        /* 2️⃣ Remove high z-index fixed elements (even small ones) */
        document.querySelectorAll("div,section,aside").forEach(el => {
            if (!el || !el.parentNode) return;

            let style;
            try {
                style = getComputedStyle(el);
            } catch {
                return;
            }

            const z = parseInt(style.zIndex || "0");

            const isBlocking =
                style.position === "fixed" &&
                z > 500 &&
                style.pointerEvents !== "none";

            if (isBlocking) {
                el.remove();
            }
        });

        /* 3️⃣ Remove full-screen backdrops */
        document.querySelectorAll("div").forEach(el => {
            const style = getComputedStyle(el);

            const isBackdrop =
                style.position === "fixed" &&
                style.top === "0px" &&
                style.left === "0px" &&
                el.offsetWidth >= window.innerWidth &&
                el.offsetHeight >= window.innerHeight &&
                style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
                style.opacity !== "0";

            if (isBackdrop) {
                el.remove();
            }
        });

        /* 4️⃣ Force unlock scroll & pointer events */
        document.body.style.setProperty("overflow", "auto", "important");
        document.documentElement.style.setProperty("overflow", "auto", "important");
        document.body.style.setProperty("pointer-events", "auto", "important");

        /* 5️⃣ Disable modal locks */
        document.body.classList.remove(
            "ReactModal__Body--open",
            "modal-open",
            "overflow-hidden",
            "no-scroll"
        );
    };

    /* Run immediately */
    killModals();

    /* Kill future injections */
    new MutationObserver(killModals).observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    console.log("[Popup Killer] HARD MODE ACTIVE");
})();
