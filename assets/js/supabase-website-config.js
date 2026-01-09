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


    const SUPABASE_URL = 'https://afocbygdakyqtmmrjvmy.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmb2NieWdkYWt5cXRtbXJqdm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5Mzc5MjksImV4cCI6MjA4MjUxMzkyOX0.L7YerK7umlQ0H9WOCfGzY6AcKVjHs7aDKvXLYcCj-f0';

    if (window.supabase) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
})();
