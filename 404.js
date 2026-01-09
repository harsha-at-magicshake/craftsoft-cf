/* 404 Page Specific Logic */
document.addEventListener('DOMContentLoaded', function () {
    // Reveal page after FOUC protection
    document.documentElement.classList.remove('no-fouc');
});

window.addEventListener('load', function () {
    document.documentElement.classList.remove('no-fouc');
});
