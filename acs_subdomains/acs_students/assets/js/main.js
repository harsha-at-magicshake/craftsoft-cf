/* ============================================
   Abhi's Craftsoft - Main JavaScript
   ============================================ */

// Register Service Worker for Offline Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered:', registration.scope);
            })
            .catch(error => {
                console.log('SW registration failed:', error);
            });
    });
}

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
    initChatWidget();
    initDynamicCopyright();
    initPrivacyProtection();
    initDynamicContent();
    initHeroTypingEffect();
    initRandomFloatingCards();
    initScrollToNext();

    initCardGlow();
    initHeroParallax();
    initWorkspaceTabs();
    initFormSecurity();
});

/* ============================================
   FORM SECURITY - Disable Autocomplete
   ============================================ */
function initFormSecurity() {
    // Disable autocomplete on all forms for security
    document.querySelectorAll('form').forEach(form => {
        form.setAttribute('autocomplete', 'off');
    });

    // Also disable on individual inputs
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]').forEach(input => {
        input.setAttribute('autocomplete', 'off');
    });

    document.querySelectorAll('select').forEach(select => {
        select.setAttribute('autocomplete', 'off');
    });
}

/* ============================================
   WORKSPACE TABS AUTO-ROTATION
   ============================================ */
function initWorkspaceTabs() {
    const tabs = document.querySelectorAll('.workspace-tab');
    const panels = document.querySelectorAll('.workspace-panel');
    const progressBar = document.querySelector('.workspace-progress .progress-bar');

    if (tabs.length === 0 || panels.length === 0) return;

    let currentIndex = 0;
    let progress = 0;
    const duration = 5000; // 5 seconds per tab
    const interval = 50; // Update progress every 50ms
    let progressInterval;
    let isPaused = false;

    function switchTab(index) {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        tabs[index].classList.add('active');
        panels[index].classList.add('active');

        progress = 0;
        if (progressBar) progressBar.style.width = '0%';
    }

    function startProgress() {
        progressInterval = setInterval(() => {
            if (isPaused) return;

            progress += (interval / duration) * 100;
            if (progressBar) progressBar.style.width = progress + '%';

            if (progress >= 100) {
                currentIndex = (currentIndex + 1) % tabs.length;
                switchTab(currentIndex);
            }
        }, interval);
    }

    // Manual tab click
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            currentIndex = index;
            switchTab(index);
        });
    });

    // Pause on hover
    const workspace = document.querySelector('.hero-workspace');
    if (workspace) {
        workspace.addEventListener('mouseenter', () => isPaused = true);
        workspace.addEventListener('mouseleave', () => isPaused = false);
    }

    // Start auto-rotation
    startProgress();
}

/* ============================================
   HERO PARALLAX EFFECT
   ============================================ */
function initHeroParallax() {
    const hero = document.querySelector('.hero');
    const shapes = document.querySelectorAll('.hero-shape');

    if (!hero || shapes.length === 0) return;

    hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const offsetX = (mouseX - centerX) / centerX;
        const offsetY = (mouseY - centerY) / centerY;

        shapes.forEach((shape, index) => {
            const speed = (index + 1) * 15;
            const x = offsetX * speed;
            const y = offsetY * speed;
            shape.style.transform = `translate(${x}px, ${y}px)`;
        });
    });

    hero.addEventListener('mouseleave', () => {
        shapes.forEach(shape => {
            shape.style.transform = 'translate(0, 0)';
            shape.style.transition = 'transform 0.5s ease-out';
        });
    });

    hero.addEventListener('mouseenter', () => {
        shapes.forEach(shape => {
            shape.style.transition = 'transform 0.1s ease-out';
        });
    });
}

/* ============================================
   SCROLL TO NEXT SECTION
   ============================================ */
function initScrollToNext() {
    const scrollIndicator = document.getElementById('heroScrollIndicator');
    if (!scrollIndicator) return;

    scrollIndicator.addEventListener('click', function () {
        const nextSection = document.querySelector('section:nth-of-type(2)');
        if (nextSection) {
            nextSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

/* ============================================
   HERO TYPING EFFECT
   ============================================ */
function initHeroTypingEffect() {
    const typingElement = document.querySelector('.hero-typing-text');
    if (!typingElement) return;

    const phrases = [
        'Expert IT Training',
        'Expert Design Services',
        'Master Top Tech Skills',
        'Live Industry Projects',
        'Career Growth Support'
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function type() {
        const currentPhrase = phrases[phraseIndex];

        if (isDeleting) {
            typingElement.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 50; // Faster deleting
        } else {
            typingElement.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 120; // Natural typing speed
        }

        if (!isDeleting && charIndex === currentPhrase.length) {
            typeSpeed = 2500; // Pause at end of phrase
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typeSpeed = 800; // Slight pause before starting next phrase
        }

        // Add a slight randomization to typing speed for "natural" feel
        const randomSpeed = typeSpeed + (Math.random() * 40 - 20);
        setTimeout(type, isDeleting && charIndex === 0 ? typeSpeed : randomSpeed);
    }

    // Start typing effect
    setTimeout(type, 1500);
}

/* ============================================
   RANDOM FLOATING CARDS
   ============================================ */
function initRandomFloatingCards() {
    const card1 = document.getElementById('floatingCard1');
    const card2 = document.getElementById('floatingCard2');
    const card3 = document.getElementById('floatingCard3');

    if (!card1 || !card2 || !card3) return;

    const items = [
        // Courses
        { icon: 'fas fa-code', text: 'Full Stack Dev', gradient: 'linear-gradient(135deg, #00B894, #00CEC9)' },
        { icon: 'fas fa-palette', text: 'UI/UX Design', gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)' },
        { icon: 'fab fa-aws', text: 'AWS Cloud', gradient: 'linear-gradient(135deg, #FF9500, #FFBE0B)' },
        { icon: 'fab fa-python', text: 'Python Dev', gradient: 'linear-gradient(135deg, #0984e3, #74b9ff)' },
        { icon: 'fas fa-infinity', text: 'DevOps', gradient: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' },
        { icon: 'fas fa-chart-bar', text: 'Data Analytics', gradient: 'linear-gradient(135deg, #00cec9, #81ecec)' },
        // Services
        { icon: 'fas fa-globe', text: 'Web Development', gradient: 'linear-gradient(135deg, #2896cd, #74b9ff)' },
        { icon: 'fas fa-bullseye', text: 'Brand Identity', gradient: 'linear-gradient(135deg, #e17055, #fdcb6e)' },
        { icon: 'fas fa-server', text: 'Cloud Solutions', gradient: 'linear-gradient(135deg, #00b894, #00cec9)' }
    ];

    function shuffle(arr) {
        return arr.sort(() => Math.random() - 0.5);
    }

    function updateCards() {
        const selected = shuffle([...items]).slice(0, 3);

        [card1, card2, card3].forEach((card, index) => {
            const item = selected[index];
            const icon = card.querySelector('i');
            const span = card.querySelector('span');

            // Fade out
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';

            setTimeout(() => {
                icon.className = item.icon;
                icon.style.background = item.gradient;
                span.textContent = item.text;

                // Fade in
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            }, 300);
        });
    }

    // Add transition for smooth effect
    [card1, card2, card3].forEach(card => {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    });

    // Update every 5 seconds
    setInterval(updateCards, 5000);
}

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

    // Also initialize curriculum module accordions
    initCurriculumAccordion();
}

/* ============================================
   CURRICULUM MODULE ACCORDIONS
   ============================================ */
function initCurriculumAccordion() {
    const modules = document.querySelectorAll('.curriculum-module');

    if (modules.length === 0) return;

    // Open the first module by default in each level
    const levels = document.querySelectorAll('.curriculum-level');
    if (levels.length > 0) {
        levels.forEach(level => {
            const firstModule = level.querySelector('.curriculum-module');
            if (firstModule) {
                firstModule.classList.add('active');
            }
        });
    } else {
        // If no levels are found, open the very first module on the page
        modules[0].classList.add('active');
    }

    // Toggle accordion on click
    modules.forEach(module => {
        const header = module.querySelector('.module-header');
        if (header) {
            header.addEventListener('click', () => {
                // Toggle current module
                module.classList.toggle('active');
            });
        }
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
                    const smsBody = `Check out this course at Abhi's Craftsoft: ${window.location.href}`;
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
        if (el.textContent.includes('©')) {
            el.textContent = el.textContent.replace(/© \d{4}/, `© ${currentYear}`);
        }
    });
}

/* ============================================
   PRIVACY PROTECTION FOR IMAGES
   ============================================ */
function initPrivacyProtection() {
    const protectedImages = document.querySelectorAll('.protected-img');
    protectedImages.forEach(img => {
        // Block right-click
        img.addEventListener('contextmenu', e => e.preventDefault());
        // Block dragging
        img.addEventListener('dragstart', e => e.preventDefault());
        // Block copy
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
        { name: 'Graphic Design', url: '/c-graphic-design/', icon: 'fas fa-swatchbook', desc: 'Master Adobe Creative Suite and visual communication.', features: ['Photoshop & Illustrator', 'Brand Identity', 'Portfolio'] },
        { name: 'UI/UX Design', url: '/c-ui-ux/', icon: 'fa-brands fa-figma', desc: 'Create stunning user interfaces and experiences.', features: ['Figma & XD', 'User Research', 'Prototyping'] },
        { name: 'Full Stack MERN', url: '/c-full-stack/', icon: 'fas fa-layer-group', desc: 'Build production-ready web applications with MERN.', features: ['React & Node.js', 'MongoDB', 'Deployment'] },
        { name: 'Python Full Stack', url: '/c-python/', icon: 'fab fa-python', desc: 'Master Python, Django, and modern web development.', features: ['Python & Django', 'REST APIs', 'Database Design'] },
        { name: 'Java Full Stack', url: '/c-java/', icon: 'fab fa-java', desc: 'Build scalable enterprise applications with Java Spring.', features: ['Spring Boot', 'Hibernate', 'Microservices'] },
        { name: 'React Development', url: '/c-react/', icon: 'fab fa-react', desc: 'Master front-end development with the React library.', features: ['Hooks & Context', 'Redux', 'Architecture'] },
        { name: 'DSA Mastery', url: '/c-dsa/', icon: 'fas fa-code-branch', desc: 'Master Algorithms and Data Structures for interviews.', features: ['Recursion', 'Graphs', 'Dynamic Prog'] },
        { name: 'SQL Mastery', url: '/c-sql/', icon: 'fa-solid fa-database', desc: 'Master databases and advanced data querying.', features: ['Complex Joins', 'Optimization', 'Stored Procs'] },
        { name: 'AI & ML', url: '/c-ai-ml/', icon: 'fa-solid fa-brain', desc: 'Build intelligent systems with data and algorithms.', features: ['Machine Learning', 'Python for AI', 'Neural Networks'] },
        { name: 'Data Analytics', url: '/c-data-analytics/', icon: 'fas fa-chart-area', desc: 'Turn raw data into meaningful business insights.', features: ['Python & SQL', 'Power BI & Tableau', 'Statistics'] },
        { name: 'DevOps Engineering', url: '/c-devops/', icon: 'fas fa-infinity', desc: 'Master CI/CD pipelines and infrastructure scaling.', features: ['Docker & K8s', 'Jenkins', 'Terraform'] },
        { name: 'AWS Cloud', url: '/c-aws/', icon: 'fab fa-aws', desc: 'Master cloud infrastructure on Amazon Web Services.', features: ['EC2 & S3', 'Lambda & IAM', 'Cloud Cert'] },
        { name: 'Microsoft Azure', url: '/c-azure/', icon: 'fab fa-microsoft', desc: 'Master cloud solutions with Microsoft Azure.', features: ['Azure AD', 'Cloud Apps', 'Cert Prep'] },
        { name: 'Cyber Security', url: '/c-cyber-security/', icon: 'fa-solid fa-user-shield', desc: 'Protect systems and data from cyber threats.', features: ['Network Security', 'Ethical Hacking', 'Defense'] },
        { name: 'DevSecOps', url: '/c-devsecops/', icon: 'fas fa-shield-alt', desc: 'Integrate security into your DevOps pipelines.', features: ['Security Audit', 'Automation', 'Vulnerability'] },
        { name: 'Salesforce Admin', url: '/c-salesforce/', icon: 'fab fa-salesforce', desc: 'Master the world#1 CRM platform and automation.', features: ['Sales Cloud', 'CRM Basics', 'Cert Prep'] },
        { name: 'Salesforce Developer', url: '/c-salesforce-developer/', icon: 'fab fa-salesforce', desc: 'Build custom apps and logic on Salesforce.', features: ['Apex', 'LWC', 'Integrations'] },
        { name: 'Salesforce Marketing Cloud', url: '/c-salesforce-marketing-cloud/', icon: 'fa-solid fa-bullhorn', desc: 'Master data-driven personalized marketing.', features: ['Journey Builder', 'Audience', 'Analytics'] },
        { name: 'Oracle Fusion Cloud', url: '/c-oracle-fusion-cloud/', icon: 'fa-solid fa-cloud', desc: 'Learn enterprise ERP solutions with Oracle.', features: ['Supply Chain', 'HR Cloud', 'Fusion Admin'] },
        { name: 'Python Programming', url: '/c-python-programming/', icon: 'fab fa-python', desc: 'Learn the core principles of Python programming.', features: ['Logic & Flow', 'Data Structs', 'OOPs'] },
        { name: 'Automation with Python', url: '/c-automation-python/', icon: 'fas fa-robot', desc: 'Automate boring tasks with Python scripting.', features: ['Web Scraping', 'File Ops', 'Bots'] },
        { name: 'Git & GitHub', url: '/c-git-github/', icon: 'fab fa-github', desc: 'Master version control and collaboration tools.', features: ['Branching', 'PR Workflows', 'Actions'] },
        { name: 'Spoken English', url: '/c-spoken-english/', icon: 'fas fa-user-ninja', desc: 'Enhance your communication and public confidence.', features: ['Fluency & Accent', 'Presentation', 'Vocabulary'] },
        { name: 'Soft Skills', url: '/c-soft-skills/', icon: 'fas fa-people-arrows', desc: 'Develop essential workplace and leadership skills.', features: ['Communication', 'Teamwork', 'Leadership'] },
        { name: 'Resume & Interview Prep', url: '/c-resume-interview/', icon: 'far fa-file-lines', desc: 'Prepare for your dream career with mock sessions.', features: ['Resume Building', 'Mock Interviews', 'ATS Proofing'] },
        { name: 'Handwriting Improvement', url: '/c-handwriting/', icon: 'fas fa-pen-nib', desc: 'Improve your handwriting and penmanship.', features: ['Strokes', 'Consistency', 'Practice'] }
    ];

    const allServices = [
        { name: 'Graphic Design', url: '/s-graphic-design/', icon: 'fas fa-swatchbook', desc: 'Stunning visuals for your brand identity.' },
        { name: 'UI/UX Design', url: '/s-ui-ux-design/', icon: 'fa-brands fa-figma', desc: 'User-centered design solution for digital products.' },
        { name: 'Web Development', url: '/s-web-development/', icon: 'fas fa-globe', desc: 'Custom, responsive websites that drive results.' },
        { name: 'Brand Identity', url: '/s-branding/', icon: 'fas fa-bullseye', desc: 'Strategic branding to set you apart.' },
        { name: 'Cloud Solutions', url: '/s-cloud-devops/', icon: 'fas fa-infinity', desc: 'Scalable infrastructure and automation.' },
        { name: 'Career Services', url: '/s-career-services/', icon: 'fas fa-users', desc: 'Expert guidance for your professional journey.' }
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

/* ============================================
    CARD MOUSE GLOW EFFECT
    ============================================ */
function initCardGlow() {
    const cards = document.querySelectorAll('.unified-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

