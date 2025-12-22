/* ============================================
   Abhi's Craft Soft - Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize all modules
    initNavbar();
    initMobileMenu();
    initSmoothScroll();
    initScrollAnimations();
    initFAQ();
    initActiveNavLink();
    initCourseFilter();
    initCurriculumTabs();
    initShareCourse();
});

/* ============================================
   NAVBAR
   ============================================ */
function initNavbar() {
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/* ============================================
   MOBILE MENU
   ============================================ */
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        // Prevent body scroll when menu is open
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Close menu when clicking outside (on overlay)
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

/* ============================================
   SMOOTH SCROLL
   ============================================ */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            if (href === '#') return;

            e.preventDefault();

            const target = document.querySelector(href);
            if (target) {
                const navbarHeight = document.getElementById('navbar').offsetHeight;
                const targetPosition = target.offsetTop - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* ============================================
   SCROLL ANIMATIONS
   ============================================ */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements
    const animateElements = document.querySelectorAll(
        '.feature-card, .course-card, .service-card, .testimonial-card, .advantage-card, .contact-card, .faq-item'
    );

    animateElements.forEach(el => {
        el.classList.add('animate-element');
        observer.observe(el);
    });
}

// Add animation styles dynamically
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    .animate-element {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    .animate-element.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    .feature-card:nth-child(2), .course-card:nth-child(2), .advantage-card:nth-child(2),
    .testimonial-card:nth-child(2) {
        transition-delay: 0.1s;
    }
    
    .feature-card:nth-child(3), .course-card:nth-child(3), .advantage-card:nth-child(3),
    .testimonial-card:nth-child(3) {
        transition-delay: 0.2s;
    }
    
    .feature-card:nth-child(4), .course-card:nth-child(4), .advantage-card:nth-child(4) {
        transition-delay: 0.3s;
    }
    
    .advantage-card:nth-child(5) {
        transition-delay: 0.4s;
    }
    
    .advantage-card:nth-child(6) {
        transition-delay: 0.5s;
    }
`;
document.head.appendChild(animationStyles);

/* ============================================
   FAQ ACCORDION
   ============================================ */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });

            // Toggle current item
            item.classList.toggle('active');
        });
    });
}

/* ============================================
   ACTIVE NAV LINK
   ============================================ */
function initActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        const navbarHeight = document.getElementById('navbar').offsetHeight;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - navbarHeight - 100;
            const sectionHeight = section.offsetHeight;

            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');

            if (href === `#${current}` || (href.includes('#') && href.endsWith(`#${current}`))) {
                link.classList.add('active');
            }
        });
    });
}

/* ============================================
   COURSE FILTER
   ============================================ */
function initCourseFilter() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    const courseCategories = document.querySelectorAll('.course-category');

    if (filterTabs.length === 0 || courseCategories.length === 0) return;

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.getAttribute('data-filter');

            // Show/hide categories
            courseCategories.forEach(category => {
                if (filter === 'all') {
                    category.classList.remove('hidden');
                } else {
                    const categoryType = category.getAttribute('data-category');
                    if (categoryType === filter) {
                        category.classList.remove('hidden');
                    } else {
                        category.classList.add('hidden');
                    }
                }
            });

            // Smooth scroll to section
            const scrollTarget = document.querySelector('.courses-page') || document.querySelector('.services-page');
            if (scrollTarget) {
                const navbarHeight = document.getElementById('navbar')?.offsetHeight || 0;
                window.scrollTo({
                    top: scrollTarget.offsetTop - navbarHeight - 20,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Handle URL parameters for filtering
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    if (filterParam) {
        const targetTab = Array.from(filterTabs).find(tab => tab.getAttribute('data-filter') === filterParam);
        if (targetTab) {
            setTimeout(() => targetTab.click(), 100);
        }
    }
}

/* ============================================
   COUNTER ANIMATION
   ============================================ */
function initCounterAnimation() {
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');

    const animateCounter = (element) => {
        const target = parseFloat(element.getAttribute('data-target'));
        const isDecimal = element.hasAttribute('data-decimal');
        const duration = 2000;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = target * easeOutQuart;

            if (isDecimal) {
                element.textContent = current.toFixed(1);
            } else {
                element.textContent = Math.floor(current);
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = isDecimal ? target.toFixed(1) : target;
            }
        };

        requestAnimationFrame(update);
    };

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted');
                animateCounter(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => statsObserver.observe(stat));
}

/* ============================================
   SCROLL TO TOP BUTTON
   ============================================ */
function initScrollToTop() {
    const scrollBtn = document.getElementById('scrollToTop');

    if (!scrollBtn) return;

    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });

    // Scroll to top on click
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/* ============================================
   TESTIMONIALS AUTO-SLIDER
   ============================================ */
function initTestimonialsSlider() {
    const slider = document.querySelector('.testimonials-slider');
    if (!slider) return;

    const cards = slider.querySelectorAll('.testimonial-card');
    if (cards.length === 0) return;

    let currentIndex = 0;
    const totalCards = cards.length;

    // Create slider wrapper if not exists
    let track = slider.querySelector('.testimonials-track');
    if (!track) {
        track = document.createElement('div');
        track.className = 'testimonials-track';
        cards.forEach(card => track.appendChild(card.cloneNode(true)));
        slider.innerHTML = '';
        slider.appendChild(track);
    }

    // Navigation dots container
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'slider-dots';
    slider.appendChild(dotsContainer);

    function createDots() {
        dotsContainer.innerHTML = '';
        const visibleCards = getVisibleCards();
        const numPages = totalCards - visibleCards + 1;

        if (numPages <= 1) return; // No dots if all cards fit

        for (let i = 0; i < numPages; i++) {
            const dot = document.createElement('button');
            dot.className = `slider-dot ${i === currentIndex ? 'active' : ''}`;
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }

    function goToSlide(index) {
        currentIndex = index;
        updateSlider();
    }

    function updateSlider() {
        const visibleCards = getVisibleCards();
        const cardWidth = 100 / visibleCards;
        track.style.transform = `translateX(-${currentIndex * cardWidth}%)`;

        // Update dots
        const dots = dotsContainer.querySelectorAll('.slider-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }

    function getVisibleCards() {
        if (window.innerWidth >= 1024) return 3;
        if (window.innerWidth >= 768) return 2;
        return 1;
    }

    function nextSlide() {
        const visibleCards = getVisibleCards();
        const maxIndex = totalCards - visibleCards;
        currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
        updateSlider();
    }

    // Initial dot creation
    createDots();

    // Auto-slide every 5 seconds
    let autoSlide = setInterval(nextSlide, 5000);

    // Pause on hover
    slider.addEventListener('mouseenter', () => clearInterval(autoSlide));
    slider.addEventListener('mouseleave', () => {
        autoSlide = setInterval(nextSlide, 5000);
    });

    // Handle resize
    window.addEventListener('resize', () => {
        currentIndex = 0;
        createDots();
        updateSlider();
    });
}

// Initialize new features
document.addEventListener('DOMContentLoaded', function () {
    initCounterAnimation();
    initScrollToTop();
    initTestimonialsSlider();
    initContactForm();
});

/* ============================================
   CONTACT FORM HANDLER
   ============================================ */
function initContactForm() {
    const form = document.getElementById('contactForm') || document.getElementById('service-contact-form');
    if (!form) return;

    // Phone number validation logic
    const phoneInput = form.querySelector('input[type="tel"]');
    if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
        });
    }

    form.addEventListener('submit', async function (e) {
        // We let the form continue to Formspree for email notification, 
        // but we sync to Firebase first
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        try {
            // Prevent default just for the sync part
            e.preventDefault();

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            const formData = new FormData(form);
            const inquiryData = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone') || '-',
                subject: formData.get('interest') || 'Website Inquiry',
                message: formData.get('message'),
                status: 'new', // Default status for admin panel
                source: 'website',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Save to Firestore (Silent fail if it fails, so user still gets success message)
            if (window.db) {
                try {
                    await window.db.collection('inquiries').add(inquiryData);
                    console.log('Inquiry synced to Firestore');
                } catch (dbError) {
                    console.error('Firestore sync failed:', dbError);
                }
            }

            // Show success UI
            const formCard = form.closest('.contact-form-card') || document.querySelector('.contact-form-wrapper');
            if (formCard) {
                formCard.innerHTML = `
                    <div class="success-message-container" style="text-align: center; padding: 40px; animation: fadeIn 0.5s ease;">
                        <div class="success-icon" style="width: 80px; height: 80px; background: rgba(0, 184, 148, 0.1); color: #00B894; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2.5rem;">
                            <i class="fas fa-check"></i>
                        </div>
                        <h3 style="margin-bottom: 10px; font-size: 1.5rem; color: var(--text-dark);">Inquiry Received!</h3>
                        <p style="color: var(--text-light); line-height: 1.6;">Thank you for reaching out, <strong>${inquiryData.name}</strong>. Your inquiry has been logged in our system and we'll get back to you shortly.</p>
                        <button class="btn btn-outline" style="margin-top: 24px;" onclick="window.location.reload()">Send Another Message</button>
                    </div>
                `;
            }

            // Optional: Also ping Formspree in the background so you still get the email
            fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Something went wrong. Please try again or contact us via WhatsApp.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Check for URL-based feedback (legacy)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('submitted') === 'true') {
        const formCard = form.closest('.contact-form-card') || document.querySelector('.contact-form-wrapper');
        if (formCard) {
            formCard.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-check-circle" style="font-size: 4rem; color: #00B894; margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px;">Message Sent!</h3>
                    <p style="color: #666;">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                </div>
            `;
        }
    }
}

/* ============================================
   CURRICULUM LEVEL TABS
   ============================================ */
function initCurriculumTabs() {
    const tabs = document.querySelectorAll('.curriculum-tab');
    const levels = document.querySelectorAll('.curriculum-level');

    if (tabs.length === 0) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const level = tab.dataset.level;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active level content
            levels.forEach(l => {
                if (l.dataset.level === level) {
                    l.classList.add('active');
                } else {
                    l.classList.remove('active');
                }
            });
        });
    });
}

/* ============================================
   SHARE COURSE FUNCTIONALITY
   ============================================ */
function initShareCourse() {
    const shareIcons = document.querySelectorAll('.share-icon');

    if (shareIcons.length === 0) return;

    const pageUrl = encodeURIComponent(window.location.href);
    const pageTitle = encodeURIComponent(document.title);
    const shareText = encodeURIComponent(`Check out this course: ${document.title}`);

    shareIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            const shareType = icon.dataset.share;
            let shareUrl = '';

            switch (shareType) {
                case 'linkedin':
                    shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`;
                    window.open(shareUrl, '_blank', 'width=600,height=500');
                    break;

                case 'instagram':
                    // Instagram doesn't have direct share URL, copy link instead
                    copyToClipboard(window.location.href, icon);
                    alert('Link copied! You can now paste it in your Instagram story or bio.');
                    return;

                case 'sms':
                    // SMS sharing - works on mobile
                    const smsBody = `Check out this course at Abhi's Craft Soft: ${window.location.href}`;
                    shareUrl = `sms:?body=${encodeURIComponent(smsBody)}`;
                    window.location.href = shareUrl;
                    break;

                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${shareText}`;
                    window.open(shareUrl, '_blank', 'width=600,height=400');
                    break;

                case 'copy':
                    copyToClipboard(window.location.href, icon);
                    break;
            }
        });
    });
}

function copyToClipboard(text, iconElement) {
    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback
        const originalIcon = iconElement.innerHTML;
        iconElement.classList.add('copied');
        iconElement.innerHTML = '<i class="fas fa-check"></i>';

        setTimeout(() => {
            iconElement.classList.remove('copied');
            iconElement.innerHTML = originalIcon;
        }, 2000);
    }).catch(err => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        iconElement.classList.add('copied');
        setTimeout(() => iconElement.classList.remove('copied'), 2000);
    });
}

console.log('Abhi\'s Craft Soft website initialized successfully! 🚀');
