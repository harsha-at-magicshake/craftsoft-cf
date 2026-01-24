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

            // Toggle Filter Tabs visibility
            if (filterTabsContainer) {
                filterTabsContainer.style.display = query ? 'none' : 'flex';
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
                    searchResultsCount.textContent = `${matchCount} course${matchCount !== 1 ? 's' : ''} found`;
                    searchResultsCount.style.display = 'block';
                } else {
                    searchResultsCount.style.display = 'none';
                }
            }
        });

        if (searchClear) {
            searchClear.addEventListener('click', function () {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                searchInput.focus();
            });
        }
    }
});
