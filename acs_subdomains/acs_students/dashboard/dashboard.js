/* ============================================
   Student Dashboard Logic
   Craft Soft - Student Module
   ============================================ */

(function () {
    'use strict';

    // Dom Elements
    const userName = document.getElementById('user-name');
    const firstName = document.getElementById('first-name');
    const userInitials = document.getElementById('user-initials');
    const userId = document.getElementById('user-id');
    const dropdownName = document.getElementById('dropdown-name');
    const dropdownId = document.getElementById('dropdown-id');
    const dropdownInitials = document.getElementById('dropdown-initials');
    const totalPaidEl = document.getElementById('total-paid');
    const totalPendingEl = document.getElementById('total-pending');
    const nextDueEl = document.getElementById('next-due');
    const coursesList = document.getElementById('courses-list');
    const recentPayments = document.getElementById('recent-payments');

    // Account Panel
    const accountTrigger = document.querySelector('.account-trigger');
    const accountDropdown = document.getElementById('account-dropdown');
    const btnLogoutAccount = document.getElementById('btn-logout-account');
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');

    // Mobile Nav Controls
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavSheet = document.getElementById('mobile-nav-sheet');
    const mobileNavClose = document.getElementById('mobile-nav-close');

    let studentData = null;

    // Toast Utility
    const Toast = {
        show(msg, type = 'info') {
            const toast = document.getElementById('toast');
            if (!toast) return;
            const icon = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
            toast.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
            toast.className = `toast show ${type}`;
            setTimeout(() => toast.classList.remove('show'), 3000);
        },
        success(msg) { this.show(msg, 'success'); },
        error(msg) { this.show(msg, 'error'); }
    };

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

            let iconCode = 'fa-exclamation-triangle';
            if (type === 'danger') iconCode = 'fa-trash-alt';
            if (type === 'success') iconCode = 'fa-check-circle';
            this.icon.innerHTML = `<i class="fas ${iconCode}"></i>`;

            this.btnConfirm.textContent = confirmText;
            this.btnConfirm.className = `btn btn-${type === 'warning' ? 'primary' : type}`;

            this.element.style.display = 'flex';
            document.body.classList.add('modal-open');

            const close = () => {
                this.element.style.display = 'none';
                document.body.classList.remove('modal-open');
                this.btnConfirm.onclick = null;
                this.btnCancel.onclick = null;
            };

            this.btnCancel.onclick = close;
            this.btnConfirm.onclick = () => {
                if (onConfirm) onConfirm();
                close();
            };
        }
    };

    // Value Animation
    function animateValue(obj, start, end, duration, isCurrency = true) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            let current = Math.floor(progress * (end - start) + start);

            if (isCurrency) {
                obj.textContent = new Intl.NumberFormat('en-IN', {
                    style: 'currency', currency: 'INR', maximumFractionDigits: 0
                }).format(current);
            } else {
                obj.textContent = current;
            }

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Auth logic
    async function checkAuth() {
        const session = localStorage.getItem('acs_student_session');
        if (!session) {
            window.location.href = '../';
            return;
        }

        const data = JSON.parse(session);
        const loginTime = new Date(data.loginTime);
        const now = new Date();

        if ((now - loginTime) > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('acs_student_session');
            window.location.href = '../';
            return;
        }

        studentData = data;
        initDashboard();
    }

    async function initDashboard() {
        const initials = studentData.name.split(' ').map(n => n[0]).join('').toUpperCase();

        // Header
        userName.textContent = studentData.name;
        firstName.textContent = studentData.name.split(' ')[0];
        userId.textContent = studentData.student_id;
        userInitials.textContent = initials;

        // Dropdown
        if (dropdownName) dropdownName.textContent = studentData.name;
        if (dropdownId) dropdownId.textContent = studentData.student_id;
        if (dropdownInitials) dropdownInitials.textContent = initials;

        const profile = await fetchCompleteProfile();
        if (profile) {
            await fetchPayments(profile);
            await fetchEnrolledCourses(profile);

            const joinDate = profile.date_of_joining || profile.joining_date || profile.created_at;
            calculateNextDue(joinDate);
        }
    }

    function calculateNextDue(dateStr) {
        if (!dateStr) {
            nextDueEl.textContent = "Not Set";
            return;
        }
        const date = new Date(dateStr);
        const nd = new Date(date.setDate(date.getDate() + 30));
        nextDueEl.textContent = nd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    async function fetchCompleteProfile() {
        try {
            const { data, error } = await window.supabaseClient
                .from('students')
                .select('*')
                .eq('id', studentData.id)
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Profile fetch error:', err);
            return null;
        }
    }

    async function fetchPayments(profile) {
        try {
            const { data: payments, error } = await window.supabaseClient
                .from('payments')
                .select('*')
                .eq('student_id', studentData.id)
                .order('payment_date', { ascending: false });

            if (error) throw error;

            let totalPaid = 0;
            payments.forEach(p => totalPaid += (p.amount_paid || 0));

            animateValue(totalPaidEl, 0, totalPaid, 1000);

            const finalFee = profile.final_fee || 0;
            const pending = finalFee - totalPaid;
            animateValue(totalPendingEl, 0, pending > 0 ? pending : 0, 1000);

            if (pending > 500) {
                document.getElementById('pending-alert').style.display = 'block';
            }

            renderRecentPayments(payments.slice(0, 3));
        } catch (err) {
            console.error('Payment fetch error:', err);
        }
    }

    async function fetchEnrolledCourses(profile) {
        try {
            const codes = profile.courses || [];
            if (codes.length === 0) {
                renderCourses([]);
                return;
            }
            const { data, error } = await window.supabaseClient
                .from('courses')
                .select('course_code, course_name')
                .in('course_code', codes);

            if (error) throw error;
            renderCourses(data);
        } catch (err) {
            console.error('Courses fetch error:', err);
        }
    }

    function renderCourses(courses) {
        coursesList.innerHTML = '';
        if (courses.length === 0) {
            coursesList.innerHTML = '<p class="loading-state">No active enrollments.</p>';
            return;
        }
        courses.forEach(c => {
            const div = document.createElement('div');
            div.className = 'course-card';
            div.innerHTML = `
                <div class="course-icon"><i class="fas fa-graduation-cap"></i></div>
                <div class="course-info">
                    <h4>${c.course_name}</h4>
                    <span class="status">ACTIVE</span>
                </div>
            `;
            coursesList.appendChild(div);
        });
    }

    function renderRecentPayments(payments) {
        recentPayments.innerHTML = '';
        if (payments.length === 0) {
            recentPayments.innerHTML = '<p class="loading-state">No records.</p>';
            return;
        }
        payments.forEach(p => {
            const div = document.createElement('div');
            div.className = 'payment-item';
            div.innerHTML = `
                <div>
                    <strong>${p.payment_mode || 'Online'}</strong>
                    <div class="date">${new Date(p.payment_date).toLocaleDateString('en-IN')}</div>
                </div>
                <div class="amt">+ ₹${(p.amount_paid || 0).toLocaleString('en-IN')}</div>
            `;
            recentPayments.appendChild(div);
        });
    }

    // Account Dropdown Toggle
    if (accountTrigger && accountDropdown) {
        accountTrigger.addEventListener('click', () => {
            accountDropdown.classList.toggle('open');
            accountTrigger.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!accountTrigger.contains(e.target) && !accountDropdown.contains(e.target)) {
                accountDropdown.classList.remove('open');
                accountTrigger.classList.remove('open');
            }
        });
    }

    // Mobile Nav Toggle (Slide-up Sheet)
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

    // Logout with Confirmation
    function handleLogout() {
        closeMobileNav();
        if (accountDropdown) accountDropdown.classList.remove('open');
        Modal.show({
            title: "Logout?",
            message: "Are you sure you want to exit your student portal?",
            type: "warning",
            confirmText: "Yes, Logout",
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
