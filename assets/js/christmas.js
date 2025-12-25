/* ============================================
   CHRISTMAS SNOWFALL - JavaScript
   Active: Dec 25 00:00 to Jan 1 23:59 (every year)
   ============================================ */

(function () {
    'use strict';

    // Check if it's Christmas season (Dec 25 - Jan 1)
    function isChristmasSeason() {
        const now = new Date();
        const month = now.getMonth(); // 0-11 (0=Jan, 11=Dec)
        const day = now.getDate();

        // Dec 25-31 (month 11, day 25-31) OR Jan 1 (month 0, day 1)
        if (month === 11 && day >= 25) return true;  // Dec 25-31
        if (month === 0 && day === 1) return true;   // Jan 1
        return false;
    }

    // Don't run if not Christmas season
    if (!isChristmasSeason()) {
        return;
    }

    // Don't run on admin pages
    if (window.location.pathname.includes('/admin')) {
        return;
    }


    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/css/christmas.css?v=2.0';
    document.head.appendChild(link);

    // Create snowfall container
    const snowfall = document.createElement('div');
    snowfall.className = 'snowfall';
    snowfall.setAttribute('aria-hidden', 'true');

    // Snowflake characters
    const flakes = ['❄', '❅', '❆', '✧', '✦'];

    // Create 25 snowflakes (fewer on mobile)
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 14 : 25;

    for (let i = 0; i < count; i++) {
        const flake = document.createElement('span');
        flake.className = 'snowflake';
        flake.textContent = flakes[Math.floor(Math.random() * flakes.length)];
        snowfall.appendChild(flake);
    }

    // Add to page
    function addSnowfall() {
        document.body.appendChild(snowfall);
    }

    if (document.body) {
        addSnowfall();
    } else {
        document.addEventListener('DOMContentLoaded', addSnowfall);
    }

})();
