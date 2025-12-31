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

    // Render notification bell
    renderNotificationBell();

    // Show skeleton loading
    showSkeletonLoading();

    // Load Dashboard Data
    await loadStats();
    await loadNotifications();

    // Subscribe to real-time updates
    subscribeToActivities();
});

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

// =====================
// Notification Bell
// =====================
function renderNotificationBell() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    const bellHTML = `
        <div class="notification-wrapper">
            <button class="notification-btn" id="notification-btn">
                <i class="fa-solid fa-bell"></i>
                <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
            </button>
            <div class="notification-dropdown" id="notification-dropdown">
                <div class="notification-header">
                    <span><i class="fa-solid fa-bell"></i> Recent Activities</span>
                    <button class="notification-clear-all" id="clear-all-notifications">Clear All</button>
                </div>
                <div class="notification-list" id="notification-list">
                    <div class="notification-empty">
                        <i class="fa-solid fa-bell-slash"></i>
                        <p>No recent activities</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Insert before account panel
    const accountPanel = document.getElementById('account-panel-container');
    if (accountPanel) {
        accountPanel.insertAdjacentHTML('beforebegin', bellHTML);
    } else {
        headerActions.insertAdjacentHTML('afterbegin', bellHTML);
    }

    // Bind events
    const btn = document.getElementById('notification-btn');
    const dropdown = document.getElementById('notification-dropdown');

    btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown?.classList.toggle('open');
        // Close account dropdown if open
        document.querySelector('.account-dropdown')?.classList.remove('open');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-wrapper')) {
            dropdown?.classList.remove('open');
        }
    });

    // Clear all
    document.getElementById('clear-all-notifications')?.addEventListener('click', clearAllActivities);
}

// =====================
// Notifications/Activities
// =====================
async function loadNotifications() {
    const list = document.getElementById('notification-list');
    const badge = document.getElementById('notification-badge');

    try {
        const { data: activities, error } = await window.supabaseClient
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const count = activities?.length || 0;
        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }

        renderNotifications(activities || []);
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function subscribeToActivities() {
    window.supabaseClient
        .channel('activities-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => {
            loadNotifications();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activities' }, () => {
            loadNotifications();
        })
        .subscribe();
}

async function addActivity(type, name, link = null) {
    await window.AdminUtils.Activity.add(type, name, link);
}

async function removeActivity(id) {
    try {
        await window.supabaseClient.from('activities').delete().eq('id', id);
        await loadNotifications();
    } catch (error) {
        console.error('Error removing activity:', error);
    }
}

async function clearAllActivities() {
    const { Toast } = window.AdminUtils;
    try {
        await window.supabaseClient.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await loadNotifications();
        Toast.success('Cleared', 'All activities cleared');
    } catch (error) {
        console.error('Error clearing activities:', error);
        Toast.error('Error', 'Could not clear activities');
    }
}

function getRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yest';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getActivityIcon(type) {
    const icons = {
        'student_added': { icon: 'fa-user-graduate', class: 'notif-icon-student' },
        'tutor_added': { icon: 'fa-chalkboard-user', class: 'notif-icon-tutor' },
        'course_added': { icon: 'fa-book-bookmark', class: 'notif-icon-course' },
        'fee_updated': { icon: 'fa-book-bookmark', class: 'notif-icon-course' },
        'fee_recorded': { icon: 'fa-indian-rupee-sign', class: 'notif-icon-fee' },
        'receipt_generated': { icon: 'fa-receipt', class: 'notif-icon-receipt' },
        'inquiry_added': { icon: 'fa-phone', class: 'notif-icon-inquiry' },
        'demo_scheduled': { icon: 'fa-calendar-check', class: 'notif-icon-demo' }
    };
    return icons[type] || { icon: 'fa-circle-info', class: 'notif-icon-student' };
}

function getActivityText(type) {
    const texts = {
        'student_added': 'Student added',
        'tutor_added': 'Tutor added',
        'course_added': 'Course added',
        'fee_updated': 'Fee updated',
        'fee_recorded': 'Fee recorded',
        'receipt_generated': 'Receipt generated',
        'inquiry_added': 'Inquiry added',
        'demo_scheduled': 'Demo scheduled'
    };
    return texts[type] || 'Activity';
}

function renderNotifications(activities) {
    const list = document.getElementById('notification-list');

    if (!activities || activities.length === 0) {
        list.innerHTML = `
            <div class="notification-empty">
                <i class="fa-solid fa-bell-slash"></i>
                <p>No recent activities</p>
            </div>
        `;
        return;
    }

    list.innerHTML = activities.map(a => {
        const iconInfo = getActivityIcon(a.activity_type);
        const text = getActivityText(a.activity_type);
        const time = getRelativeTime(a.created_at);

        return `
            <div class="notification-item" data-link="${a.activity_link || ''}" data-id="${a.id}">
                <div class="notif-icon ${iconInfo.class}">
                    <i class="fa-solid ${iconInfo.icon}"></i>
                </div>
                <div class="notif-content">
                    <span class="notif-text">${text}: <strong>${a.activity_name}</strong></span>
                    <span class="notif-time">${time}</span>
                </div>
                <button class="notif-remove" title="Remove">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
    }).join('');

    // Bind click events
    list.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.notif-remove')) return;
            const link = item.dataset.link;
            if (link) window.location.href = link;
        });
    });

    // Bind remove buttons
    list.querySelectorAll('.notif-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('.notification-item').dataset.id;
            removeActivity(id);
        });
    });
}

// Export addActivity for other modules
window.DashboardActivities = {
    add: (type, name, link) => window.AdminUtils.Activity.add(type, name, link)
};
