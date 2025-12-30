/* ============================================
   Authentication Logic
   Signup, Login, Logout, Verify
   ============================================ */

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
    // LOGOUT
    // ============================================
    async logout() {
        const supabase = window.supabaseClient;

        try {
            // Delete current session record
            await this.deleteCurrentSession();

            const { error } = await supabase.auth.signOut();

            if (error) {
                throw error;
            }

            return { success: true };

        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    async createSession(adminId, accessToken) {
        const supabase = window.supabaseClient;

        try {
            const sessionToken = accessToken || crypto.randomUUID();
            const deviceInfo = this.getDeviceInfo();

            // Store session token in localStorage
            localStorage.setItem('session_token', sessionToken);

            const { error } = await supabase
                .from('user_sessions')
                .insert({
                    admin_id: adminId,
                    session_token: sessionToken,
                    device_info: deviceInfo,
                    ip_address: await this.getIPAddress()
                });

            if (error) {
                console.error('Error creating session:', error);
            }
        } catch (err) {
            console.error('Create session error:', err);
        }
    },

    async deleteCurrentSession() {
        const supabase = window.supabaseClient;
        const sessionToken = localStorage.getItem('session_token');

        if (!sessionToken) return;

        try {
            await supabase
                .from('user_sessions')
                .delete()
                .eq('session_token', sessionToken);

            localStorage.removeItem('session_token');
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
            localStorage.removeItem('session_token');
            return { success: true };
        } catch (err) {
            console.error('Delete all sessions error:', err);
            return { success: false, error: err.message };
        }
    },

    async updateSessionActivity() {
        const supabase = window.supabaseClient;
        const sessionToken = localStorage.getItem('session_token');

        if (!sessionToken) return;

        try {
            await supabase
                .from('user_sessions')
                .update({ last_active: new Date().toISOString() })
                .eq('session_token', sessionToken);
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
        const sessionToken = localStorage.getItem('session_token');

        // If no session token stored, consider valid (unregistered session)
        if (!sessionToken) return true;

        try {
            const { data, error } = await supabase
                .from('user_sessions')
                .select('id')
                .eq('session_token', sessionToken)
                .single();

            // If session not found in database, it was deleted remotely
            if (error || !data) {
                return false;
            }

            return true;
        } catch (err) {
            console.error('Session validity check error:', err);
            return true; // Assume valid on error to avoid false logouts
        }
    },

    // Start periodic session validity check
    startSessionValidityCheck() {
        // Check every 30 seconds
        setInterval(async () => {
            const isValid = await this.isCurrentSessionValid();

            if (!isValid) {
                console.log('Session invalidated remotely, logging out...');

                // Clear local data
                localStorage.removeItem('session_token');
                localStorage.removeItem('craftsoft_accounts');
                localStorage.removeItem('craftsoft_sessions');

                // Sign out and redirect
                await window.supabaseClient.auth.signOut();

                // Show message and redirect
                alert('Your session was logged out from another device.');
                window.location.href = '/admin/login.html';
            }
        }, 30000); // 30 seconds
    }
};

// Export
window.Auth = Auth;

