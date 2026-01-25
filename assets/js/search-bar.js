/* ============================================
   SMART SEARCH BAR - JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('courseSearchInput');
    const searchClear = document.getElementById('searchClear');
    const searchResultsCount = document.getElementById('searchResultsCount');
    const courseCards = document.querySelectorAll('.course-card-full');
    const courseCategories = document.querySelectorAll('.course-category');
    const filterTabsContainer = document.querySelector('.course-filter-tabs');
    const coursesPageSection = document.querySelector('.courses-page');

    if (searchInput) {
        // Expand on Focus
        searchInput.addEventListener('focus', function () {
            const wrapper = this.closest('.search-filter-wrapper');
            if (wrapper) wrapper.classList.add('is-expanded');
        });

        // REMOVED: Auto-collapse on Blur (As per user policy: Manual close ONLY via X)

        // Click on Bar (Force expansion then focus)
        const searchBarContainer = document.querySelector('.course-search-bar');
        if (searchBarContainer) {
            searchBarContainer.addEventListener('click', function () {
                const wrapper = this.closest('.search-filter-wrapper');
                if (wrapper) wrapper.classList.add('is-expanded');
                setTimeout(() => searchInput.focus(), 10);
            });
        }

        // Search Input Logic
        searchInput.addEventListener('input', function () {
            const query = this.value.toLowerCase().trim();
            if (searchClear) searchClear.style.display = query ? 'block' : 'none';

            // Toggle Search Active state on main section
            if (coursesPageSection) {
                if (query) {
                    coursesPageSection.classList.add('search-active');
                } else {
                    coursesPageSection.classList.remove('search-active');
                }
            }

            let matchCount = 0;

            courseCards.forEach(card => {
                const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
                const description = card.querySelector('p')?.textContent.toLowerCase() || '';
                const isMatch = title.includes(query) || description.includes(query);

                if (isMatch || !query) {
                    card.classList.remove('search-hidden');
                    if (query) matchCount++;
                } else {
                    card.classList.add('search-hidden');
                }
            });

            // Show/hide categories and titles based on visible cards
            courseCategories.forEach(cat => {
                const visibleCards = cat.querySelectorAll('.course-card-full:not(.search-hidden)');
                const categoryTitle = cat.querySelector('.category-title');

                if (visibleCards.length > 0) {
                    cat.style.display = 'block';
                    if (categoryTitle) {
                        categoryTitle.style.display = query ? 'none' : 'block';
                    }
                } else {
                    cat.style.display = 'none';
                }
            });

            // Update results count
            if (searchResultsCount) {
                if (query) {
                    const isServicesPage = window.location.pathname.includes('service');
                    const itemType = isServicesPage ? 'service' : 'course';
                    searchResultsCount.textContent = `${matchCount} ${itemType}${matchCount !== 1 ? 's' : ''} found`;
                    searchResultsCount.style.display = 'block';
                } else {
                    searchResultsCount.style.display = 'none';
                }
            }
        });

        if (searchClear) {
            searchClear.addEventListener('click', function (e) {
                e.stopPropagation();
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));

                // Collapse bar on clear
                const wrapper = searchInput.closest('.search-filter-wrapper');
                if (wrapper) wrapper.classList.remove('is-expanded');

                searchInput.blur();
                searchClear.style.display = 'none';
            });
        }
    }
});
