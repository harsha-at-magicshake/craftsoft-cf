/* ============================================
   FOOTER Component Loader
   Loads footer.html dynamically into pages
   ============================================ */

(function () {
    // All available courses for dynamic footer
    const allCourses = [
        { name: 'Python Full Stack', url: '/c-python/' },
        { name: 'Full Stack MERN', url: '/c-full-stack/' },
        { name: 'Graphic Design', url: '/c-graphic-design/' },
        { name: 'UI/UX Design', url: '/c-ui-ux/' },
        { name: 'Cloud & DevOps', url: '/c-devops/' },
        { name: 'Cyber Security', url: '/c-cyber-security/' },
        { name: 'Data Analytics', url: '/c-data-analytics/' },
        { name: 'Salesforce Development', url: '/c-salesforce-developer/' },
        { name: 'ServiceNow Administration', url: '/c-service-now/' }
    ];

    // All available services
    const allServices = [
        { name: 'Graphic Design', url: '/s-graphic-design/' },
        { name: 'UI/UX Design', url: '/s-ui-ux-design/' },
        { name: 'Web Development', url: '/s-web-development/' },
        { name: 'Brand Identity', url: '/s-branding/' },
        { name: 'Cloud Solutions', url: '/s-cloud-devops/' },
        { name: 'Career Services', url: '/s-career-services/' }
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
