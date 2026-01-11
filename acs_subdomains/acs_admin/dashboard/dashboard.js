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

    // Initialize Recent Activity section
    initRecentActivity();
});

function bindStatCardLinks() {
    document.getElementById('stat-students')?.addEventListener('click', () => {
        window.location.href = '../students-clients/students/';
    });
    document.getElementById('stat-courses')?.addEventListener('click', () => {
        window.location.href = '../courses-services/courses/';
    });
    document.getElementById('stat-tutors')?.addEventListener('click', () => {
        window.location.href = '../tutors/';
    });
    document.getElementById('stat-services')?.addEventListener('click', () => {
        window.location.href = '../courses-services/services/';
    });
    document.getElementById('stat-clients')?.addEventListener('click', () => {
        window.location.href = '../students-clients/clients/';
    });
}

// =====================
// Skeleton Loading
// =====================
function showSkeletonLoading() {
    const statElements = ['total-students', 'total-courses', 'total-tutors', 'total-services', 'total-clients'];
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

        // Active Services (Master Table)
        const { count: serviceCount } = await window.supabaseClient
            .from('services')
            .select('*', { count: 'exact', head: true });
        const servicesEl = document.getElementById('total-services');
        servicesEl.textContent = '0';
        animateCount(servicesEl, serviceCount || 0);

        // Total Clients
        const { count: clientCount } = await window.supabaseClient
            .from('clients')
            .select('*', { count: 'exact', head: true });
        const clientsEl = document.getElementById('total-clients');
        clientsEl.textContent = '0';
        animateCount(clientsEl, clientCount || 0);

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// =====================
// Recent Activity Section
// =====================
function initRecentActivity() {
    const activityList = document.getElementById('recentActivityList');
    const clearAllBtn = document.getElementById('clearAllActivityBtn');

    if (!activityList) return;

    // Render activities
    renderRecentActivity();

    // Clear all button
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (window.AdminUtils && window.AdminUtils.Modal) {
                window.AdminUtils.Modal.confirm(
                    'Clear All Activity',
                    'Are you sure you want to clear all recent activity?',
                    () => {
                        clearAllActivity();
                        renderRecentActivity();
                    }
                );
            } else {
                clearAllActivity();
                renderRecentActivity();
            }
        });
    }
}

function getUnreadNotifications() {
    const stored = localStorage.getItem('craftsoft_notifications');
    if (!stored) return [];

    try {
        const all = JSON.parse(stored);
        // Return only unread notifications from last 24 hours
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return all.filter(n => !n.read && n.timestamp > dayAgo);
    } catch (e) {
        return [];
    }
}

function clearAllActivity() {
    const stored = localStorage.getItem('craftsoft_notifications');
    if (!stored) return;

    try {
        const all = JSON.parse(stored);
        // Mark all as read
        all.forEach(n => n.read = true);
        localStorage.setItem('craftsoft_notifications', JSON.stringify(all));
    } catch (e) {
        console.error('Error clearing activity:', e);
    }
}

function deleteActivity(id) {
    const stored = localStorage.getItem('craftsoft_notifications');
    if (!stored) return;

    try {
        let all = JSON.parse(stored);
        // Mark as read (which removes it from unread list)
        const notification = all.find(n => n.id == id);
        if (notification) {
            notification.read = true;
            localStorage.setItem('craftsoft_notifications', JSON.stringify(all));
        }
        renderRecentActivity();
    } catch (e) {
        console.error('Error deleting activity:', e);
    }
}

function handleActivityClick(id, link) {
    // Mark as read
    deleteActivity(id);

    // Navigate to link
    if (link) {
        window.location.href = link;
    }
}

function getActivityIcon(type) {
    const icons = {
        inquiry: 'fas fa-phone-volume',
        payment: 'fas fa-money-bill-transfer',
        student: 'fas fa-user-graduate',
        tutor: 'fas fa-chalkboard-user',
        course: 'fas fa-book-bookmark',
        service: 'fas fa-wrench'
    };
    return icons[type] || 'fas fa-bell';
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

function renderRecentActivity() {
    const activityList = document.getElementById('recentActivityList');
    const clearAllBtn = document.getElementById('clearAllActivityBtn');
    if (!activityList) return;

    const unread = getUnreadNotifications();

    // Hide/show clear all button based on activity count
    if (clearAllBtn) {
        clearAllBtn.style.display = unread.length > 0 ? 'flex' : 'none';
    }

    if (unread.length === 0) {
        activityList.innerHTML = `
            <div class="activity-empty">
                <i class="fa-solid fa-inbox"></i>
                <p class="activity-empty-title">All caught up!</p>
                <p class="activity-empty-subtitle">No new activity to show</p>
            </div>
        `;
        return;
    }

    activityList.innerHTML = unread.slice(0, 8).map(n => `
        <div class="activity-item" onclick="handleActivityClick('${n.id}', '${n.link || ''}')">
            <div class="activity-icon ${n.type}">
                <i class="${getActivityIcon(n.type)}"></i>
            </div>
            <div class="activity-content">
                <p><strong>${n.title}</strong> ${n.message}</p>
                <span class="activity-time">${getTimeAgo(n.timestamp)}</span>
            </div>
            <button class="activity-delete-btn" onclick="event.stopPropagation(); deleteActivity('${n.id}')" title="Dismiss">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

// Export for global access
window.deleteActivity = deleteActivity;
window.handleActivityClick = handleActivityClick;
window.renderRecentActivity = renderRecentActivity;

// Export addActivity for other modules
window.DashboardActivities = {
    add: (type, name, link) => window.AdminUtils.Activity.add(type, name, link)
};

