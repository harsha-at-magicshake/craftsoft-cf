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
                    role: 'OWNER',
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
                    .single();

                if (adminError || !adminData) {
                    return { success: false, error: 'Admin ID not found' };
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
    }
};

// Export
window.Auth = Auth;
