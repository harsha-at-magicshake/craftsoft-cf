/* ============================================
   My Courses Page Logic
   Craft Soft - Student Module
   ============================================ */

(function () {
    'use strict';

    // Dom Elements
    const coursesList = document.getElementById('courses-list');
    // Mobile Nav Managed by StudentSidebar

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

    // Check Auth with security protections
    async function checkAuth() {
        // History protection
        history.pushState(null, '', location.href);
        window.addEventListener('popstate', () => history.pushState(null, '', location.href));
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !localStorage.getItem('acs_student_session')) {
                window.location.replace('../');
            }
        });

        const session = localStorage.getItem('acs_student_session');
        if (!session) {
            window.location.replace('../');
            return;
        }
        studentData = JSON.parse(session);
        initPage();
    }

    async function initPage() {
        if (window.StudentSidebar) {
            window.StudentSidebar.init('courses');
            window.StudentSidebar.renderAccountPanel(studentData);
        }

        const header = document.getElementById('header-container');
        if (header && window.StudentHeader) {
            header.innerHTML = window.StudentHeader.render('My Courses');
        }

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

            // Fetch tutor names using tutor_id column (not UUID id)
            const tutorIds = Object.values(profile.course_tutors || {}).filter(Boolean);
            let tutorsMap = {};

            if (tutorIds.length > 0) {
                const { data: tutors, error: tErr } = await window.supabaseClient
                    .from('tutors')
                    .select('tutor_id, full_name')
                    .in('tutor_id', tutorIds);

                if (!tErr && tutors) {
                    tutors.forEach(t => tutorsMap[t.tutor_id] = t.full_name);
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

    // Account Dropdown Toggle with Backdrop
    const accountBackdrop = document.getElementById('account-backdrop');

    if (accountTrigger && accountDropdown) {
        accountTrigger.addEventListener('click', () => {
            const isOpen = accountDropdown.classList.toggle('open');
            accountTrigger.classList.toggle('open');
            if (accountBackdrop) accountBackdrop.classList.toggle('open', isOpen);
        });

        // Close on backdrop click
        if (accountBackdrop) {
            accountBackdrop.addEventListener('click', () => {
                accountDropdown.classList.remove('open');
                accountTrigger.classList.remove('open');
                accountBackdrop.classList.remove('open');
            });
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!accountTrigger.contains(e.target) && !accountDropdown.contains(e.target)) {
                accountDropdown.classList.remove('open');
                accountTrigger.classList.remove('open');
                if (accountBackdrop) accountBackdrop.classList.remove('open');
            }
        });
    }


    // Mobile Nav handled by StudentSidebar

    // Logout
    window.handleLogout = function () {
        if (window.StudentSidebar && window.StudentSidebar.closeMobileNav) {
            window.StudentSidebar.closeMobileNav();
        }

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
    };

    checkAuth();
})();
