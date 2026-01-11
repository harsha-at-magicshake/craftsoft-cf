// Admin 404 - Conditional Button Logic
document.addEventListener('DOMContentLoaded', function () {
    const primaryBtn = document.getElementById('primary-btn');

    // Check for Supabase session in localStorage
    const supabaseKey = Object.keys(localStorage).find(key =>
        key.startsWith('sb-') && key.endsWith('-auth-token')
    );

    const isLoggedIn = supabaseKey && localStorage.getItem(supabaseKey);

    if (isLoggedIn) {
        // User is logged in - show Dashboard button
        primaryBtn.innerHTML = '<i class="fas fa-th-large"></i> Back to Dashboard';
        primaryBtn.href = 'https://admin.craftsoft.co.in/dashboard';
    } else {
        // User is not logged in - show Login button (default in HTML)
        primaryBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        primaryBtn.href = 'https://admin.craftsoft.co.in/login';
    }
});
