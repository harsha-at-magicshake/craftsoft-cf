/* ============================================
   Supabase Website Configuration
   Public Module - Craft Soft
   ============================================ */

(function () {
    'use strict';

    // Global Console Silener - Keep console clean on production
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.log = function () { };
        console.warn = function () { };
        console.info = function () { };
        // Note: console.error is preserved for critical issue tracking
    }


    const SUPABASE_URL = '[[SUPABASE_URL]]';
    const SUPABASE_ANON_KEY = '[[SUPABASE_ANON_KEY]]';

    if (window.supabase) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
})();
