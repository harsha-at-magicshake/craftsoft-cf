/* ============================================
   FESTIVAL LOADER
   Loads appropriate festival effect based on date
   ============================================ */

(function () {
    'use strict';

    const CONFIG = {
        API_KEY: 'ez3pfQ9AxWlU4qbAHmC8Z34qaEKBbV9N',
        CACHE_KEY: 'craftsoft_festival_dates_v2',
        CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000,
        BASE_PATH: '/assets/festivals/'
    };

    // Festival definitions
    const FESTIVALS = {
        diwali: {
            name: 'Diwali',
            apiName: 'Diwali',
            folder: 'diwali'
        }
        // More festivals will be added here
    };

    function isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    async function getAPIFestivalDates(year) {
        const cached = localStorage.getItem(CONFIG.CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            if (data.year === year && Date.now() - data.timestamp < CONFIG.CACHE_EXPIRY) {
                return data.dates;
            }
        }

        try {
            const response = await fetch(
                `https://calendarific.com/api/v2/holidays?api_key=${CONFIG.API_KEY}&country=IN&year=${year}`
            );
            const data = await response.json();

            if (data.response && data.response.holidays) {
                const dates = {};

                data.response.holidays.forEach(holiday => {
                    const name = holiday.name.toLowerCase();
                    if (name.includes('diwali') || name.includes('deepavali')) {
                        dates.diwali = holiday.date.iso;
                    }
                    // Add more festival mappings here
                });

                localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                    year: year,
                    timestamp: Date.now(),
                    dates: dates
                }));

                return dates;
            }
        } catch (error) {
            console.error('Festival API error:', error);
        }

        return null;
    }

    async function getCurrentFestival() {
        const now = new Date();
        const year = now.getFullYear();

        // Check for test mode via URL
        const urlParams = new URLSearchParams(window.location.search);
        const testFest = urlParams.get('festival');
        if (testFest && FESTIVALS[testFest]) {
            return testFest;
        }

        // Check API-based festival dates
        const apiDates = await getAPIFestivalDates(year);
        if (apiDates) {
            for (const [key, festival] of Object.entries(FESTIVALS)) {
                if (festival.apiName && apiDates[key]) {
                    const festDate = new Date(apiDates[key]);
                    if (isSameDay(now, festDate)) {
                        return key;
                    }
                }
            }
        }

        return null;
    }

    function loadFestivalAssets(festivalKey) {
        const festival = FESTIVALS[festivalKey];
        if (!festival) return;

        const basePath = CONFIG.BASE_PATH + festival.folder + '/';

        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = basePath + festival.folder + '.css?v=1.0';
        document.head.appendChild(link);

        // Load JS
        const script = document.createElement('script');
        script.src = basePath + festival.folder + '.js?v=1.0';
        document.body.appendChild(script);

        console.log(`🎉 Loading festival: ${festival.name}`);
    }

    async function init() {
        // Don't run on admin pages
        if (window.location.pathname.includes('/admin')) {
            return;
        }

        const currentFestival = await getCurrentFestival();
        if (currentFestival) {
            loadFestivalAssets(currentFestival);
        } else {
            console.log('🎉 No festival today');
        }
    }

    // Run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
