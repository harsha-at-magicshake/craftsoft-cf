// Authentication & Core Utility Logic for Craft Soft Admin (Supabase Version)

// List of protected pages (all admin pages except login)
const protectedPages = [
    'dashboard',
    'students',
    'payments',
    'inquiries',
    'tutors',
    'experts',
    'services',
    'settings'
];

// Check if current page is protected
function isProtectedPage() {
    const currentPage = window.location.pathname.toLowerCase();
    return protectedPages.some(page => {
        return currentPage.includes('/' + page) || currentPage.includes(page + '.html');
    });
}

// Check if current page is login page
function isLoginPage() {
    const currentPage = window.location.pathname;
    return currentPage.includes('index.html') ||
        currentPage.endsWith('/admin/') ||
        currentPage.endsWith('/admin');
}

// Force redirect to login
function forceRedirectToLogin() {
    sessionStorage.setItem('loggedOut', 'true');
    window.location.replace('index.html');
}

// IMMEDIATE CHECK
(function immediateAuthCheck() {
    if (isProtectedPage()) {
        if (sessionStorage.getItem('loggedOut') === 'true') {
            window.location.replace('index.html');
            return;
        }
        document.documentElement.style.visibility = 'hidden';
        document.documentElement.style.opacity = '0';
    }
})();

if (isLoginPage()) {
    sessionStorage.removeItem('loggedOut');
}

// Supabase Auth Listener
supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user;

    if (user) {
        sessionStorage.removeItem('loggedOut');
        if (isLoginPage()) {
            window.location.href = 'dashboard.html';
        } else if (isProtectedPage()) {
            document.documentElement.style.visibility = 'visible';
            document.documentElement.style.opacity = '1';
        }
    } else {
        if (isProtectedPage()) {
            forceRedirectToLogin();
        }
    }
});

// Handle browser back/forward buttons
window.addEventListener('pageshow', (event) => {
    if (event.persisted && isProtectedPage()) {
        if (sessionStorage.getItem('loggedOut') === 'true') {
            window.location.replace('index.html');
        } else {
            window.location.reload();
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

        errorMessage.classList.remove('show');
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (error) {
            const errorText = document.getElementById('errorText');
            if (errorText) {
                errorText.textContent = getErrorMessage(error.message || error.code);
            }
            errorMessage.classList.add('show');
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
        }
    });
}

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

async function logout() {
    const confirmed = await showConfirm({
        title: 'Logout?',
        message: 'Are you sure you want to logout from the admin panel?',
        confirmText: 'Yes, Logout',
        type: 'danger'
    });
    if (confirmed) performLogout();
}

async function performLogout() {
    sessionStorage.setItem('loggedOut', 'true');
    await supabase.auth.signOut();
    window.location.replace('index.html');
}

function getErrorMessage(message) {
    if (message.includes('Invalid login credentials')) return 'Invalid email or password.';
    if (message.includes('Email not confirmed')) return 'Please confirm your email address.';
    return message || 'An error occurred. Please try again.';
}

// Utility: Subject codes
const subjectCodes = {
    'Full Stack Development (MERN)': '01', 'UI/UX Design': '02', 'Graphic Design': '03',
    'DevOps Engineering': '04', 'AWS Cloud Excellence': '05', 'Python Full Stack Development': '06',
    'Java Full Stack Development': '07', 'Data Analytics': '08', 'Salesforce Administration': '09',
    'DSA Mastery': '10', 'Soft Skills Training': '11', 'Spoken English Mastery': '12',
    'Resume Writing & Interview Prep': '13', 'DevSecOps': '14', 'Handwriting Improvement': '15',
    'Other': '99'
};

function formatPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = phone.toString().replace(/\D/g, '');
    if (phone.toString().startsWith('+')) return '+' + cleaned;
    if (cleaned.length === 10) return '+91' + cleaned;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return '+' + cleaned;
    return cleaned.length > 10 ? '+' + cleaned : phone;
}

function formatDate(date) {
    if (!date) return '-';
    let d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// Confirmation Dialog
function showConfirm(options = {}) {
    const { title = 'Are you sure?', message = 'Proceed?', confirmText = 'Yes', cancelText = 'Cancel', type = 'primary' } = options;
    return new Promise((resolve) => {
        let modal = document.getElementById('globalConfirmModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'globalConfirmModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal" style="max-width: 400px;">
                    <div class="confirm-modal-content">
                        <div class="confirm-icon"><span class="material-icons">help_outline</span></div>
                        <h3 id="confirmTitle"></h3><p id="confirmMessage"></p>
                        <div class="confirm-actions">
                            <button class="btn btn-outline" id="confirmCancelBtn"></button>
                            <button class="btn" id="confirmOkBtn"></button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }
        modal.querySelector('#confirmTitle').textContent = title;
        modal.querySelector('#confirmMessage').textContent = message;
        const okBtn = modal.querySelector('#confirmOkBtn');
        const cancelBtn = modal.querySelector('#confirmCancelBtn');
        okBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;
        okBtn.className = `btn ${type === 'danger' ? 'confirm-btn-danger' : 'confirm-btn-primary'}`;
        modal.classList.add('active');
        okBtn.onclick = () => { modal.classList.remove('active'); resolve(true); };
        cancelBtn.onclick = () => { modal.classList.remove('active'); resolve(false); };
    });
}

// Skeleton Loaders
function showTableSkeleton(tableId, rows = 5, cols = 6) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    let html = '';
    for (let i = 0; i < rows; i++) {
        html += '<tr class="loading-table-row">';
        for (let j = 0; j < cols; j++) html += '<td><div class="skeleton skeleton-text"></div></td>';
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
                <div class="mobile-card-header"><div style="width: 100%;"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text" style="width: 40%;"></div></div></div>
                <div class="mobile-card-row"><div class="skeleton skeleton-text"></div></div>
                <div class="mobile-card-row"><div class="skeleton skeleton-text"></div></div>
                <div class="mobile-card-row"><div class="skeleton skeleton-text"></div></div>
            </div>`;
    }
    container.innerHTML = html;
}

// DATA EXPORT TOOL (Run this in console of OLD FIREBASE version)
window.exportFirebaseData = async function () {
    console.log("Starting Firebase Data Export...");
    const collections = ['students', 'payments', 'tutors', 'experts', 'inquiries', 'settings'];
    const exportData = {};
    for (const coll of collections) {
        console.log(`Exporting ${coll}...`);
        const snap = await firebase.firestore().collection(coll).get();
        exportData[coll] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `craftsoft_data_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    console.log("Export Complete!");
};

// Global exports
window.togglePassword = togglePassword;
window.logout = logout;
window.showConfirm = showConfirm;
window.formatPhoneNumber = formatPhoneNumber;
window.formatDate = formatDate;
window.subjectCodes = subjectCodes;
window.showTableSkeleton = showTableSkeleton;
window.showCardSkeleton = showCardSkeleton;
