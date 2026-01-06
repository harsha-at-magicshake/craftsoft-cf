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
    initShareBarPosition();
    initCounterAnimation();
    initTestimonialsSlider();
    initChatWidget();
    initDynamicCopyright();
    initPrivacyProtection();
    initDynamicContent();
});

/* ============================================
   SHARE BAR RESPONSIVE POSITIONING
   ============================================ */
function initShareBarPosition() {
    const shareBar = document.querySelector('.share-course');
    const relatedSection = document.querySelector('.related-courses');
    const courseOverview = document.querySelector('.course-highlights');

    if (!shareBar) return;

    // Remove the separator border from share bar since we're moving it
    shareBar.style.borderBottom = 'none';
    shareBar.style.marginBottom = '0';
    shareBar.style.paddingBottom = '0';

    function repositionShareBar() {
        const isMobile = window.innerWidth <= 768;

        if (isMobile && relatedSection) {
            // Mobile: Move before related courses section
            relatedSection.parentElement.insertBefore(shareBar, relatedSection);
            shareBar.style.margin = '2rem auto';
            shareBar.style.maxWidth = '90%';
            shareBar.style.padding = '1rem';
            shareBar.style.background = 'rgba(40, 150, 205, 0.05)';
            shareBar.style.borderRadius = '12px';
            shareBar.style.border = '1px solid rgba(40, 150, 205, 0.1)';
            shareBar.style.justifyContent = 'center';
        } else if (courseOverview) {
            // Desktop: Move after course overview/highlights
            const parent = courseOverview.parentElement;
            // Insert share bar right after course-highlights
            courseOverview.insertAdjacentElement('afterend', shareBar);
            // Style for desktop - clean divider look
            shareBar.style.margin = '1.5rem 0 0';
            shareBar.style.maxWidth = '';
            shareBar.style.padding = '1.5rem 0 0';
            shareBar.style.background = '';
            shareBar.style.borderRadius = '';
            shareBar.style.border = '';
            shareBar.style.borderTop = '1px solid #e5e7eb';
            shareBar.style.justifyContent = '';
        }
    }

    // Initial position
    repositionShareBar();

    // Reposition on resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(repositionShareBar, 100);
    });
}

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
    const navClose = document.getElementById('navClose');
    const navOverlay = document.getElementById('navOverlay');

    if (!hamburger || !navMenu) return;

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        if (navOverlay) navOverlay.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu on close button click
    if (navClose) {
        navClose.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            if (navOverlay) navOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Close menu on overlay click
    if (navOverlay) {
        navOverlay.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Close menu when clicking on a link
    const navLinks = navMenu.querySelectorAll('.nav-link, .nav-admin-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            if (navOverlay) navOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
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
    const path = window.location.pathname;

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

            // 1. Check if it's a simple local hash link (e.g., "#about")
            if (href === `#${current}`) {
                link.classList.add('active');
            }
            // 2. Check if it's a cross-page hash link (e.g., "../../#contact")
            // Only highlight if we are on the homepage or the target path
            else if (href.includes('#') && current) {
                const [hrefPath, hash] = href.split('#');
                if (hash === current) {
                    // Only highlight if the path is basically empty or matches (for home)
                    if (hrefPath === '' || hrefPath === 'index.html' || hrefPath === './' || hrefPath.endsWith('/')) {
                        // Check if we are at the root or current path matches
                        const isAtBase = path === '/' || path.endsWith('/index.html') || path === '/Website/';
                        if (isAtBase) {
                            link.classList.add('active');
                        }
                    }
                }
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

// All initialization is now handled in the main DOMContentLoaded listener above



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

/* ============================================
   CHAT WIDGET
   ============================================ */
function initChatWidget() {
    const chatWidget = document.getElementById('chatWidget');
    const chatToggle = document.getElementById('chatToggle');

    if (!chatWidget || !chatToggle) return;

    chatToggle.addEventListener('click', () => {
        chatWidget.classList.toggle('active');
    });

    // Close chat when clicking outside
    document.addEventListener('click', (e) => {
        if (!chatWidget.contains(e.target) && chatWidget.classList.contains('active')) {
            chatWidget.classList.remove('active');
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && chatWidget.classList.contains('active')) {
            chatWidget.classList.remove('active');
        }
    });
}

/* ============================================
   DYNAMIC COPYRIGHT YEAR
   ============================================ */
function initDynamicCopyright() {
    const copyrightElements = document.querySelectorAll('.footer-bottom p, .copyright-text');
    const currentYear = new Date().getFullYear();

    copyrightElements.forEach(el => {
        if (el.textContent.includes('Â©')) {
            el.textContent = el.textContent.replace(/Â© \d{4}/, `Â© ${currentYear}`);
        }
    });
}

/* ============================================
   PRIVACY PROTECTION FOR IMAGES
   ============================================ */
function initPrivacyProtection() {
    const protectedImages = document.querySelectorAll('.protected-img');
    protectedImages.forEach(img => {
        // Block right-click (Redundant with HTML attribute but good for safety)
        img.addEventListener('contextmenu', e => e.preventDefault());

        // Block dragging
        img.addEventListener('dragstart', e => e.preventDefault());

        // Block keyboard copy shortcut
        img.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
            }
        });
    });
}

/* ============================================
   DYNAMIC CONTENT POPULATION
   ============================================ */
function initDynamicContent() {
    const allCourses = [
        { name: 'Graphic Design', url: '/courses/graphic-design/', icon: 'fas fa-palette', desc: 'Master Adobe Creative Suite and visual communication.', features: ['Photoshop & Illustrator', 'Brand Identity', 'Portfolio'] },
        { name: 'UI/UX Design', url: '/courses/ui-ux/', icon: 'fas fa-window-maximize', desc: 'Create stunning user interfaces and experiences.', features: ['Figma & XD', 'User Research', 'Prototyping'] },
        { name: 'Full Stack Development', url: '/courses/full-stack/', icon: 'fas fa-layer-group', desc: 'Master both front-end and back-end dev.', features: ['React & Node.js', 'Rest APIs', 'Deployment'] },
        { name: 'DevOps Engineering', url: '/courses/devops/', icon: 'fas fa-server', desc: 'Learn CI/CD, Docker, and automation tools.', features: ['CI/CD Pipelines', 'Docker & K8s', 'Automation'] },
        { name: 'AWS Cloud', url: '/courses/aws/', icon: 'fab fa-aws', desc: 'Master cloud infrastructure on Amazon Web Services.', features: ['EC2 & S3', 'Lambda & IAM', 'CloudFormation'] },
        { name: 'Python Programming', url: '/courses/python-programming/', icon: 'fab fa-python', desc: 'Learn one of the most versatile coding languages.', features: ['Data Science', 'Web Dev', 'Automation'] },
        { name: 'Resume & Interview', url: '/courses/resume-interview/', icon: 'fas fa-file-invoice', desc: 'Prepare for your dream career with mock sessions.', features: ['Mock Interviews', 'Resume Building', 'Soft Skills'] },
        { name: 'Spoken English', url: '/courses/spoken-english/', icon: 'fas fa-microphone', desc: 'Enhance your communication and professional confidence.', features: ['Communication', 'Presentation', 'Confidence'] },
        { name: 'Soft Skills', url: '/courses/soft-skills/', icon: 'fas fa-users', desc: 'Develop professional soft skills for career success.', features: ['Leadership', 'Teamwork', 'Problem Solving'] }
    ];

    const allServices = [
        { name: 'Graphic Design', url: '/services/graphic-design/', icon: 'fas fa-palette', desc: 'Stunning visuals for your brand identity.' },
        { name: 'UI/UX Design', url: '/services/ui-ux-design/', icon: 'fas fa-window-maximize', desc: 'User-centered design solution for digital products.' },
        { name: 'Web Development', url: '/services/web-development/', icon: 'fas fa-globe', desc: 'Custom, responsive websites that drive results.' },
        { name: 'Brand Identity', url: '/services/branding/', icon: 'fas fa-bullseye', desc: 'Strategic branding to set you apart.' },
        { name: 'Cloud & DevOps', url: '/services/cloud-devops/', icon: 'fas fa-server', desc: 'Scalable infrastructure and automation.' },
        { name: 'Career Services', url: '/services/career-services/', icon: 'fas fa-users', desc: 'Expert guidance for your professional journey.' }
    ];

    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

    // Populate Footer
    const footerCourses = document.getElementById('footer-trending-courses');
    const footerServices = document.getElementById('footer-services');
    if (footerCourses) {
        footerCourses.innerHTML = shuffle([...allCourses]).slice(0, 4).map(c => `<li><a href="${c.url}">${c.name}</a></li>`).join('');
    }
    if (footerServices) {
        footerServices.innerHTML = shuffle([...allServices]).slice(0, 4).map(s => `<li><a href="${s.url}">${s.name}</a></li>`).join('');
    }

    // Populate Homepage Grids
    const homeCoursesGrid = document.getElementById('homepage-courses-grid');
    const homeCareerGrid = document.getElementById('homepage-career-grid');
    const homeServicesGrid = document.getElementById('homepage-services-grid');

    if (homeCoursesGrid) {
        const selected = shuffle(allCourses.filter(c => !c.name.includes('Resume') && !c.name.includes('English') && !c.name.includes('Soft Skills'))).slice(0, 3);
        homeCoursesGrid.innerHTML = selected.map(c => `
            <div class="unified-card">
                <div class="unified-card-icon"><i class="${c.icon}"></i></div>
                <h3>${c.name}</h3>
                <p>${c.desc}</p>
                <ul class="unified-card-features">
                    ${c.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <a href="${c.url}" class="unified-card-link">View Details <i class="fas fa-arrow-right"></i></a>
            </div>
        `).join('');
    }

    if (homeCareerGrid) {
        const selected = shuffle(allCourses.filter(c => c.name.includes('Resume') || c.name.includes('English') || c.name.includes('Soft'))).slice(0, 3);
        homeCareerGrid.innerHTML = selected.map(c => `
            <div class="unified-card">
                <div class="unified-card-icon"><i class="${c.icon}"></i></div>
                <h3>${c.name}</h3>
                <p>${c.desc}</p>
                <ul class="unified-card-features">
                    ${c.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <a href="${c.url}" class="unified-card-link">View Details <i class="fas fa-arrow-right"></i></a>
            </div>
        `).join('');
    }

    if (homeServicesGrid) {
        const selected = shuffle([...allServices]).slice(0, 3);
        homeServicesGrid.innerHTML = selected.map(s => `
            <div class="unified-card">
                <div class="unified-card-icon"><i class="${s.icon}"></i></div>
                <h3>${s.name}</h3>
                <p>${s.desc}</p>
                <a href="${s.url}" class="unified-card-link">Read More <i class="fas fa-arrow-right"></i></a>
            </div>
        `).join('');
    }
}
