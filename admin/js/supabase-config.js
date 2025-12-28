/* ============================================
   Supabase Configuration
   Admin Module - Craft Soft
   ============================================ */

// Supabase Project Credentials
// TODO: Replace with your actual Supabase project credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.supabaseClient = supabase;

// Check if Supabase is properly configured
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

// Get current session
async function getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error);
        return null;
    }
    return session;
}

// Get current user
async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Error getting user:', error);
        return null;
    }
    return user;
}

// Listen to auth state changes
function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
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
