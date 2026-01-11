/* ============================================
   Supabase Configuration
   Admin Module - Craft Soft
   ============================================ */

(function () {
    'use strict';

    // Global Console Silencer - Keep console clean on production
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.log = function () { };
        console.warn = function () { };
        console.info = function () { };
        // Note: console.error is preserved for critical issue tracking
    }


    // Supabase Project Credentials
    const SUPABASE_URL = '[[SUPABASE_URL]]';
    const SUPABASE_ANON_KEY = '[[SUPABASE_ANON_KEY]]';

    // Initialize Supabase Client with sessionStorage for per-tab sessions
    // This allows different tabs to have different logged-in users
    const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            storage: window.sessionStorage,
            storageKey: 'sb-auth-token',
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });

    // Export for use in other modules
    window.supabaseClient = sbClient;

    // Check if Supabase is properly configured
    function isSupabaseConfigured() {
        return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
    }

    // Get current session
    async function getCurrentSession() {
        try {
            const { data: { session }, error } = await sbClient.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                return null;
            }
            return session;
        } catch (e) {
            console.error('Session error:', e);
            return null;
        }
    }

    // Get current user
    async function getCurrentUser() {
        try {
            const { data: { user }, error } = await sbClient.auth.getUser();
            if (error) {
                console.error('Error getting user:', error);
                return null;
            }
            return user;
        } catch (e) {
            console.error('User error:', e);
            return null;
        }
    }

    // Listen to auth state changes
    function onAuthStateChange(callback) {
        return sbClient.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    }

    // Export functions
    window.supabaseConfig = {
        isConfigured: isSupabaseConfigured,
        getSession: getCurrentSession,
        getUser: getCurrentUser,
        onAuthStateChange: onAuthStateChange
    };

})();
