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
            errorMessage.textContent = getErrorMessage(error.code);
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
    const toggleBtn = document.querySelector('.toggle-password i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.classList.remove('fa-eye');
        toggleBtn.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleBtn.classList.remove('fa-eye-slash');
        toggleBtn.classList.add('fa-eye');
    }
}

// Logout Function
function logout() {
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

// Make functions global
window.togglePassword = togglePassword;
window.logout = logout;
