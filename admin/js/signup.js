/* ============================================
   Admin Sign-Up Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signupForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitSpinner = document.getElementById('submitSpinner');

    // Form fields
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const phoneInput = document.getElementById('phone');

    // Password toggles
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    // ============================================
    // PASSWORD VISIBILITY TOGGLE
    // ============================================

    function setupPasswordToggle(toggleBtn, inputField) {
        toggleBtn.addEventListener('click', () => {
            const type = inputField.type === 'password' ? 'text' : 'password';
            inputField.type = type;
            const icon = toggleBtn.querySelector('i');
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }

    setupPasswordToggle(togglePassword, passwordInput);
    setupPasswordToggle(toggleConfirmPassword, confirmPasswordInput);

    // ============================================
    // REAL-TIME VALIDATION
    // ============================================

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validatePassword(password) {
        return password.length >= 8;
    }

    function validatePhone(phone) {
        if (!phone) return true; // Phone is optional
        const re = /^[0-9]{10}$/;
        return re.test(phone.replace(/\s/g, ''));
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

    function showFieldSuccess(input) {
        input.classList.remove('error');
        input.classList.add('success');
        const hint = input.parentElement.querySelector('.form-hint.error');
        if (hint) hint.remove();
    }

    function clearFieldState(input) {
        input.classList.remove('error', 'success');
        const hint = input.parentElement.querySelector('.form-hint.error');
        if (hint) hint.remove();
    }

    // Email validation on blur
    emailInput.addEventListener('blur', () => {
        if (emailInput.value && !validateEmail(emailInput.value)) {
            showFieldError(emailInput, 'Please enter a valid email address');
        } else if (emailInput.value) {
            showFieldSuccess(emailInput);
        }
    });

    emailInput.addEventListener('input', () => {
        clearFieldState(emailInput);
    });

    // Password validation on blur
    passwordInput.addEventListener('blur', () => {
        if (passwordInput.value && !validatePassword(passwordInput.value)) {
            showFieldError(passwordInput, 'Password must be at least 8 characters');
        } else if (passwordInput.value) {
            showFieldSuccess(passwordInput);
        }
    });

    passwordInput.addEventListener('input', () => {
        clearFieldState(passwordInput);
        // Also check confirm password match if it has value
        if (confirmPasswordInput.value) {
            if (confirmPasswordInput.value !== passwordInput.value) {
                showFieldError(confirmPasswordInput, 'Passwords do not match');
            } else {
                showFieldSuccess(confirmPasswordInput);
            }
        }
    });

    // Confirm password validation on blur
    confirmPasswordInput.addEventListener('blur', () => {
        if (confirmPasswordInput.value && confirmPasswordInput.value !== passwordInput.value) {
            showFieldError(confirmPasswordInput, 'Passwords do not match');
        } else if (confirmPasswordInput.value && confirmPasswordInput.value === passwordInput.value) {
            showFieldSuccess(confirmPasswordInput);
        }
    });

    confirmPasswordInput.addEventListener('input', () => {
        clearFieldState(confirmPasswordInput);
    });

    // Phone validation (optional field)
    phoneInput.addEventListener('blur', () => {
        if (phoneInput.value && !validatePhone(phoneInput.value)) {
            showFieldError(phoneInput, 'Please enter a valid 10-digit phone number');
        } else if (phoneInput.value) {
            showFieldSuccess(phoneInput);
        }
    });

    phoneInput.addEventListener('input', (e) => {
        // Only allow numbers
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        clearFieldState(phoneInput);
    });

    // ============================================
    // GENERATE ADMIN ID
    // ============================================

    async function generateAdminId() {
        try {
            // Get count of existing admins
            const { data, error, count } = await window.supabaseClient
                .from('admins')
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error('Error getting admin count:', error);
                // Default to ACS-01 if error
                return 'ACS-01';
            }

            const nextNumber = (count || 0) + 1;
            return `ACS-${String(nextNumber).padStart(2, '0')}`;
        } catch (err) {
            console.error('Error generating admin ID:', err);
            return 'ACS-01';
        }
    }

    // ============================================
    // FORM SUBMISSION
    // ============================================

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form values
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const phone = phoneInput.value.trim();

        // Validate all fields
        let isValid = true;

        if (!firstName) {
            showFieldError(firstNameInput, 'First name is required');
            isValid = false;
        }

        if (!lastName) {
            showFieldError(lastNameInput, 'Last name is required');
            isValid = false;
        }

        if (!email || !validateEmail(email)) {
            showFieldError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }

        if (!password || !validatePassword(password)) {
            showFieldError(passwordInput, 'Password must be at least 8 characters');
            isValid = false;
        }

        if (password !== confirmPassword) {
            showFieldError(confirmPasswordInput, 'Passwords do not match');
            isValid = false;
        }

        if (phone && !validatePhone(phone)) {
            showFieldError(phoneInput, 'Please enter a valid 10-digit phone number');
            isValid = false;
        }

        if (!isValid) {
            window.toast.error('Validation Error', 'Please fix the errors above');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitText.textContent = 'Creating Account...';
        submitSpinner.style.display = 'block';

        try {
            // Generate Admin ID
            const adminId = await generateAdminId();
            const fullName = `${firstName} ${lastName}`;

            // Sign up with Supabase Auth
            const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        admin_id: adminId,
                        phone: phone || null
                    },
                    emailRedirectTo: `${window.location.origin}/admin/verify.html`
                }
            });

            if (authError) {
                throw authError;
            }

            // Insert into admins table
            const { error: dbError } = await window.supabaseClient
                .from('admins')
                .insert({
                    id: authData.user.id,
                    admin_id: adminId,
                    full_name: fullName,
                    email: email,
                    phone: phone || null,
                    email_verified: false,
                    created_at: new Date().toISOString()
                });

            if (dbError) {
                console.error('Database error:', dbError);
                // Don't throw - auth was successful, we can handle DB issues later
            }

            // Success!
            window.modal.success(
                'Account Created!',
                `Your admin account has been created successfully!<br><br>
                 Your Admin ID: <span class="modal-highlight">${adminId}</span><br><br>
                 Please check your email <strong>${email}</strong> for a verification link.`,
                [
                    {
                        text: 'Go to Sign In',
                        type: 'primary',
                        onClick: () => {
                            window.location.href = 'signin.html';
                        }
                    }
                ]
            );

            // Clear form
            form.reset();

        } catch (error) {
            console.error('Sign up error:', error);

            let errorMessage = 'Something went wrong. Please try again.';

            if (error.message) {
                if (error.message.includes('already registered')) {
                    errorMessage = 'This email is already registered. Please sign in instead.';
                } else if (error.message.includes('password')) {
                    errorMessage = 'Password is too weak. Please use a stronger password.';
                } else {
                    errorMessage = error.message;
                }
            }

            window.modal.error('Sign Up Failed', errorMessage);

        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitText.textContent = 'Create Admin Account';
            submitSpinner.style.display = 'none';
        }
    });
});
