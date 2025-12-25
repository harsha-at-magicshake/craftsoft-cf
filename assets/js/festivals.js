/* ============================================
   CRAFTSOFT - Festival Effects System v3
   11 Indian festivals - Simple effects
   BURSTS ONLY ON DIWALI
   ============================================ */

(function () {
    'use strict';

    const CONFIG = {
        API_KEY: 'ez3pfQ9AxWlU4qbAHmC8Z34qaEKBbV9N',
        CACHE_KEY: 'craftsoft_festival_dates',
        CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000,
        PARTICLE_COUNT: 25
    };

    // Festival definitions - 11 festivals
    const FESTIVALS = {
        newyear: {
            name: 'New Year',
            particles: ['●', '●', '●', '●', '●'],
            fixedDate: { month: 1, day: 1 }
        },
        sankranti: {
            name: 'Makar Sankranti',
            particles: ['🪁', '🪁', '🪁', '🪁'],
            fixedDate: { month: 1, day: 14 }
        },
        republic: {
            name: 'Republic Day',
            particles: ['●', '●', '●'],
            fixedDate: { month: 1, day: 26 }
        },
        holi: {
            name: 'Holi',
            particles: ['●', '●', '●', '●', '●', '●'],
            apiName: 'Holi'
        },
        ugadi: {
            name: 'Ugadi',
            particles: ['🌸', '🌺', '🌼', '🌷', '🌹', '💐'],
            apiName: 'Ugadi'
        },
        independence: {
            name: 'Independence Day',
            particles: ['●', '●', '●'],
            fixedDate: { month: 8, day: 15 }
        },
        bathukamma: {
            name: 'Bathukamma',
            particles: ['🌺', '🌸', '🌼', '🌻', '🌷', '💐'],
            apiName: 'Bathukamma'
        },
        dasara: {
            name: 'Dasara',
            particles: ['✨', '⭐', '💫', '🌟', '✦'],
            apiName: 'Dussehra'
        },
        diwali: {
            name: 'Diwali',
            particles: [],
            apiName: 'Diwali',
            darkMode: true,
            customEffect: 'crackers'
        },
        eid: {
            name: 'Eid ul-Fitr',
            particles: [],
            apiName: 'Eid ul-Fitr',
            darkMode: true,
            customEffect: 'crescent'
        },
        christmas: {
            name: 'Christmas',
            particles: ['❄', '❅', '❆', '✧', '✦'],
            fixedDate: { month: 12, day: 25 }
        }
    };

    function isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    async function getCurrentFestival() {
        const now = new Date();
        const year = now.getFullYear();

        for (const [key, festival] of Object.entries(FESTIVALS)) {
            if (festival.fixedDate) {
                const festDate = new Date(year, festival.fixedDate.month - 1, festival.fixedDate.day);
                if (isSameDay(now, festDate)) {
                    return key;
                }
            }
        }

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

                    if (name.includes('holi') && !name.includes('holika')) dates.holi = holiday.date.iso;
                    if (name.includes('ugadi')) dates.ugadi = holiday.date.iso;
                    if (name.includes('dussehra') || name.includes('vijayadashami')) dates.dasara = holiday.date.iso;
                    if (name.includes('diwali') || name.includes('deepavali')) dates.diwali = holiday.date.iso;
                    if (name.includes('eid ul-fitr') || name.includes('eid-ul-fitr')) dates.eid = holiday.date.iso;
                    if (name.includes('bathukamma')) dates.bathukamma = holiday.date.iso;
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

    function createFestivalEffect(festivalKey) {
        const festival = FESTIVALS[festivalKey];
        if (!festival) return;

        console.log(`🎉 Festival: ${festival.name} - Effect activated!`);

        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/css/festivals.css?v=3.0';
        document.head.appendChild(link);

        // Handle Diwali cracker bursts
        if (festival.customEffect === 'crackers') {
            createDiwaliEffect();
            return;
        }

        // Handle Eid crescent moon
        if (festival.customEffect === 'crescent') {
            createEidEffect();
            return;
        }

        // Standard particle effect (simple falling/floating)
        const container = document.createElement('div');
        container.className = `festival-effects festival-${festivalKey}`;
        container.setAttribute('aria-hidden', 'true');

        const particleCount = window.innerWidth < 768 ? 14 : CONFIG.PARTICLE_COUNT;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('span');
            particle.className = 'festival-particle';
            particle.textContent = festival.particles[i % festival.particles.length];
            container.appendChild(particle);
        }

        document.body.appendChild(container);
    }

    // ============================================
    // DIWALI - The ONLY festival with cracker bursts
    // ============================================
    function createDiwaliEffect() {
        document.body.classList.add('diwali-mode');

        // Add diyas at corners
        const diyaLeft = document.createElement('div');
        diyaLeft.className = 'diya diya-left';
        diyaLeft.textContent = '🪔';
        document.body.appendChild(diyaLeft);

        const diyaRight = document.createElement('div');
        diyaRight.className = 'diya diya-right';
        diyaRight.textContent = '🪔';
        document.body.appendChild(diyaRight);

        // Cracker burst effect
        function createCrackerBurst() {
            const colors = ['#FF6347', '#FFD700', '#00CED1', '#FF69B4', '#7CFC00', '#FF4500', '#9400D3', '#00FF00', '#FF1493'];
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * (window.innerHeight * 0.6);

            const burst = document.createElement('div');
            burst.className = 'festival-diwali-burst';
            burst.style.left = x + 'px';
            burst.style.top = y + 'px';

            // Create particles for burst
            const particleCount = 25 + Math.floor(Math.random() * 15);
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'cracker-particle';

                const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.5);
                const distance = 60 + Math.random() * 120;
                const tx = Math.cos(angle) * distance;
                const ty = Math.sin(angle) * distance;

                particle.style.setProperty('--tx', tx + 'px');
                particle.style.setProperty('--ty', ty + 'px');
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                particle.style.boxShadow = `0 0 8px ${particle.style.background}, 0 0 12px ${particle.style.background}`;

                burst.appendChild(particle);
            }

            document.body.appendChild(burst);

            setTimeout(() => burst.remove(), 1600);
        }

        // Burst crackers at random intervals
        let burstInterval;
        function scheduleBursts() {
            createCrackerBurst();
            const nextBurst = 800 + Math.random() * 2500;
            burstInterval = setTimeout(scheduleBursts, nextBurst);
        }

        scheduleBursts();

        // Store interval for cleanup
        window._diwaliInterval = burstInterval;
    }

    // ============================================
    // EID - Crescent Moon (White)
    // ============================================
    function createEidEffect() {
        document.body.classList.add('eid-mode');

        const container = document.createElement('div');
        container.className = 'festival-effects festival-eid';
        container.setAttribute('aria-hidden', 'true');

        const moon = document.createElement('div');
        moon.className = 'crescent-moon';
        moon.textContent = '☪';
        container.appendChild(moon);

        document.body.appendChild(container);
    }

    // ============================================
    // CLEAR EFFECTS
    // ============================================
    function clearFestivalEffects() {
        // Clear Diwali interval
        if (window._diwaliInterval) {
            clearTimeout(window._diwaliInterval);
            window._diwaliInterval = null;
        }

        // Remove all containers
        document.querySelectorAll('.festival-effects, .festival-diwali-burst, .diya').forEach(el => el.remove());

        // Remove dark modes
        document.body.classList.remove('diwali-mode', 'eid-mode');
    }

    // Test mode
    window.testFestival = function (festivalKey) {
        clearFestivalEffects();
        if (festivalKey && FESTIVALS[festivalKey]) {
            createFestivalEffect(festivalKey);
        }
    };

    window.getFestivalsList = function () {
        return Object.keys(FESTIVALS);
    };

    // Initialization
    async function init() {
        if (window.location.pathname.includes('/admin')) {
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const testFest = urlParams.get('festival');
        if (testFest && FESTIVALS[testFest]) {
            createFestivalEffect(testFest);
            return;
        }

        const currentFestival = await getCurrentFestival();
        if (currentFestival) {
            createFestivalEffect(currentFestival);
        } else {
            console.log('🎉 No festival today');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
