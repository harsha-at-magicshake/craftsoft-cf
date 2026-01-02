/* ============================================
   PAGE TRANSITION LOGIC
   Handles smooth fade-in/out between pages
   ============================================ */

(function () {
    // Inject the transition overlay HTML if it doesn't exist
    function injectOverlay(targetHref = '') {
        const existing = document.querySelector('.page-transition');
        const overlay = existing || document.createElement('div');

        if (!existing) {
            overlay.className = 'page-transition';
            document.body.prepend(overlay);
        }

        // Determine look based on target URL
        const isCoursePage = targetHref.includes('/courses/') || window.location.pathname.includes('/courses/');

        let skeletonHtml = `
            <div class="page-skeleton-wrapper">
                <div class="skeleton-nav-strip skeleton">
                    <div class="skeleton-nav-circle"></div>
                    <div class="skeleton-nav-line"></div>
                    <div class="skeleton-nav-line"></div>
                </div>`;

        if (isCoursePage) {
            skeletonHtml += `
                <div class="skeleton-breadcrumbs skeleton"></div>
                <div class="skeleton-hero-block skeleton">
                    <div class="skeleton-hero-line-1"></div>
                    <div class="skeleton-hero-line-2"></div>
                    <div class="skeleton-hero-btn"></div>
                </div>
                <div class="skeleton-tabs">
                    <div class="skeleton-tab skeleton"></div>
                    <div class="skeleton-tab skeleton"></div>
                    <div class="skeleton-tab skeleton"></div>
                </div>
                <div class="skeleton-module-list">
                    <div class="skeleton-module-item skeleton"></div>
                    <div class="skeleton-module-item skeleton"></div>
                    <div class="skeleton-module-item skeleton"></div>
                </div>`;
        } else {
            skeletonHtml += `
                <div class="skeleton-hero-block skeleton">
                    <div class="skeleton-hero-line-1"></div>
                    <div class="skeleton-hero-line-2"></div>
                    <div class="skeleton-hero-btn"></div>
                </div>
                <div class="skeleton-grid-placeholder">
                    <div class="skeleton-grid-item skeleton"></div>
                    <div class="skeleton-grid-item skeleton"></div>
                    <div class="skeleton-grid-item skeleton"></div>
                </div>`;
        }

        skeletonHtml += `</div>`;
        overlay.innerHTML = skeletonHtml;
        return overlay;
    }

    function initTransitions() {
        const overlay = injectOverlay(window.location.href);

        function hideOverlay() {
            if (overlay && !overlay.classList.contains('loaded')) {
                overlay.classList.add('loaded');
            }
        }

        // Fade out overlay when page is fully loaded
        window.addEventListener('load', () => {
            setTimeout(hideOverlay, 100);
        });

        // Failsafe: hide overlay after 1 second anyway
        setTimeout(hideOverlay, 1000);

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
                    injectOverlay(href); // Update skeleton to match destination
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
