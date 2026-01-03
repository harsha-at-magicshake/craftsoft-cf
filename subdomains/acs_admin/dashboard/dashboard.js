// Dashboard Module - Real-time with Notification Bell

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    AdminSidebar.init('dashboard');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Dashboard');
    }

    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    // Show skeleton loading
    showSkeletonLoading();

    // Load Dashboard Data
    await loadStats();

    // Bind navigation to stat cards
    bindStatCardLinks();
});

function bindStatCardLinks() {
    document.getElementById('stat-students')?.addEventListener('click', () => {
        window.location.href = '../students/';
    });
    document.getElementById('stat-courses')?.addEventListener('click', () => {
        window.location.href = '../courses/';
    });
    document.getElementById('stat-tutors')?.addEventListener('click', () => {
        window.location.href = '../tutors/';
    });
}

// =====================
// Skeleton Loading
// =====================
function showSkeletonLoading() {
    const statElements = ['total-students', 'total-courses', 'total-tutors', 'demos-today', 'joined-week'];
    statElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<span class="skeleton skeleton-text" style="width:40px;height:28px;display:inline-block;"></span>';
        }
    });
}

// =====================
// Count-Up Animation
// =====================
function animateCount(element, target, duration = 1500) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }

    requestAnimationFrame(update);
}

// =====================
// Stats Loading
// =====================
async function loadStats() {
    try {
        // Total Students
        const { count: studentCount } = await window.supabaseClient
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');
        const studentsEl = document.getElementById('total-students');
        studentsEl.textContent = '0';
        animateCount(studentsEl, studentCount || 0);

        // Active Courses
        const { count: courseCount } = await window.supabaseClient
            .from('courses')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');
        const coursesEl = document.getElementById('total-courses');
        coursesEl.textContent = '0';
        animateCount(coursesEl, courseCount || 0);

        // Total Tutors
        const { count: tutorCount } = await window.supabaseClient
            .from('tutors')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');
        const tutorsEl = document.getElementById('total-tutors');
        tutorsEl.textContent = '0';
        animateCount(tutorsEl, tutorCount || 0);

        // Demos Today
        const today = new Date().toISOString().split('T')[0];
        const { count: demosToday } = await window.supabaseClient
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('demo_scheduled', true)
            .eq('demo_date', today);
        const demosEl = document.getElementById('demos-today');
        demosEl.textContent = '0';
        animateCount(demosEl, demosToday || 0);

        // Students Joined This Week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: joinedWeek } = await window.supabaseClient
            .from('students')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo.toISOString());
        const joinedEl = document.getElementById('joined-week');
        joinedEl.textContent = '0';
        animateCount(joinedEl, joinedWeek || 0);

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Export addActivity for other modules
window.DashboardActivities = {
    add: (type, name, link) => window.AdminUtils.Activity.add(type, name, link)
};
