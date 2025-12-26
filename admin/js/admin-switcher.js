/* ============================================
   Admin Switcher Logic
   - Handles multi-account switching
   - Stores saved admin info in localStorage
   - Handles password-protected switching
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    const switcher = document.getElementById('adminSwitcher');
    const toggle = document.getElementById('adminSwitcherToggle');
    const dropdown = document.getElementById('adminSwitcherDropdown');
    const savedAdminsList = document.getElementById('savedAdminsList');
    const savedAdminsSection = document.getElementById('savedAdminsSection');
    const addAnotherBtn = document.getElementById('addAnotherAdmin');
    const logoutCurrentBtn = document.getElementById('logoutCurrent');
    const logoutAllBtn = document.getElementById('logoutAll');
    const savedCountEl = document.getElementById('savedCount');

    // ============================================
    // TOGGLE DROPDOWN
    // ============================================

    if (toggle) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            switcher.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (switcher && !switcher.contains(e.target)) {
            switcher.classList.remove('active');
        }
    });

    // ============================================
    // MANAGE SAVED ADMINS
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

    function saveAdmin(admin) {
        let saved = getSavedAdmins();
        const initial = admin.full_name.charAt(0).toUpperCase();
        // Remove if already exists (to update info)
        saved = saved.filter(a => a.id !== admin.id);
        saved.push({
            id: admin.id,
            admin_id: admin.admin_id,
            full_name: admin.full_name,
            email: admin.email,
            avatar: initial,
            color: getAvatarColor(initial)
        });
        localStorage.setItem(SAVED_ADMINS_KEY, JSON.stringify(saved));
    }

    function renderSavedAdmins() {
        if (!savedAdminsList) return;

        const { data: { session } } = supabaseClient ? { data: { session: null } } : { data: { session: null } }; // Placeholder
        // We'll get real session in a bit
    }

    // ============================================
    // INITIAL LOAD & AUTH SYNC
    // ============================================

    async function initSwitcher() {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return;

        // Get current admin details from DB
        const { data: admin } = await window.supabaseClient
            .from('admins')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (admin) {
            // Internal sync: Save current admin to memory/list
            saveAdmin(admin);
            updateCurrentUI(admin);
        }

        renderSavedAdminsList(session.user.id);
    }

    function updateCurrentUI(admin) {
        const nameEl = document.getElementById('currentAdminName');
        const idEl = document.getElementById('currentAdminId');
        const avatarEl = document.getElementById('currentAdminAvatar');
        const mainNavNameEl = document.getElementById('adminName');
        const mainNavIdEl = document.getElementById('adminId');

        const initial = admin.full_name.charAt(0).toUpperCase();
        const color = getAvatarColor(initial);

        if (nameEl) nameEl.textContent = admin.full_name;
        if (idEl) idEl.textContent = admin.admin_id;
        if (avatarEl) {
            avatarEl.textContent = initial;
            avatarEl.style.background = color;
        }

        // Main navbar update
        if (mainNavNameEl) mainNavNameEl.textContent = admin.full_name;
        if (mainNavIdEl) mainNavIdEl.textContent = admin.admin_id;

        // Also update welcome message if exists
        const welcomeName = document.getElementById('welcomeName');
        const welcomeId = document.getElementById('welcomeAdminId');
        const welcomeEmail = document.getElementById('welcomeEmail');
        if (welcomeName) welcomeName.textContent = admin.full_name;
        if (welcomeId) welcomeId.textContent = admin.admin_id;
        if (welcomeEmail) welcomeEmail.textContent = admin.email;
    }

    function renderSavedAdminsList(currentUserId) {
        const saved = getSavedAdmins();
        const otherAdmins = saved.filter(a => a.id !== currentUserId);

        if (otherAdmins.length > 0) {
            savedAdminsSection.style.display = 'block';
            logoutAllBtn.style.display = 'flex';
            savedCountEl.textContent = otherAdmins.length + 1; // +1 for current

            savedAdminsList.innerHTML = otherAdmins.map(admin => `
                <div class="saved-admin" data-admin-id="${admin.id}" data-email="${admin.email}">
                    <div class="saved-admin-avatar" style="background: ${admin.color || getAvatarColor(admin.avatar)}">${admin.avatar}</div>
                    <div class="saved-admin-info">
                        <div class="saved-admin-name">${admin.full_name}</div>
                        <div class="saved-admin-id">${admin.admin_id}</div>
                    </div>
                    <i class="fas fa-history" title="Requires Password"></i>
                </div>
            `).join('');

            // Add click listeners to saved admins
            savedAdminsList.querySelectorAll('.saved-admin').forEach(item => {
                item.addEventListener('click', () => {
                    const email = item.getAttribute('data-email');
                    const name = item.querySelector('.saved-admin-name').textContent;
                    const adminId = item.querySelector('.saved-admin-id').textContent;
                    promptPasswordAndSwitch(email, name, adminId);
                });
            });
        } else {
            savedAdminsSection.style.display = 'none';
            logoutAllBtn.style.display = 'none';
        }
    }

    // ============================================
    // SWITCH LOGIC
    // ============================================

    function promptPasswordAndSwitch(email, name, adminId) {
        switcher.classList.remove('active');

        window.modal.show({
            type: 'primary',
            title: 'Enter Password',
            customIcon: 'fa-graduation-cap',
            message: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 1rem; font-size: 0.875rem; color: var(--gray-600);">
                        Switching to: <strong>${name}</strong> (${adminId})
                    </p>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <div class="input-wrapper" style="position: relative;">
                            <input type="password" id="switchPassword" class="form-input" placeholder="Enter your password" 
                                   style="width: 100%; padding: 0.75rem; padding-right: 2.5rem; border: 1px solid var(--gray-200); border-radius: var(--radius-md);">
                            <button type="button" id="toggleSwitchPassword" 
                                    style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--gray-400); cursor: pointer; padding: 5px;">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <!-- Progress Bar (Hidden by default) -->
                    <div id="switchProgressContainer" style="display: none; width: 100%; background: var(--gray-100); height: 6px; border-radius: 3px; overflow: hidden; margin-top: 1rem;">
                        <div id="switchProgressBar" style="width: 0%; height: 100%; background: var(--accent-gradient); transition: width 0.3s ease;"></div>
                    </div>
                    <p id="switchStatusText" style="display: none; font-size: 0.75rem; color: var(--primary-600); margin-top: 0.5rem; text-align: center; font-weight: 600;"></p>
                </div>
            `,
            buttons: [
                {
                    text: 'Cancel',
                    type: 'secondary',
                    className: 'btn-switch-cancel'
                },
                {
                    text: 'Switch Now',
                    type: 'primary',
                    className: 'btn-switch-confirm'
                }
            ],
            onRender: (modalEl) => {
                const input = modalEl.querySelector('#switchPassword');
                const toggleBtn = modalEl.querySelector('#toggleSwitchPassword');
                const confirmBtn = modalEl.querySelector('.btn-switch-confirm');
                const cancelBtn = modalEl.querySelector('.btn-switch-cancel');
                const progressContainer = modalEl.querySelector('#switchProgressContainer');
                const progressBar = modalEl.querySelector('#switchProgressBar');
                const statusText = modalEl.querySelector('#switchStatusText');

                if (input) {
                    input.focus();
                    input.addEventListener('input', () => {
                        input.style.borderColor = '';
                        input.style.boxShadow = '';
                        if (statusText) statusText.style.display = 'none';
                    });
                }

                // Toggle logic
                if (toggleBtn && input) {
                    toggleBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const isPassword = input.type === 'password';
                        input.type = isPassword ? 'text' : 'password';
                        toggleBtn.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''}"></i>`;
                    });
                }

                if (input && confirmBtn) {
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') confirmBtn.click();
                    });
                }

                if (confirmBtn) {
                    confirmBtn.addEventListener('click', async () => {
                        const password = input.value;
                        if (!password) {
                            window.toast.warning('Required', 'Please enter your password');
                            return;
                        }

                        // Start Progress
                        confirmBtn.disabled = true;
                        if (cancelBtn) cancelBtn.style.display = 'none';
                        progressContainer.style.display = 'block';
                        statusText.style.display = 'block';

                        const updateProgress = (pct, text) => {
                            progressBar.style.width = pct + '%';
                            statusText.textContent = text;
                        };

                        try {
                            // Step 1: Auth
                            updateProgress(30, 'Verifying credentials...');
                            const { data: authData, error } = await window.supabaseClient.auth.signInWithPassword({
                                email: email,
                                password: password
                            });

                            if (error) throw error;

                            // Step 2: Session Token
                            updateProgress(60, 'Securing session...');
                            if (authData.user && window.updateSessionToken) {
                                try {
                                    await window.updateSessionToken(authData.user.id);
                                } catch (tokenErr) {
                                    console.warn('Token update skipped:', tokenErr);
                                }
                            }

                            // Step 3: Finalizing
                            updateProgress(90, 'Syncing account...');
                            await window.supabaseClient.auth.getSession();

                            updateProgress(100, 'Redirecting...');
                            window.toast.success('Success', `Switched to ${name}`);

                            setTimeout(() => {
                                window.location.href = 'dashboard.html';
                            }, 500);

                        } catch (e) {
                            console.error('Switch error:', e);

                            // Visual Feedback for Wrong Password
                            if (input) {
                                input.style.borderColor = 'var(--error)';
                                input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                                input.focus();
                            }

                            statusText.textContent = 'Invalid password. Please try again.';
                            statusText.style.color = 'var(--error)';
                            statusText.style.display = 'block';

                            confirmBtn.disabled = false;
                            if (cancelBtn) cancelBtn.style.display = 'block';
                            progressContainer.style.display = 'none';
                        }
                    });
                }
            }
        });
    }

    // ============================================
    // ACTION HANDLERS
    // ============================================

    if (addAnotherBtn) {
        addAnotherBtn.addEventListener('click', () => {
            // Simple approach: Logout current and go to signin with a return hint
            // But user might want to keep current session. 
            // Better: Just go to signin.html - it will handle the new session.
            window.location.href = 'signin.html?action=add_account';
        });
    }

    if (logoutCurrentBtn) {
        logoutCurrentBtn.addEventListener('click', () => {
            window.modal.confirm('Logout', 'Are you sure you want to leave?', async () => {
                // Remove from saved list
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session) {
                    let saved = getSavedAdmins();
                    saved = saved.filter(a => a.id !== session.user.id);
                    localStorage.setItem(SAVED_ADMINS_KEY, JSON.stringify(saved));
                }

                window.location.href = 'signin.html?from=logout';
            });
        });
    }

    if (logoutAllBtn) {
        logoutAllBtn.addEventListener('click', () => {
            window.modal.confirm('Logout All', 'This will sign out all saved accounts. Continue?', async () => {
                localStorage.removeItem(SAVED_ADMINS_KEY);
                await window.supabaseClient.auth.signOut();
                window.location.href = 'signin.html?from=logout';
            });
        });
    }

    // Start
    initSwitcher();
});
