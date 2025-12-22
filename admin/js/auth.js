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

// Make functions global
window.togglePassword = togglePassword;
window.logout = logout;
window.showConfirm = showConfirm;
