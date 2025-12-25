/* ============================================
   CHRISTMAS SNOWFALL - JavaScript
   Active until: January 1st, 2025 23:59:59 IST
   ============================================ */

(function () {
    'use strict';

    // Check if Christmas season (until Jan 1, 2025 23:59:59 IST)
    const endDate = new Date('2025-01-01T23:59:59+05:30');
    const now = new Date();

    if (now > endDate) {
        console.log('🎄 Christmas season ended. Snowfall disabled.');
        return;
    }

    // Don't run on admin pages
    if (window.location.pathname.includes('/admin')) {
        return;
    }

    console.log('🎄 Merry Christmas! Snowfall activated.');

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/css/christmas.css';
    document.head.appendChild(link);

    // Create snowfall container
    const snowfall = document.createElement('div');
    snowfall.className = 'snowfall';
    snowfall.setAttribute('aria-hidden', 'true');

    // Snowflake characters
    const flakes = ['❄', '❅', '❆', '•', '*'];

    // Create 20 snowflakes
    for (let i = 0; i < 20; i++) {
        const flake = document.createElement('span');
        flake.className = 'snowflake';
        flake.textContent = flakes[Math.floor(Math.random() * flakes.length)];
        snowfall.appendChild(flake);
    }

    // Add to page when DOM is ready
    if (document.body) {
        document.body.appendChild(snowfall);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.appendChild(snowfall);
        });
    }
})();
