/* ============================================
   FOOTER Component Loader
   Loads footer.html dynamically into pages
   ============================================ */

(function () {
    // All available courses for dynamic footer
    const allCourses = [
        { name: 'Python Full Stack', url: 'courses/python/' },
        { name: 'Full Stack MERN', url: 'courses/full-stack/' },
        { name: 'Graphic Design', url: 'courses/graphic-design/' },
        { name: 'UI/UX Design', url: 'courses/ui-ux/' },
        { name: 'Cloud & DevOps', url: 'courses/devops/' },
        { name: 'Cyber Security', url: 'courses/cyber-security/' },
        { name: 'Data Analytics', url: 'courses/data-analytics/' },
        { name: 'Salesforce Developer', url: 'courses/salesforce-developer/' },
        { name: 'ServiceNow Admin', url: 'courses/service-now/' },
        { name: 'Java Full Stack', url: 'courses/java/' }
    ];

    // All available services
    const allServices = [
        { name: 'Graphic Design', url: 'acs_services/graphic-design/' },
        { name: 'UI/UX Design', url: 'acs_services/ui-ux-design/' },
        { name: 'Web Development', url: 'acs_services/web-development/' },
        { name: 'Brand Identity', url: 'acs_services/branding/' },
        { name: 'Cloud Solutions', url: 'acs_services/cloud-devops/' },
        { name: 'Career Services', url: 'acs_services/career-services/' }
    ];

    // Shuffle helper
    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

    // Get base path for correct URL resolution
    function getBasePath() {
        const path = window.location.pathname;
        const depth = (path.match(/\//g) || []).length - 1;
        if (depth <= 0) return '';
        return '../'.repeat(depth);
    }

    // Load footer dynamically
    function loadFooter() {
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (!footerPlaceholder) return;

        const basePath = getBasePath();

        fetch(basePath + 'assets/components/footer/footer.html')
            .then(response => response.text())
            .then(html => {
                // Fix relative URLs based on page depth
                if (basePath) {
                    html = html.replace(/href="(?!http|mailto|tel|#)/g, `href="${basePath}`);
                    html = html.replace(/src="(?!http)/g, `src="${basePath}`);
                }

                footerPlaceholder.innerHTML = html;
                populateDynamicFooter();
                updateCopyrightYear();
            })
            .catch(err => console.error('Footer load error:', err));
    }

    // Populate courses and services dynamically
    function populateDynamicFooter() {
        const selectedCourses = shuffle([...allCourses]).slice(0, 4);
        const selectedServices = shuffle([...allServices]).slice(0, 4);
        const basePath = getBasePath();

        const coursesContainer = document.getElementById('footer-trending-courses');
        if (coursesContainer) {
            coursesContainer.innerHTML = selectedCourses.map(c =>
                `<li><a href="${basePath}${c.url}">${c.name}</a></li>`
            ).join('');
        }

        const servicesContainer = document.getElementById('footer-services');
        if (servicesContainer) {
            servicesContainer.innerHTML = selectedServices.map(s =>
                `<li><a href="${basePath}${s.url}">${s.name}</a></li>`
            ).join('');
        }
    }

    // Update copyright year
    function updateCopyrightYear() {
        const yearEl = document.getElementById('copyright-year');
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadFooter);
    } else {
        loadFooter();
    }

    // Export for manual use
    window.loadFooter = loadFooter;
})();
