/* ============================================
   Authentication Logic
   Signup, Login, Logout, Verify
   ============================================ */

// ============================================
// 🔧 DEBUG TOOLKIT - Remove after debugging
// ============================================

// Global logout tracker - shows exactly WHO triggers logout
window.__DEBUG_LOGOUT = function (reason, extra = {}) {
    console.group('🚨 LOGOUT TRIGGERED');
    console.log('Reason:', reason);
    console.log('Time:', new Date().toISOString());
    console.log('Extra:', extra);
    console.trace(); // 🔥 Shows call stack
    console.groupEnd();
};

// Store TAB_ID in MEMORY once on load - do NOT read dynamically from sessionStorage
// This prevents race conditions when realtime events arrive after logout clears sessionStorage
let THIS_TAB_ID = sessionStorage.getItem('tab_id');

// Flag to prevent reacting to our own logout
let isSelfLogout = false;

// 🧷 Boot log - sanity check
console.log('🧷 TAB BOOT', {
    THIS_TAB_ID,
    fromSessionStorage: sessionStorage.getItem('tab_id'),
    time: new Date().toISOString()
});

// ============================================
// Auth State Change Logger
// If you see SIGNED_OUT, someone is calling signOut()
// ============================================
if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔐 AUTH EVENT:', event, {
            hasSession: !!session,
            time: new Date().toISOString(),
        });
    });
}

const Auth = {
    // ============================================
    // SIGNUP
    // ============================================
    async signup(fullName, email, phone, password) {
        const supabase = window.supabaseClient;
        const { Toast, Modal, formatAdminId } = window.AdminUtils;

        try {
            // 1. Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: `${window.location.origin}/admin/login.html`,
                    data: {
                        full_name: fullName,
                        phone: phone
                    }
                }
            });

            if (authError) {
                throw authError;
            }

            // 2. Create admin record with PENDING status
            const { data: adminData, error: adminError } = await supabase
                .from('admins')
                .insert({
                    id: authData.user.id,
                    full_name: fullName,
                    email: email,
                    phone: phone,
                    status: 'PENDING',
                    admin_id: null // Will be assigned after verification
                })
                .select()
                .single();

            if (adminError) {
                console.error('Error creating admin record:', adminError);
                // Don't throw - auth user was created, verification will still work
            }

            return { success: true, user: authData.user };

        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // LOGIN
    // ============================================
    async login(identifier, password) {
        const supabase = window.supabaseClient;
        const { Validators } = window.AdminUtils;

        try {
            let email = identifier;

            // Check if identifier is an Admin ID (ACS-XX)
            if (Validators.isValidAdminId(identifier)) {
                // Fetch email by admin_id
                const { data: adminData, error: adminError } = await supabase
                    .from('admins')
                    .select('email, status')
                    .eq('admin_id', identifier)
                    .maybeSingle();

                if (adminError) {
                    console.error('Admin lookup error:', adminError);
                    return { success: false, error: 'Error looking up Admin ID' };
                }

                if (!adminData) {
                    return { success: false, error: 'Admin ID not found. Please use your email to login.' };
                }

                if (adminData.status !== 'ACTIVE') {
                    return { success: false, error: 'Account is not active. Please verify your email first.' };
                }

                email = adminData.email;
            }

            // Sign in with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) {
                throw authError;
            }

            // Verify admin status
            const { data: admin, error: statusError } = await supabase
                .from('admins')
                .select('admin_id, status, full_name')
                .eq('email', email)
                .single();

            if (statusError || !admin) {
                await supabase.auth.signOut();
                return { success: false, error: 'Admin record not found' };
            }

            if (admin.status !== 'ACTIVE') {
                await supabase.auth.signOut();
                return { success: false, error: 'Account is not active. Please verify your email first.' };
            }

            // Create session record
            await this.createSession(authData.user.id, authData.session?.access_token);

            return {
                success: true,
                user: authData.user,
                admin: admin
            };

        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // LOGOUT (Single Tab - does NOT call signOut)
    // ============================================
    async logout() {
        try {
            // Set flag to prevent this tab from reacting to its own delete event
            isSelfLogout = true;

            // FIX #2: Stop watchers IMMEDIATELY to prevent ghost redirects
            if (this.sessionChannel) {
                window.supabaseClient.removeChannel(this.sessionChannel);
                this.sessionChannel = null;
            }
            if (this.validityInterval) {
                clearInterval(this.validityInterval);
                this.validityInterval = null;
            }

            // Delete current session record (by admin_id + tab_id)
            await this.deleteCurrentSession();

            // DO NOT call supabase.auth.signOut() here!
            // This allows other tabs to remain logged in

            return { success: true };

        } catch (error) {
            console.error('Logout error:', error);
            isSelfLogout = false; // Reset on error
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // LOGOUT ALL (Hard logout - DOES call signOut)
    // ============================================
    async logoutAll(adminId) {
        const supabase = window.supabaseClient;

        try {
            // Delete ALL sessions for this admin
            await this.deleteAllSessions(adminId);

            // Call signOut to invalidate tokens globally
            await supabase.auth.signOut();

            return { success: true };

        } catch (error) {
            console.error('Logout all error:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    async createSession(adminId) {
        const supabase = window.supabaseClient;

        try {
            const existingTabId = sessionStorage.getItem('tab_id');
            const deviceInfo = this.getDeviceInfo();
            const ipAddress = await this.getIPAddress();

            // Check if this tab already has a valid session in the database
            if (existingTabId) {
                // FIX: Use maybeSingle() to avoid 406 error when no row exists
                const { data: existingSession } = await supabase
                    .from('user_sessions')
                    .select('id')
                    .eq('admin_id', adminId)
                    .eq('session_token', existingTabId)
                    .maybeSingle();

                if (existingSession) {
                    // Session exists for this tab, just update last_active
                    await supabase
                        .from('user_sessions')
                        .update({
                            last_active: new Date().toISOString(),
                            ip_address: ipAddress
                        })
                        .eq('admin_id', adminId)
                        .eq('session_token', existingTabId);

                    console.log('Existing tab session updated');
                    return;
                }
            }

            // Generate new TAB_ID for this tab
            const tabId = crypto.randomUUID();
            sessionStorage.setItem('tab_id', tabId);
            THIS_TAB_ID = tabId; // Update memory variable

            // Insert new session row
            const { error } = await supabase
                .from('user_sessions')
                .insert({
                    admin_id: adminId,
                    session_token: tabId,
                    device_info: deviceInfo,
                    ip_address: ipAddress
                });

            if (error) {
                console.error('Error creating session:', error);
            } else {
                console.log('New tab session created:', tabId);
            }
        } catch (err) {
            console.error('Create session error:', err);
        }
    },

    async deleteCurrentSession() {
        const supabase = window.supabaseClient;

        // FIX #1: Use THIS_TAB_ID from MEMORY - never from sessionStorage
        const tabId = THIS_TAB_ID;

        if (!tabId) return;

        // Get current admin to delete by (admin_id + tab_id)
        const admin = await this.getCurrentAdmin();
        if (!admin) return;

        try {
            await supabase
                .from('user_sessions')
                .delete()
                .eq('admin_id', admin.id)
                .eq('session_token', tabId);

            sessionStorage.removeItem('tab_id');
        } catch (err) {
            console.error('Delete session error:', err);
        }
    },

    async deleteSession(sessionId) {
        const supabase = window.supabaseClient;

        try {
            const { error } = await supabase
                .from('user_sessions')
                .delete()
                .eq('id', sessionId);

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Delete session error:', err);
            return { success: false, error: err.message };
        }
    },

    async deleteAllSessions(adminId) {
        const supabase = window.supabaseClient;

        try {
            const { error } = await supabase
                .from('user_sessions')
                .delete()
                .eq('admin_id', adminId);

            if (error) throw error;
            sessionStorage.removeItem('tab_id');
            return { success: true };
        } catch (err) {
            console.error('Delete all sessions error:', err);
            return { success: false, error: err.message };
        }
    },

    async updateSessionActivity() {
        const supabase = window.supabaseClient;

        // Use THIS_TAB_ID from memory
        const tabId = THIS_TAB_ID || sessionStorage.getItem('tab_id');
        if (!tabId) return;

        // Get current admin
        const admin = await this.getCurrentAdmin();
        if (!admin) return;

        try {
            await supabase
                .from('user_sessions')
                .update({ last_active: new Date().toISOString() })
                .eq('admin_id', admin.id)
                .eq('session_token', tabId);
        } catch (err) {
            console.error('Update session activity error:', err);
        }
    },

    async getSessions(adminId) {
        const supabase = window.supabaseClient;

        try {
            const { data, error } = await supabase
                .from('user_sessions')
                .select('*')
                .eq('admin_id', adminId)
                .order('last_active', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Get sessions error:', err);
            return [];
        }
    },

    getDeviceInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let os = 'Unknown';

        // Detect browser
        if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edg')) browser = 'Edge';
        else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

        // Detect OS
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac')) os = 'macOS';
        else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        return `${browser} – ${os}`;
    },

    async getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'Unknown';
        }
    },

    // ============================================
    // RESEND VERIFICATION EMAIL
    // ============================================
    async resendVerification(email) {
        const supabase = window.supabaseClient;

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: `${window.location.origin}/admin/login.html`
                }
            });

            if (error) {
                throw error;
            }

            return { success: true };

        } catch (error) {
            console.error('Resend verification error:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // ACTIVATE ADMIN (After email verification)
    // Called when user lands on login page after verification
    // ============================================
    async activateAdmin(userId) {
        const supabase = window.supabaseClient;
        const { formatAdminId } = window.AdminUtils;

        try {
            // Get the highest admin_id number
            const { data: admins, error: fetchError } = await supabase
                .from('admins')
                .select('admin_id')
                .not('admin_id', 'is', null)
                .order('created_at', { ascending: false });

            let nextNumber = 1;

            if (!fetchError && admins && admins.length > 0) {
                // Find highest number
                admins.forEach(admin => {
                    const match = admin.admin_id?.match(/^ACS-(\d+)$/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num >= nextNumber) {
                            nextNumber = num + 1;
                        }
                    }
                });
            }

            const newAdminId = formatAdminId(nextNumber);

            // Update admin record
            const { error: updateError } = await supabase
                .from('admins')
                .update({
                    admin_id: newAdminId,
                    status: 'ACTIVE'
                })
                .eq('id', userId);

            if (updateError) {
                throw updateError;
            }

            return { success: true, adminId: newAdminId };

        } catch (error) {
            console.error('Activate admin error:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // GET CURRENT ADMIN
    // ============================================
    async getCurrentAdmin() {
        const supabase = window.supabaseClient;

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                return null;
            }

            const { data: admin, error: adminError } = await supabase
                .from('admins')
                .select('*')
                .eq('id', user.id)
                .single();

            if (adminError || !admin) {
                return null;
            }

            return admin;

        } catch (error) {
            console.error('Get current admin error:', error);
            return null;
        }
    },

    // ============================================
    // CHECK IF EMAIL IS VERIFIED
    // ============================================
    async checkEmailVerified(email) {
        const supabase = window.supabaseClient;

        try {
            const { data: admin, error } = await supabase
                .from('admins')
                .select('status')
                .eq('email', email)
                .single();

            if (error || !admin) {
                return false;
            }

            return admin.status === 'ACTIVE';

        } catch (error) {
            return false;
        }
    },

    // ============================================
    // SESSION VALIDITY CHECK (for remote logout)
    // ============================================
    async isCurrentSessionValid() {
        const supabase = window.supabaseClient;

        // Use THIS_TAB_ID from MEMORY - not from sessionStorage
        const tabId = THIS_TAB_ID || sessionStorage.getItem('tab_id');

        // Get current admin
        const admin = await this.getCurrentAdmin();

        // 🧪 DEBUG: Log session check
        console.log('🧪 SESSION CHECK', {
            adminId: admin?.id,
            tabId: tabId,
            THIS_TAB_ID: THIS_TAB_ID,
            fromStorage: sessionStorage.getItem('tab_id'),
            time: new Date().toISOString(),
        });

        // If no tab_id, consider invalid (not properly logged in)
        if (!tabId) {
            console.log('🧪 SESSION CHECK RESULT: INVALID (no tabId)');
            return false;
        }

        if (!admin) {
            // CRITICAL: If admin is undefined, it might be because another tab called signOut()
            // which broadcasts SIGNED_OUT to all tabs. Don't trigger logout here!
            // The tab will naturally redirect on next page load if auth is truly invalid.
            console.log('🧪 SESSION CHECK: No admin found - assuming valid to avoid false logout');
            return true;
        }

        try {
            // FIX #3: Use maybeSingle() instead of single() to avoid 406 errors
            const { data, error } = await supabase
                .from('user_sessions')
                .select('id')
                .eq('admin_id', admin.id)
                .eq('session_token', tabId)
                .maybeSingle();

            // 🧪 DEBUG: Log result
            console.log('🧪 SESSION ROW FOUND:', !!data, { error: error?.message });

            // If session not found in database, it was deleted
            if (!data) {
                return false;
            }

            return true;
        } catch (err) {
            console.error('Session validity check error:', err);
            return true; // Assume valid on error to avoid false logouts
        }
    },

    // Start realtime session monitoring (instant logout detection)
    startSessionValidityCheck() {
        // Use THIS_TAB_ID from MEMORY - not from sessionStorage
        // This prevents race conditions when logout clears sessionStorage before event fires
        if (!THIS_TAB_ID) {
            THIS_TAB_ID = sessionStorage.getItem('tab_id');
        }
        if (!THIS_TAB_ID) return;

        const supabase = window.supabaseClient;

        // Subscribe to DELETE events on user_sessions for THIS TAB's session only
        // The filter ensures we ONLY receive events for this specific tab_id
        const channel = supabase
            .channel('session-monitor-' + THIS_TAB_ID)
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'user_sessions',
                    filter: `session_token=eq.${THIS_TAB_ID}`
                },
                (payload) => {
                    console.log('📡 REALTIME DELETE EVENT RECEIVED', {
                        payload,
                        isSelfLogout,
                        THIS_TAB_ID,
                        time: new Date().toISOString()
                    });

                    // CRITICAL: Check if this is our own logout
                    if (isSelfLogout) {
                        console.log('⏭️ Ignoring delete event - this is our own logout');
                        return;
                    }

                    window.__DEBUG_LOGOUT('REALTIME_DELETE', { payload, THIS_TAB_ID });
                    this.handleRemoteLogout();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime session monitoring active for tab:', THIS_TAB_ID);
                }
            });

        // Store channel reference for cleanup
        this.sessionChannel = channel;

        // Fallback: Also check every 5 seconds in case realtime misses something
        this.validityInterval = setInterval(async () => {
            // Skip if we're logging out ourselves
            if (isSelfLogout) {
                console.log('⏭️ Skipping interval check: self logout');
                return;
            }

            console.log('⏱️ Interval session check fired');
            const isValid = await this.isCurrentSessionValid();
            if (!isValid) {
                window.__DEBUG_LOGOUT('FALLBACK_INTERVAL', { THIS_TAB_ID });
                this.handleRemoteLogout();
            }
        }, 5000);
    },

    // Handle remote logout (when this tab's session is deleted)
    async handleRemoteLogout() {
        // Prevent multiple triggers
        if (this.isLoggingOut) return;
        this.isLoggingOut = true;

        // Clear only tab_id (not everything)
        sessionStorage.removeItem('tab_id');
        THIS_TAB_ID = null; // FIX #2: Reset memory variable too

        // Unsubscribe from realtime
        if (this.sessionChannel) {
            window.supabaseClient.removeChannel(this.sessionChannel);
        }

        // DO NOT call signOut() - this is a remote logout for this tab only
        // Other tabs should remain unaffected

        // Show message and redirect using custom modal
        const { Modal } = window.AdminUtils || {};
        if (Modal && typeof Modal.alert === 'function') {
            Modal.alert('warning', 'Session Ended', 'Your session was logged out from another device.', () => {
                window.location.href = '/admin/login.html';
            });
        } else {
            window.location.href = '/admin/login.html';
        }
    }
};

// Export
window.Auth = Auth;

