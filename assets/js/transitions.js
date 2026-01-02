/* ============================================
   PAGE TRANSITION LOGIC
   Handles smooth fade-in/out between pages
   ============================================ */

(function () {
    // Inject the transition overlay HTML if it doesn't exist
    function injectOverlay() {
        const existing = document.querySelector('.page-transition');
        if (existing) return existing;

        const overlay = document.createElement('div');
        overlay.className = 'page-transition';
        overlay.innerHTML = `
            <div class="page-skeleton-wrapper">
                <div class="skeleton-nav-strip skeleton">
                    <div class="skeleton-nav-circle"></div>
                    <div class="skeleton-nav-line"></div>
                    <div class="skeleton-nav-line"></div>
                    <div class="skeleton-nav-line"></div>
                </div>
                <div class="skeleton-hero-block skeleton">
                    <div class="skeleton-hero-line-1"></div>
                    <div class="skeleton-hero-line-2"></div>
                    <div class="skeleton-hero-btn"></div>
                </div>
                <div class="skeleton-grid-placeholder">
                    <div class="skeleton-grid-item skeleton"></div>
                    <div class="skeleton-grid-item skeleton"></div>
                    <div class="skeleton-grid-item skeleton"></div>
                </div>
            </div>
        `;
        document.body.prepend(overlay);
        return overlay;
    }

    function initTransitions() {
        const overlay = injectOverlay();

        function hideOverlay() {
            if (overlay && !overlay.classList.contains('loaded')) {
                overlay.classList.add('loaded');
            }
        }

        // Fade out overlay when page is fully loaded
        window.addEventListener('load', () => {
            setTimeout(hideOverlay, 100);
        });

        // Failsafe: hide overlay after 3 seconds anyway
        setTimeout(hideOverlay, 3000);

        // Handle internal navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            const target = link.getAttribute('target');

            // Re-check for internal link
            if (href &&
                !href.startsWith('http') &&
                !href.startsWith('#') &&
                !href.startsWith('mailto:') &&
                !href.startsWith('tel:') &&
                (!target || target === '_self')) {

                // Don't intercept if it's the same page anchor
                if (href.includes('#') && href.split('#')[0] === window.location.pathname.split('/').pop()) return;

                e.preventDefault();

                if (overlay) {
                    overlay.classList.remove('loaded');
                }

                setTimeout(() => {
                    window.location.href = href;
                }, 300); // Matches CSS transition duration
            }
        });

        // Handle back button (popstate)
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                if (overlay) {
                    overlay.classList.add('loaded');
                }
            }
        });
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTransitions);
    } else {
        initTransitions();
    }
})();
