// Supabase Configuration for Craft Soft Admin
(function () {
    const supabaseUrl = 'https://ogkownghceldmagzjhdq.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9na293bmdoY2VsZG1hZ3pqaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NTI1MzQsImV4cCI6MjA4MjEyODUzNH0.HQ64E3jcSc0eXRKTeNYplVoqagC2LqxXUeRri0PZBM4';

    // Initialize Supabase Client
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        const client = window.supabase.createClient(supabaseUrl, supabaseKey);

        // Assign to window properties
        // We use window['supabase'] to bypass potential redeclaration errors in some strict environments
        window['supabase'] = client;
        window['db'] = client;
        console.log('Supabase Initialized Successfully');
    } else {
        console.error('Supabase library not found. Check your CDN script tag.');
    }
})();
