/* ============================================
   Admin Sign-In Logic
   With session management & security
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signinForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitSpinner = document.getElementById('submitSpinner');
    const accountPicker = document.getElementById('accountPicker');
    const accountList = document.getElementById('accountList');
    const useAnotherBtn = document.getElementById('useAnotherBtn');
    const authSubtitle = document.getElementById('authSubtitle');
    const backToAccounts = document.getElementById('backToAccounts');
    const backToAccountsBtn = document.getElementById('backToAccountsBtn');
    const manageAccountsBtn = document.getElementById('manageAccountsBtn');

    // Form fields
    const identifierInput = document.getElementById('identifier');
    const passwordInput = document.getElementById('password');

    // Password toggle
    const togglePassword = document.getElementById('togglePassword');

    // ============================================
    // ACCOUNT PICKER (Gmail style)
    // ============================================

    const SAVED_ADMINS_KEY = 'craftsoft_saved_admins';

    function getSavedAdmins() {
        return JSON.parse(localStorage.getItem(SAVED_ADMINS_KEY) || '[]');
    }

    function getAvatarColor(initial) {
        const colors = [
            'linear-gradient(135deg, #2896cd 0%, #6C5CE7 100%)', // Blue-Purple
            'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Green
            'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Orange
            'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', // Red
            'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', // Indigo
            'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)'  // Pink
        ];
        const charCode = initial.charCodeAt(0) || 0;
        return colors[charCode % colors.length];
    }

    async function initAccountPicker() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const saved = getSavedAdmins();

        // If action is add_account or no saved admins, show form directly
        if (action === 'add_account' || saved.length === 0) {
            showLoginForm(false);
            return;
        }

        // Show picker
        form.style.display = 'none';
        accountPicker.classList.add('show');
        authSubtitle.textContent = 'Choose an account to continue';

        // Get current active session if any (just for status badge)
        let currentUserId = null;
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            currentUserId = session ? session.user.id : null;
        } catch (e) { /* ignore */ }

        accountList.innerHTML = saved.map(admin => {
            const initial = admin.avatar || admin.full_name.charAt(0);
            const color = admin.color || getAvatarColor(initial);

            return `
                <div class="account-item ${admin.id === currentUserId ? 'active' : ''}" 
                     data-identifier="${admin.admin_id}">
                    <div class="account-avatar" style="background: ${color}">${initial}</div>
                    <div class="account-info">
                        <div class="account-name">${admin.full_name}</div>
                        <div class="account-id-badge">${admin.admin_id}</div>
                        ${admin.id === currentUserId ? '<div class="account-status">Active Session</div>' : ''}
                    </div>
                    <button class="remove-account-btn" title="Remove account" data-id="${admin.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <i class="fas fa-chevron-right"></i>
                </div>
            `;
        }).join('');

        // Item clicks (Select Account)
        accountList.querySelectorAll('.account-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicked on remove button
                if (e.target.closest('.remove-account-btn')) return;

                // Option 2: If editing, do NOT sign in
                if (accountPicker.classList.contains('editing')) {
                    return;
                }

                const identifier = item.getAttribute('data-identifier');
                identifierInput.value = identifier;
                showLoginForm(true); // Is switching from list
            });
        });

        // Remove Account Clicks
        accountList.querySelectorAll('.remove-account-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idToRemove = btn.getAttribute('data-id');
                window.modal.confirm('Remove Account', 'Remove this account from the list?', () => {
                    const updated = getSavedAdmins().filter(a => a.id !== idToRemove);
                    localStorage.setItem(SAVED_ADMINS_KEY, JSON.stringify(updated));
                    initAccountPicker(); // Re-render
                    // Keep editing state after re-render if it was active?
                    // Re-render resets innerHTML but not parent class.
                    // But initAccountPicker runs clean slate logic usually?
                    // No, styling is CSS based on parent class.
                    // However, re-init might reset text/manage button if we are not careful.
                    if (accountPicker.classList.contains('editing')) {
                        // Ensure subtitle/button stay correct if we re-run init logic
                        // Actually initAccountPicker resets authSubtitle.textContent
                        authSubtitle.textContent = 'Remove an account';
                    } else if (updated.length === 0) {
                        // If no accounts left, show form
                        showLoginForm(false);
                    }
                });
            });
        });

        // Hide manage button if no accounts (shouldn't happen here as we return early)
        if (manageAccountsBtn) {
            manageAccountsBtn.style.display = saved.length > 0 ? 'block' : 'none';
        }
    }

    function showLoginForm(showBack = false) {
        // Reset editing state
        if (accountPicker.classList.contains('editing')) {
            accountPicker.classList.remove('editing');
            if (manageAccountsBtn) manageAccountsBtn.textContent = 'Manage';
        }

        accountPicker.classList.remove('show');
        form.style.display = 'flex';
        authSubtitle.textContent = 'Sign in with your email or Admin ID';

        if (showBack) {
            if (backToAccounts) backToAccounts.style.display = 'block';
        } else {
            if (backToAccounts) backToAccounts.style.display = 'none';
        }

        if (identifierInput.value) {
            identifierInput.readOnly = true;
            passwordInput.focus();
        } else {
            identifierInput.readOnly = false;
            identifierInput.focus();
        }
    }

    if (manageAccountsBtn) {
        manageAccountsBtn.addEventListener('click', () => {
            const isEditing = accountPicker.classList.toggle('editing');
            manageAccountsBtn.textContent = isEditing ? 'Done' : 'Manage';
            authSubtitle.textContent = isEditing ? 'Remove an account' : 'Choose an account to continue';
        });
    }

    if (useAnotherBtn) {
        useAnotherBtn.addEventListener('click', () => {
            identifierInput.value = '';
            passwordInput.value = '';
            showLoginForm(true);
        });
    }

    if (backToAccountsBtn) {
        backToAccountsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear input and go back to picker
            passwordInput.value = '';
            identifierInput.value = ''; // Optional: clear identifier if going back to full list
            initAccountPicker();
        });
    }

    initAccountPicker();

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

    // Check if already logged in (skip if user came from logout or adding account)
    async function checkExistingSession() {
        const urlParams = new URLSearchParams(window.location.search);

        // Skip auto-redirect if:
        // 1. User clicked logout
        // 2. User clicked "Add another admin"
        // 3. User was kicked out due to session conflict
        if (urlParams.get('from') === 'logout' || urlParams.get('action') === 'add_account' || urlParams.get('reason')) {
            const reason = urlParams.get('reason');
            if (reason === 'session_conflict') {
                window.toast.error('Session Conflict', 'You were logged out because this account was logged in from another device or tab.');
            } else if (reason === 'timeout') {
                window.toast.warning('Session Expired', 'You were logged out due to inactivity.');
            }
            return;
        }

        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session && session.user) {
                // User is already logged in, redirect to dashboard
                window.location.replace('dashboard.html');
            }
        } catch (e) {
            console.log('No existing session');
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

            // Update email_verified and generate session token
            await window.supabaseClient
                .from('admins')
                .update({ email_verified: true })
                .eq('email', email);

            if (window.updateSessionToken) {
                await window.updateSessionToken(data.user.id);
            }

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
            // Shake effect
            const card = document.querySelector('.auth-card');
            card.classList.add('shake');

            // Also shake inputs
            identifierInput.classList.add('shake');
            passwordInput.classList.add('shake');

            setTimeout(() => {
                card.classList.remove('shake');
                identifierInput.classList.remove('shake');
                passwordInput.classList.remove('shake');
                passwordInput.focus();
            }, 500);

            window.toast.error('Sign In Failed', 'Invalid credentials. Please check your email/ID and password.');

        } finally {
            submitBtn.disabled = false;
            submitText.textContent = 'Sign In';
            submitSpinner.style.display = 'none';
        }
    });

    // ============================================
    // KEYBOARD NAVIGATION
    // ============================================
    let focusedIndex = -1;

    document.addEventListener('keydown', (e) => {
        // Only navigate if picker is visible and not in edit mode
        if (!accountPicker.classList.contains('show') || accountPicker.classList.contains('editing')) return;

        const items = document.querySelectorAll('.account-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            focusedIndex = (focusedIndex + 1) % items.length;
            updateFocus(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            // If starting, go to last
            if (focusedIndex === -1) focusedIndex = items.length;
            focusedIndex = (focusedIndex - 1 + items.length) % items.length;
            updateFocus(items);
        } else if (e.key === 'Enter') {
            if (focusedIndex >= 0 && items[focusedIndex]) {
                e.preventDefault();
                // Flash effect
                items[focusedIndex].style.transform = 'scale(0.98)';
                setTimeout(() => items[focusedIndex].click(), 100);
            }
        }
    });

    function updateFocus(items) {
        items.forEach((item, index) => {
            if (index === focusedIndex) {
                item.classList.add('focused');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('focused');
            }
        });
    }
});
