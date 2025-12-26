/* ============================================
   Admin Sign-In Logic
   With session management & security
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signinForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitSpinner = document.getElementById('submitSpinner');

    // Form fields
    const identifierInput = document.getElementById('identifier');
    const passwordInput = document.getElementById('password');

    // Password toggle
    const togglePassword = document.getElementById('togglePassword');

    // ============================================
    // SESSION & SECURITY MANAGEMENT
    // ============================================

    // Prevent back/forward navigation to this page after login
    function preventBackNavigation() {
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', () => {
            window.history.pushState(null, '', window.location.href);
        });
    }

    // Check if already logged in
    async function checkExistingSession() {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session && session.user) {
                // User is already logged in, redirect to dashboard
                window.location.replace('dashboard.html');
            } else {
                // Not logged in - clear any stale session data
                sessionStorage.removeItem('craftsoft_admin_session');
            }
        } catch (e) {
            console.log('No existing session');
            sessionStorage.removeItem('craftsoft_admin_session');
        }
    }

    checkExistingSession();

    // ============================================
    // PREVENT PASTE ON PASSWORD
    // ============================================

    passwordInput.addEventListener('paste', (e) => {
        e.preventDefault();
        window.toast.warning('Paste Disabled', 'Please type your password manually');
    });

    // Also prevent drag and drop
    passwordInput.addEventListener('drop', (e) => {
        e.preventDefault();
    });

    // ============================================
    // PASSWORD VISIBILITY TOGGLE
    // ============================================

    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        const icon = togglePassword.querySelector('i');
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function isEmail(value) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(value);
    }

    function isAdminId(value) {
        const re = /^ACS-\d{2}$/i;
        return re.test(value);
    }

    function showFieldError(input, message) {
        input.classList.add('error');
        input.classList.remove('success');
        let hint = input.parentElement.querySelector('.form-hint');
        if (!hint) {
            hint = document.createElement('span');
            hint.className = 'form-hint error';
            input.parentElement.appendChild(hint);
        }
        hint.textContent = message;
        hint.classList.add('error');
    }

    function clearFieldState(input) {
        input.classList.remove('error', 'success');
        const hint = input.parentElement.querySelector('.form-hint.error');
        if (hint) hint.remove();
    }

    // Clear errors on input
    identifierInput.addEventListener('input', () => clearFieldState(identifierInput));
    passwordInput.addEventListener('input', () => clearFieldState(passwordInput));

    // ============================================
    // GET EMAIL FROM ADMIN ID
    // ============================================

    async function getEmailFromAdminId(adminId) {
        try {
            const { data, error } = await window.supabaseClient
                .from('admins')
                .select('email')
                .eq('admin_id', adminId.toUpperCase())
                .single();

            if (error || !data) {
                return null;
            }

            return data.email;
        } catch (e) {
            return null;
        }
    }

    // ============================================
    // FORM SUBMISSION
    // ============================================

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const identifier = identifierInput.value.trim();
        const password = passwordInput.value;

        // Validate
        let isValid = true;

        if (!identifier) {
            showFieldError(identifierInput, 'This field is required');
            isValid = false;
        }

        if (!password) {
            showFieldError(passwordInput, 'This field is required');
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        // Show loading
        submitBtn.disabled = true;
        submitText.textContent = 'Signing In...';
        submitSpinner.style.display = 'block';

        try {
            let email = identifier;

            // If identifier is an Admin ID, get the email
            if (isAdminId(identifier)) {
                email = await getEmailFromAdminId(identifier);
                if (!email) {
                    // Don't reveal that the ID doesn't exist - show generic error
                    throw new Error('INVALID_CREDENTIALS');
                }
            } else if (!isEmail(identifier)) {
                throw new Error('INVALID_CREDENTIALS');
            }

            // Sign in with Supabase
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw new Error('INVALID_CREDENTIALS');
            }

            // Check if email is verified
            if (!data.user.email_confirmed_at) {
                window.modal.warning(
                    'Email Not Verified',
                    'Please verify your email before signing in. Check your inbox for the verification link.',
                    [
                        {
                            text: 'Resend Email',
                            type: 'secondary',
                            onClick: async () => {
                                await window.supabaseClient.auth.resend({
                                    type: 'signup',
                                    email: email
                                });
                                window.toast.success('Email Sent', 'Verification email has been resent.');
                            },
                            closeOnClick: false
                        },
                        {
                            text: 'OK',
                            type: 'primary'
                        }
                    ]
                );
                await window.supabaseClient.auth.signOut();
                return;
            }

            // Update email_verified in admins table
            await window.supabaseClient
                .from('admins')
                .update({ email_verified: true })
                .eq('email', email);

            // Success - prevent back navigation and redirect
            preventBackNavigation();

            window.toast.success('Welcome!', 'Signed in successfully');

            // Use replace to prevent back button returning to login
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 1000);

        } catch (error) {
            console.error('Sign in error:', error);

            // Generic error message - don't reveal specific details
            window.modal.error(
                'Sign In Failed',
                'Invalid credentials. Please check your email/ID and password.'
            );

        } finally {
            submitBtn.disabled = false;
            submitText.textContent = 'Sign In';
            submitSpinner.style.display = 'none';
        }
    });
});
