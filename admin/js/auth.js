// Authentication Logic for Craft Soft Admin

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    const currentPage = window.location.pathname;

    if (user) {
        // User is signed in
        if (currentPage.includes('index.html') || currentPage.endsWith('/admin/') || currentPage.endsWith('/admin')) {
            // Redirect to dashboard if on login page
            window.location.href = 'dashboard.html';
        }
    } else {
        // User is not signed in
        if (currentPage.includes('dashboard.html') || currentPage.includes('students.html') || currentPage.includes('payments.html')) {
            // Redirect to login if on protected page
            window.location.href = 'index.html';
        }
    }
});

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const errorMessage = document.getElementById('errorMessage');

        // Hide previous errors
        errorMessage.classList.remove('show');

        // Show loading state
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');

        try {
            await auth.signInWithEmailAndPassword(email, password);
            // Redirect handled by onAuthStateChanged
        } catch (error) {
            // Show error
            const errorText = document.getElementById('errorText');
            if (errorText) {
                errorText.textContent = getErrorMessage(error.code);
            } else {
                errorMessage.textContent = getErrorMessage(error.code);
            }
            errorMessage.classList.add('show');

            // Reset button
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
        }
    });
}

// Toggle Password Visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (toggleIcon) toggleIcon.textContent = 'visibility_off';
    } else {
        passwordInput.type = 'password';
        if (toggleIcon) toggleIcon.textContent = 'visibility';
    }
}

// Logout Function with custom dialog
async function logout() {
    const confirmed = await showConfirm({
        title: 'Logout?',
        message: 'Are you sure you want to logout from the admin panel?',
        confirmText: 'Yes, Logout',
        type: 'danger'
    });

    if (confirmed) {
        performLogout();
    }
}

// Perform the actual logout
function performLogout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// Error Messages
function getErrorMessage(errorCode) {
    const errors = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/network-request-failed': 'Network error. Please check your connection.'
    };

    return errors[errorCode] || 'An error occurred. Please try again.';
}

// Helper: Format phone number with country code (+91)
// Subject codes for receipt numbers
const subjectCodes = {
    'Full Stack Development (MERN)': '01',
    'UI/UX Design': '02',
    'Graphic Design': '03',
    'DevOps Engineering': '04',
    'AWS Cloud Excellence': '05',
    'Python Full Stack Development': '06',
    'Java Full Stack Development': '07',
    'Data Analytics': '08',
    'Salesforce Administration': '09',
    'DSA Mastery': '10',
    'Soft Skills Training': '11',
    'Spoken English Mastery': '12',
    'Resume Writing & Interview Prep': '13',
    'DevSecOps': '14',
    'Handwriting Improvement': '15',
    'Other': '99'
};

function formatPhoneNumber(phone) {
    if (!phone) return '';
    // Remove all non-numeric characters
    let cleaned = phone.toString().replace(/\D/g, '');

    // If it's already got the + sign at the start of the original phone, keep it but clean logic
    if (phone.toString().startsWith('+')) {
        return '+' + cleaned;
    }

    // If it's 10 digits, add +91
    if (cleaned.length === 10) {
        return '+91' + cleaned;
    }
    // If it starts with 91 and has 12 digits, add +
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return '+' + cleaned;
    }

    // Default: if it's longer than 10 but doesn't start with 91, just add +
    if (cleaned.length > 10) {
        return '+' + cleaned;
    }

    return phone;
}

// Dynamic Courses Loader
async function fetchCoursesFromWebsite() {
    try {
        const response = await fetch('../pages/courses.html');
        if (!response.ok) throw new Error('Could not fetch courses page');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find all course titles
        const titles = Array.from(doc.querySelectorAll('.course-info h3'))
            .map(h => h.textContent.trim())
            .filter(t => t);

        return [...new Set(titles)];
    } catch (error) {
        console.error('Error fetching courses:', error);
        return Object.keys(subjectCodes).filter(c => c !== 'Other');
    }
}

async function updateDynamicDropdowns() {
    const titles = await fetchCoursesFromWebsite();
    const currentCodes = { ...subjectCodes };

    // Determine next sequence for new courses (starting after our 15 core courses)
    let nextSeq = 16;
    Object.values(subjectCodes).forEach(v => {
        const n = parseInt(v);
        if (!isNaN(n) && n < 99 && n >= nextSeq) nextSeq = n + 1;
    });

    titles.forEach(title => {
        if (!currentCodes[title]) {
            currentCodes[title] = nextSeq.toString().padStart(2, '0');
            nextSeq++;
        }
    });

    // Update global
    window.subjectCodes = currentCodes;

    // Build the checkbox list HTML
    const checkboxesHTML = titles.map(title => `
        <label><input type="checkbox" value="${title}"> ${title}</label>
    `).join('') + '<label><input type="checkbox" value="Other"> Other</label>';

    // Update all dynamic course containers
    const containers = document.querySelectorAll('.multi-select-options');
    containers.forEach(container => {
        if (container.id !== 'navOrderOptions') {
            container.innerHTML = checkboxesHTML;
            const dropdown = container.closest('.multi-select-dropdown');

            // Re-attach listeners based on page context
            container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', () => {
                    if (typeof updateCourseSelectionDisplay === 'function') {
                        updateCourseSelectionDisplay();
                    }
                    if (dropdown && typeof updateMultiSelectLabel === 'function') {
                        updateMultiSelectLabel(dropdown.id);
                    }
                });
            });

            // Initial label update
            if (dropdown && typeof updateMultiSelectLabel === 'function') {
                updateMultiSelectLabel(dropdown.id);
            }
        }
    });

    // Also update subject filters if they exist
    const filters = document.querySelectorAll('#subjectFilter');
    filters.forEach(filter => {
        const currentVal = filter.value;
        filter.innerHTML = '<option value="">All Subjects</option>' +
            titles.map(t => `<option value="${t}">${t}</option>`).join('') +
            '<option value="Other">Other</option>';
        filter.value = currentVal;
    });

    console.log('Courses synchronized from website!');
    if (typeof renderSubjectCodesBanner === 'function') {
        renderSubjectCodesBanner();
    }
}

// Global Date Formatter: DD/MM/YYYY
function formatDate(date) {
    if (!date) return '-';
    let d = date;

    // Handle Firestore Timestamp
    if (date && typeof date.toDate === 'function') {
        d = date.toDate();
    } else if (date && date.seconds) {
        // Fallback for objects that look like Timestamps
        d = new Date(date.seconds * 1000);
    } else if (!(date instanceof Date)) {
        d = new Date(date);
    }

    if (isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
}

// Custom Confirmation Dialog Utility
function showConfirm(options = {}) {
    const {
        title = 'Are you sure?',
        message = 'Do you want to proceed with this action?',
        confirmText = 'Yes, Proceed',
        cancelText = 'Cancel',
        type = 'primary' // primary, danger
    } = options;

    return new Promise((resolve) => {
        let modal = document.getElementById('globalConfirmModal');

        if (!modal) {
            // Create modal if it doesn't exist
            modal = document.createElement('div');
            modal.id = 'globalConfirmModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal" style="max-width: 400px;">
                    <div class="confirm-modal-content">
                        <div class="confirm-icon">
                            <span class="material-icons">help_outline</span>
                        </div>
                        <h3 id="confirmTitle"></h3>
                        <p id="confirmMessage"></p>
                        <div class="confirm-actions">
                            <button class="btn btn-outline" id="confirmCancelBtn"></button>
                            <button class="btn" id="confirmOkBtn"></button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const titleEl = modal.querySelector('#confirmTitle');
        const messageEl = modal.querySelector('#confirmMessage');
        const okBtn = modal.querySelector('#confirmOkBtn');
        const cancelBtn = modal.querySelector('#confirmCancelBtn');
        const iconEl = modal.querySelector('.confirm-icon .material-icons');

        titleEl.textContent = title;
        messageEl.textContent = message;
        okBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        // Set type
        okBtn.className = `btn ${type === 'danger' ? 'confirm-btn-danger' : 'confirm-btn-primary'}`;
        iconEl.style.color = type === 'danger' ? 'var(--danger)' : 'var(--warning)';
        modal.querySelector('.confirm-icon').style.background = type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
        iconEl.textContent = type === 'danger' ? 'warning' : 'help_outline';

        const closeModal = (result) => {
            modal.classList.remove('active');
            // Clean up listeners to avoid memory leaks/double calls
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            modal.onclick = null;
            resolve(result);
        };

        okBtn.onclick = () => closeModal(true);
        cancelBtn.onclick = () => closeModal(false);
        modal.onclick = (e) => {
            if (e.target === modal) closeModal(false);
        };

        modal.classList.add('active');
    });
}

// Skeleton Loaders
function showTableSkeleton(tableId, rows = 5, cols = 6) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    let html = '';
    for (let i = 0; i < rows; i++) {
        html += '<tr class="loading-table-row">';
        for (let j = 0; j < cols; j++) {
            html += '<td><div class="skeleton skeleton-text"></div></td>';
        }
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function showCardSkeleton(containerId, count = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="mobile-card skeleton-card">
                <div class="mobile-card-header">
                    <div style="width: 100%;">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                    </div>
                </div>
                <div class="mobile-card-row"><div class="skeleton skeleton-text"></div></div>
                <div class="mobile-card-row"><div class="skeleton skeleton-text"></div></div>
                <div class="mobile-card-row"><div class="skeleton skeleton-text"></div></div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// Bottom Navigation Logic
const allNavOptions = {
    'dashboard': { icon: 'dashboard', label: 'Home', href: 'dashboard.html' },
    'inquiries': { icon: 'contact_phone', label: 'Inquiries', href: 'inquiries.html' },
    'students': { icon: 'people', label: 'Students', href: 'students.html' },
    'payments': { icon: 'payments', label: 'Payments', href: 'payments.html' },
    'tutors': { icon: 'person', label: 'Tutors', href: 'tutors.html' },
    'settings': { icon: 'settings', label: 'Settings', href: 'settings.html' }
};

async function initializeBottomNav() {
    const bottomNav = document.querySelector('.bottom-nav');
    if (!bottomNav) return;

    try {
        const doc = await db.collection('settings').doc('config').get();
        let selectedIds = ['dashboard', 'inquiries', 'students', 'payments']; // Default

        if (doc.exists && doc.data().mobileNavItems) {
            selectedIds = doc.data().mobileNavItems;
        }

        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

        bottomNav.innerHTML = selectedIds.map(id => {
            const item = allNavOptions[id];
            if (!item) return '';
            const isActive = currentPage === item.href ? 'active' : '';
            return `
                <a href="${item.href}" class="bottom-nav-item ${isActive}">
                    <span class="material-icons">${item.icon}</span>
                    <span>${item.label}</span>
                </a>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading bottom nav:', error);
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    initializeBottomNav();
    updateDynamicDropdowns(); // Sync courses on load
});

// Make functions global
window.togglePassword = togglePassword;
window.logout = logout;
window.showConfirm = showConfirm;
window.formatPhoneNumber = formatPhoneNumber;
window.formatDate = formatDate;
window.subjectCodes = subjectCodes;
window.initializeBottomNav = initializeBottomNav;
window.showTableSkeleton = showTableSkeleton;
window.showCardSkeleton = showCardSkeleton;
