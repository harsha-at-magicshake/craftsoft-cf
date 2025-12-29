// Dashboard Module - Real-time with Supabase

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
    await loadActivities();

    // Subscribe to real-time updates
    subscribeToActivities();

    // Bind Clear All
    document.getElementById('clear-all-activities')?.addEventListener('click', clearAllActivities);
});

// =====================
// Skeleton Loading
// =====================
function showSkeletonLoading() {
    // Stats skeleton
    document.getElementById('total-students').innerHTML = '<span class="skeleton skeleton-text" style="width:40px;height:28px;display:inline-block;"></span>';
    document.getElementById('total-courses').innerHTML = '<span class="skeleton skeleton-text" style="width:40px;height:28px;display:inline-block;"></span>';
    document.getElementById('total-tutors').innerHTML = '<span class="skeleton skeleton-text" style="width:40px;height:28px;display:inline-block;"></span>';
    document.getElementById('demos-today').innerHTML = '<span class="skeleton skeleton-text" style="width:40px;height:28px;display:inline-block;"></span>';
    document.getElementById('joined-week').innerHTML = '<span class="skeleton skeleton-text" style="width:40px;height:28px;display:inline-block;"></span>';

    // Activities skeleton
    const list = document.getElementById('activities-list');
    list.innerHTML = `
        <div class="activity-item skeleton-activity">
            <div class="skeleton skeleton-circle" style="width:40px;height:40px;border-radius:10px;"></div>
            <div class="activity-content">
                <div class="skeleton skeleton-text" style="width:180px;height:16px;margin-bottom:6px;"></div>
                <div class="skeleton skeleton-text" style="width:80px;height:12px;"></div>
            </div>
        </div>
        <div class="activity-item skeleton-activity">
            <div class="skeleton skeleton-circle" style="width:40px;height:40px;border-radius:10px;"></div>
            <div class="activity-content">
                <div class="skeleton skeleton-text" style="width:200px;height:16px;margin-bottom:6px;"></div>
                <div class="skeleton skeleton-text" style="width:60px;height:12px;"></div>
            </div>
        </div>
        <div class="activity-item skeleton-activity">
            <div class="skeleton skeleton-circle" style="width:40px;height:40px;border-radius:10px;"></div>
            <div class="activity-content">
                <div class="skeleton skeleton-text" style="width:160px;height:16px;margin-bottom:6px;"></div>
                <div class="skeleton skeleton-text" style="width:90px;height:12px;"></div>
            </div>
        </div>
    `;
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
        document.getElementById('total-students').textContent = studentCount || 0;

        // Active Courses
        const { count: courseCount } = await window.supabaseClient
            .from('courses')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');
        document.getElementById('total-courses').textContent = courseCount || 0;

        // Total Tutors
        const { count: tutorCount } = await window.supabaseClient
            .from('tutors')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');
        document.getElementById('total-tutors').textContent = tutorCount || 0;

        // Demos Today
        const today = new Date().toISOString().split('T')[0];
        const { count: demosToday } = await window.supabaseClient
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('demo_scheduled', true)
            .eq('demo_date', today);
        document.getElementById('demos-today').textContent = demosToday || 0;

        // Students Joined This Week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: joinedWeek } = await window.supabaseClient
            .from('students')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo.toISOString());
        document.getElementById('joined-week').textContent = joinedWeek || 0;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// =====================
// Activities - Supabase Real-time
// =====================
async function loadActivities() {
    const list = document.getElementById('activities-list');

    try {
        const { data: activities, error } = await window.supabaseClient
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        renderActivities(activities || []);
    } catch (error) {
        console.error('Error loading activities:', error);
        list.innerHTML = '<div class="activities-empty"><p>Could not load activities</p></div>';
    }
}

function subscribeToActivities() {
    window.supabaseClient
        .channel('activities-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, (payload) => {
            // Reload activities on new insert
            loadActivities();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activities' }, () => {
            loadActivities();
        })
        .subscribe();
}

async function addActivity(type, name, link = null) {
    try {
        const session = await window.supabaseConfig.getSession();
        await window.supabaseClient.from('activities').insert({
            activity_type: type,
            activity_name: name,
            activity_link: link,
            admin_id: session?.user?.id || null
        });
    } catch (error) {
        console.error('Error adding activity:', error);
    }
}

async function removeActivity(id) {
    try {
        await window.supabaseClient.from('activities').delete().eq('id', id);
        await loadActivities();
    } catch (error) {
        console.error('Error removing activity:', error);
    }
}

async function clearAllActivities() {
    const { Toast } = window.AdminUtils;
    try {
        await window.supabaseClient.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await loadActivities();
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

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getActivityIcon(type) {
    const icons = {
        'student_added': { icon: 'fa-user-graduate', class: 'activity-icon-student' },
        'tutor_added': { icon: 'fa-chalkboard-user', class: 'activity-icon-tutor' },
        'course_added': { icon: 'fa-book-bookmark', class: 'activity-icon-course' },
        'fee_updated': { icon: 'fa-book-bookmark', class: 'activity-icon-course' },
        'fee_recorded': { icon: 'fa-indian-rupee-sign', class: 'activity-icon-fee' },
        'receipt_generated': { icon: 'fa-receipt', class: 'activity-icon-receipt' },
        'inquiry_added': { icon: 'fa-phone', class: 'activity-icon-inquiry' },
        'demo_scheduled': { icon: 'fa-calendar-check', class: 'activity-icon-demo' }
    };
    return icons[type] || { icon: 'fa-circle-info', class: 'activity-icon-student' };
}

function getActivityText(type) {
    const texts = {
        'student_added': 'Student added',
        'tutor_added': 'Tutor added',
        'course_added': 'Course added',
        'fee_updated': 'Course fee updated',
        'fee_recorded': 'Fee recorded',
        'receipt_generated': 'Receipt generated',
        'inquiry_added': 'Inquiry added',
        'demo_scheduled': 'Demo scheduled'
    };
    return texts[type] || 'Activity';
}

function renderActivities(activities) {
    const list = document.getElementById('activities-list');

    if (!activities || activities.length === 0) {
        list.innerHTML = `
            <div class="activities-empty">
                <i class="fa-solid fa-clock-rotate-left"></i>
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
            <div class="activity-item" data-link="${a.activity_link || ''}" data-id="${a.id}">
                <div class="activity-icon ${iconInfo.class}">
                    <i class="fa-solid ${iconInfo.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${text}: <strong>${a.activity_name}</strong></div>
                    <div class="activity-time">${time}</div>
                </div>
                <button class="activity-remove" title="Remove">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
    }).join('');

    // Bind click events
    list.querySelectorAll('.activity-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.activity-remove')) return;
            const link = item.dataset.link;
            if (link) window.location.href = link;
        });
    });

    // Bind remove buttons
    list.querySelectorAll('.activity-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('.activity-item').dataset.id;
            removeActivity(id);
        });
    });
}

// Export addActivity for other modules
window.DashboardActivities = {
    add: addActivity
};
