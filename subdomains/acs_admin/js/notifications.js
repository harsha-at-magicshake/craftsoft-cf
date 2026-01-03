/* ============================================
   NOTIFICATIONS System - Real-time Updates
   ============================================ */

// Notification state
let notifications = [];
let unreadCount = 0;

// Initialize notifications system
function initNotifications() {
    createNotificationBell();
    createToastContainer();
    loadNotifications();
    setupRealtimeSubscriptions();
}

// Create notification bell in header
function createNotificationBell() {
    const header = document.querySelector('.admin-header .header-actions') ||
        document.querySelector('.admin-header');

    if (!header) {
        // Retry after a short delay to wait for dynamic header rendering
        setTimeout(createNotificationBell, 100);
        return;
    }

    if (document.querySelector('.notification-bell')) return;

    const bellHTML = `
        <div class="notification-bell">
            <button class="notification-bell-btn" id="notificationBellBtn" aria-label="Notifications">
                <i class="fas fa-bell"></i>
                <span class="notification-badge hidden" id="notificationBadge">0</span>
            </button>
            <div class="notification-dropdown" id="notificationDropdown">
                <div class="notification-header">
                    <h4>Notifications</h4>
                    <button class="mark-all-read" onclick="markAllAsRead()">Mark all read</button>
                </div>
                <div class="notification-list" id="notificationList">
                    <div class="notification-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>No new notifications</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Insert before logout button or at end
    const logoutBtn = header.querySelector('.logout-btn') || header.querySelector('a[href*="logout"]');
    if (logoutBtn) {
        logoutBtn.insertAdjacentHTML('beforebegin', bellHTML);
    } else {
        header.insertAdjacentHTML('beforeend', bellHTML);
    }

    // Add click handler
    const bellBtn = document.getElementById('notificationBellBtn');
    const dropdown = document.getElementById('notificationDropdown');

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-bell')) {
            dropdown.classList.remove('active');
        }
    });
}

// Create toast container
function createToastContainer() {
    if (document.querySelector('.toast-container')) return;

    const container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toastContainer';
    document.body.appendChild(container);
}

// Load recent notifications from localStorage
function loadNotifications() {
    const stored = localStorage.getItem('craftsoft_notifications');
    if (stored) {
        try {
            notifications = JSON.parse(stored);
            // Keep only last 24 hours
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
            notifications = notifications.filter(n => n.timestamp > dayAgo);
            updateNotificationUI();
        } catch (e) {
            notifications = [];
        }
    }
}

// Save notifications to localStorage
function saveNotifications() {
    localStorage.setItem('craftsoft_notifications', JSON.stringify(notifications.slice(0, 50)));
}

// Add new notification
function addNotification(type, title, message, link) {
    const notification = {
        id: Date.now(),
        type,
        title,
        message,
        link,
        timestamp: Date.now(),
        read: false
    };

    notifications.unshift(notification);
    saveNotifications();
    updateNotificationUI();
    showToast(type, title, message);
}

// Update notification UI
function updateNotificationUI() {
    const list = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    const bellBtn = document.getElementById('notificationBellBtn');

    if (!list) return;

    unreadCount = notifications.filter(n => !n.read).length;

    // Update badge
    if (badge) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.classList.toggle('hidden', unreadCount === 0);
    }

    if (bellBtn) {
        bellBtn.classList.toggle('has-notifications', unreadCount > 0);
    }

    // Update list
    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No new notifications</p>
            </div>
        `;
        return;
    }

    list.innerHTML = notifications.slice(0, 10).map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" onclick="handleNotificationClick('${n.id}', '${n.link}')">
            <div class="notification-icon ${n.type}">
                <i class="${getNotificationIcon(n.type)}"></i>
            </div>
            <div class="notification-content">
                <p><strong>${n.title}</strong> ${n.message}</p>
                <span class="notification-time">${getTimeAgo(n.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

// Get icon for notification type
function getNotificationIcon(type) {
    const icons = {
        inquiry: 'fas fa-phone-volume',
        payment: 'fas fa-money-bill-transfer',
        student: 'fas fa-user-graduate',
        tutor: 'fas fa-chalkboard-user',
        course: 'fas fa-book-bookmark',
        service: 'fas fa-briefcase'
    };
    return icons[type] || 'fas fa-bell';
}

// Get time ago string
function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Handle notification click
function handleNotificationClick(id, link) {
    // Mark as read
    const notification = notifications.find(n => n.id == id);
    if (notification) {
        notification.read = true;
        saveNotifications();
        updateNotificationUI();
    }

    // Navigate
    if (link) {
        window.location.href = link;
    }
}

// Mark all as read
function markAllAsRead() {
    notifications.forEach(n => n.read = true);
    saveNotifications();
    updateNotificationUI();
}

// Show toast notification
function showToast(type, title, message, duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'payment' ? 'success' : ''}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${getNotificationIcon(type)}"></i>
        </div>
        <div class="toast-content">
            <strong>${title}</strong>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Helper to get root path relative to current page
function getRootPath() {
    // If on subdomain, root is just /
    if (window.location.hostname.includes('admin.')) {
        return '/';
    }

    const parts = window.location.pathname.split('/');
    const adminIndex = parts.lastIndexOf('admin');
    if (adminIndex === -1) return '../'; // Fallback

    const depth = parts.length - adminIndex - 2;
    return '../'.repeat(Math.max(0, depth));
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

function setupRealtimeSubscriptions() {
    if (typeof supabaseClient === 'undefined') {
        console.warn('Supabase client not available for realtime');
        return;
    }

    const root = getRootPath();

    // Subscribe to inquiries
    supabaseClient
        .channel('inquiries-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inquiries' }, (payload) => {
            const data = payload.new;
            addNotification('inquiry', 'New Inquiry', `from ${data.name || 'Someone'}`, root + 'inquiries/');
            triggerTableRefresh('inquiries');
        })
        .subscribe();

    // Subscribe to payments
    supabaseClient
        .channel('payments-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, (payload) => {
            const data = payload.new;
            addNotification('payment', 'Payment Received', `₹${data.amount || 0} received`, root + 'payments/all-payments/');
            triggerTableRefresh('payments');
        })
        .subscribe();

    // Subscribe to students
    supabaseClient
        .channel('students-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
            if (payload.eventType === 'INSERT') {
                const data = payload.new;
                addNotification('student', 'New Student', `${data.name || 'Someone'} registered`, root + 'students/');
            }
            triggerTableRefresh('students');
        })
        .subscribe();

    // Subscribe to tutors
    supabaseClient
        .channel('tutors-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tutors' }, (payload) => {
            if (payload.eventType === 'INSERT') {
                const data = payload.new;
                addNotification('tutor', 'New Tutor', `${data.name || 'Someone'} added`, root + 'tutors/');
            }
            triggerTableRefresh('tutors');
        })
        .subscribe();

    // Subscribe to courses
    supabaseClient
        .channel('courses-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, (payload) => {
            triggerTableRefresh('courses');
        })
        .subscribe();

    // Subscribe to services
    supabaseClient
        .channel('services-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, (payload) => {
            triggerTableRefresh('services');
        })
        .subscribe();

    // Subscribe to receipts
    supabaseClient
        .channel('receipts-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, (payload) => {
            triggerTableRefresh('receipts');
        })
        .subscribe();
}

// Trigger table refresh based on current page
function triggerTableRefresh(table) {
    const currentPath = window.location.pathname;

    // Check if we're on the relevant page
    if (currentPath.includes(`/${table}/`) || currentPath.includes(`/${table}`)) {
        // Call the page's refresh function if it exists
        if (typeof loadData === 'function') {
            loadData();
        } else if (typeof loadStudents === 'function' && table === 'students') {
            loadStudents();
        } else if (typeof loadTutors === 'function' && table === 'tutors') {
            loadTutors();
        } else if (typeof loadInquiries === 'function' && table === 'inquiries') {
            loadInquiries();
        } else if (typeof loadCourses === 'function' && table === 'courses') {
            loadCourses();
        } else if (typeof loadServices === 'function' && table === 'services') {
            loadServices();
        } else if (typeof loadPayments === 'function' && table === 'payments') {
            loadPayments();
        } else if (typeof loadReceipts === 'function' && table === 'receipts') {
            loadReceipts();
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initNotifications);
