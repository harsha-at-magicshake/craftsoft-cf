/* ============================================
   TESTIMONIALS COMPONENT
   Builds testimonial cards from data
   ============================================ */

(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        initTestimonials();
    });

    function initTestimonials() {
        const container = document.getElementById('testimonials-wall');
        if (!container || typeof TESTIMONIALS === 'undefined') return;

        // Create single track (moves left)
        const track = document.createElement('div');
        track.className = 'marquee-track track-left';

        const content = document.createElement('div');
        content.className = 'marquee-content';

        // Build cards from data
        TESTIMONIALS.forEach(testimonial => {
            content.appendChild(createCard(testimonial));
        });

        // Duplicate cards for infinite scroll effect
        TESTIMONIALS.forEach(testimonial => {
            content.appendChild(createCard(testimonial));
        });

        track.appendChild(content);
        container.appendChild(track);
    }

    function createCard(data) {
        const card = document.createElement('div');
        card.className = 'testimonial-card';

        card.innerHTML = `
            <div class="testimonial-card-inner">
                <i class="fas fa-quote-right testimonial-watermark"></i>
                <div class="testimonial-stars">
                    ${generateStars(data.stars)}
                </div>
                <p class="testimonial-text">"${data.quote}"</p>
                <div class="testimonial-author">
                    <span class="author-name">${data.name}</span>
                    <span class="author-role">${data.role}</span>
                </div>
            </div>
        `;

        return card;
    }

    function generateStars(count) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= count) {
                stars += '<i class="fas fa-star"></i>'; // Filled star
            } else {
                stars += '<i class="far fa-star"></i>'; // Empty star
            }
        }
        return stars;
    }
})();
