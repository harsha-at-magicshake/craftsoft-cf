/* ============================================
   My Courses Page Logic
   Craft Soft - Student Module
   ============================================ */

(function () {
    'use strict';

    // Dom Elements
    const userNameEl = document.getElementById('user-name');
    const userInitialsEl = document.getElementById('user-initials');
    const userIdEl = document.getElementById('user-id');
    const coursesList = document.getElementById('courses-list');
    const accountTrigger = document.querySelector('.account-trigger');
    const accountDropdown = document.getElementById('account-dropdown');
    const btnLogoutAccount = document.getElementById('btn-logout-account');

    // Mobile Nav Controls
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavSheet = document.getElementById('mobile-nav-sheet');
    const mobileNavClose = document.getElementById('mobile-nav-close');
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');

    let studentData = null;

    // Modal Utility
    const Modal = {
        element: document.getElementById('modal-overlay'),
        title: document.getElementById('modal-title'),
        message: document.getElementById('modal-message'),
        icon: document.getElementById('modal-icon'),
        btnConfirm: document.getElementById('modal-confirm'),
        btnCancel: document.getElementById('modal-cancel'),

        show({ title, message, type = 'warning', confirmText = 'Confirm', onConfirm }) {
            this.title.textContent = title;
            this.message.textContent = message;
            this.icon.className = `modal-icon ${type}`;
            this.btnConfirm.textContent = confirmText;
            this.element.style.display = 'flex';
            document.body.classList.add('modal-open');

            const close = () => {
                this.element.style.display = 'none';
                document.body.classList.remove('modal-open');
            };

            this.btnCancel.onclick = close;
            this.btnConfirm.onclick = () => {
                if (onConfirm) onConfirm();
                close();
            };
        }
    };

    // Check Auth
    async function checkAuth() {
        const session = localStorage.getItem('acs_student_session');
        if (!session) {
            window.location.href = '../';
            return;
        }
        studentData = JSON.parse(session);
        initPage();
    }

    async function initPage() {
        userNameEl.textContent = studentData.name;
        userIdEl.textContent = studentData.student_id;
        userInitialsEl.textContent = studentData.name.split(' ').map(n => n[0]).join('').toUpperCase();

        await loadCourses();
    }

    async function loadCourses() {
        try {
            // Get student profile with course discounts
            const { data: profile, error: pErr } = await window.supabaseClient
                .from('students')
                .select('courses, course_tutors, course_discounts')
                .eq('id', studentData.id)
                .single();

            if (pErr) throw pErr;

            const codes = profile.courses || [];
            if (codes.length === 0) {
                renderEmptyState();
                return;
            }

            // Fetch course details
            const { data: courses, error: cErr } = await window.supabaseClient
                .from('courses')
                .select('course_code, course_name, fee')
                .in('course_code', codes);

            if (cErr) throw cErr;

            // Fetch tutor names - try both id and tutor_id columns
            const tutorIds = Object.values(profile.course_tutors || {}).filter(Boolean);
            let tutorsMap = {};
            if (tutorIds.length > 0) {
                // Try tutor_id first
                let { data: tutors } = await window.supabaseClient
                    .from('tutors')
                    .select('tutor_id, full_name')
                    .in('tutor_id', tutorIds);

                if (tutors && tutors.length > 0) {
                    tutors.forEach(t => tutorsMap[t.tutor_id] = t.full_name);
                } else {
                    // Fallback: try id column
                    const { data: tutors2 } = await window.supabaseClient
                        .from('tutors')
                        .select('id, full_name')
                        .in('id', tutorIds);
                    tutors2?.forEach(t => tutorsMap[t.id] = t.full_name);
                }
            }

            renderCourses(courses, profile.course_tutors || {}, tutorsMap, profile.course_discounts || {});

        } catch (err) {
            console.error('Error loading courses:', err);
            coursesList.innerHTML = '<p class="loading-state">Error loading courses.</p>';
        }
    }

    function renderCourses(courses, tutorAssignments, tutorsMap, courseDiscounts) {
        coursesList.innerHTML = '';

        courses.forEach(c => {
            const tutorId = tutorAssignments[c.course_code];
            const tutorName = tutorId && tutorsMap[tutorId] ? tutorsMap[tutorId] : 'Not Assigned';

            // Calculate discounted fee
            const baseFee = c.fee || 0;
            const discount = courseDiscounts[c.course_code] || 0;
            const finalFee = baseFee - discount;

            const card = document.createElement('div');
            card.className = 'course-card-full';
            card.innerHTML = `
                <div class="course-header">
                    <h3>${c.course_name}</h3>
                    <span class="course-code">${c.course_code}</span>
                </div>
                <div class="course-body">
                    <div class="course-detail">
                        <i class="fas fa-chalkboard-teacher"></i>
                        <span>Tutor: <strong>${tutorName}</strong></span>
                    </div>
                    <div class="course-detail">
                        <i class="fas fa-indian-rupee-sign"></i>
                        <span>Your Fee: <strong>₹${finalFee.toLocaleString('en-IN')}</strong></span>
                        ${discount > 0 ? `<span class="discount-badge">-₹${discount.toLocaleString('en-IN')}</span>` : ''}
                    </div>
                    <div class="course-status-badge">
                        <i class="fas fa-check-circle"></i>
                        Enrolled
                    </div>
                </div>
            `;
            coursesList.appendChild(card);
        });
    }

    function renderEmptyState() {
        coursesList.innerHTML = `
            <div class="empty-courses">
                <i class="fas fa-book-open"></i>
                <h3>No Courses Enrolled</h3>
                <p>You are not enrolled in any courses yet. Please contact the office.</p>
            </div>
        `;
    }

    // Account Dropdown Toggle
    if (accountTrigger && accountDropdown) {
        accountTrigger.addEventListener('click', () => {
            accountDropdown.classList.toggle('open');
            accountTrigger.classList.toggle('open');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!accountTrigger.contains(e.target) && !accountDropdown.contains(e.target)) {
                accountDropdown.classList.remove('open');
                accountTrigger.classList.remove('open');
            }
        });
    }

    // Mobile Nav Toggle
    function openMobileNav() {
        mobileNavOverlay.classList.add('open');
        mobileNavSheet.classList.add('open');
        document.body.classList.add('modal-open');
    }

    function closeMobileNav() {
        mobileNavOverlay.classList.remove('open');
        mobileNavSheet.classList.remove('open');
        document.body.classList.remove('modal-open');
    }

    mobileMenuBtn.addEventListener('click', openMobileNav);
    mobileNavClose.addEventListener('click', closeMobileNav);
    mobileNavOverlay.addEventListener('click', closeMobileNav);

    // Logout
    function handleLogout() {
        closeMobileNav();
        Modal.show({
            title: "Logout?",
            message: "Are you sure you want to end your session?",
            type: "warning",
            confirmText: "Logout",
            onConfirm: () => {
                localStorage.removeItem('acs_student_session');
                window.location.href = '../';
            }
        });
    }

    if (btnLogoutAccount) btnLogoutAccount.addEventListener('click', handleLogout);
    if (btnLogoutMobile) btnLogoutMobile.addEventListener('click', handleLogout);

    checkAuth();

})();
