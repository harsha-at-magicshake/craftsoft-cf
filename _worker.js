/**
 * Cloudflare Pages Worker
 * Handles subdomain routing for craftsoft.co.in
 * Version: 3.0 - Complete rewrite matching Netlify behavior
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const hostname = url.hostname.toLowerCase();
        const pathname = url.pathname;

        // ============================================
        // 1. ADMIN SUBDOMAIN (admin.craftsoft.co.in)
        // ============================================
        if (hostname.includes("admin")) {

            // 1. /assets/admin/* → /acs_subdomains/acs_admin/assets/:splat
            if (pathname.startsWith('/assets/admin/')) {
                const assetPath = `/acs_subdomains/acs_admin/assets/${pathname.replace('/assets/admin/', '')}`;
                const newUrl = new URL(assetPath, url);
                const res = await env.ASSETS.fetch(new Request(newUrl, request));
                // Set correct headers for CSS/JS
                return new Response(res.body, {
                    status: res.status,
                    headers: setAssetHeaders(assetPath, res.headers)
                });
            }

            // 2. /assets/* → /assets/:splat (shared root assets)
            if (pathname.startsWith('/assets/')) {
                const assetPath = `/assets/${pathname.replace('/assets/', '')}`;
                const newUrl = new URL(assetPath, url);
                const res = await env.ASSETS.fetch(new Request(newUrl, request));
                return new Response(res.body, {
                    status: res.status,
                    headers: setAssetHeaders(assetPath, res.headers)
                });
            }


            // Netlify parity: /signup/* always returns admin 404
            if (pathname.startsWith("/signup/")) {
                const newUrl = new URL("/acs_subdomains/acs_admin/404/index.html", url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }


            // Root or /login → admin login page
            if (pathname === "/" || pathname === "" || pathname === "/login" || pathname === "/login/") {
                const newUrl = new URL("/acs_subdomains/acs_admin/index.html", url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // Prevent recursive rewrites: if already inside /acs_subdomains/acs_admin/, serve directly
            if (pathname.startsWith('/acs_subdomains/acs_admin/')) {
                const newUrl = new URL(pathname, url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // Major Netlify admin rewrites (dashboard, inquiries, etc.)
            const adminRewrites = [
                { from: /^\/dashboard(\/.*)?$/, to: '/acs_subdomains/acs_admin/dashboard$1' },
                { from: /^\/archived(\/.*)?$/, to: '/acs_subdomains/acs_admin/records/archived$1' },
                { from: /^\/recently-deleted(\/.*)?$/, to: '/acs_subdomains/acs_admin/records/recently-deleted$1' },
                { from: /^\/students(\/.*)?$/, to: '/acs_subdomains/acs_admin/students-clients/students$1' },
                { from: /^\/clients(\/.*)?$/, to: '/acs_subdomains/acs_admin/students-clients/clients$1' },
                { from: /^\/courses(\/.*)?$/, to: '/acs_subdomains/acs_admin/courses-services/courses$1' },
                { from: /^\/services(\/.*)?$/, to: '/acs_subdomains/acs_admin/courses-services/services$1' },
                { from: /^\/upload-materials(\/.*)?$/, to: '/acs_subdomains/acs_admin/academics/upload-materials$1' },
                { from: /^\/assignments(\/.*)?$/, to: '/acs_subdomains/acs_admin/academics/assignments$1' },
                { from: /^\/submissions(\/.*)?$/, to: '/acs_subdomains/acs_admin/academics/submissions$1' },
                { from: /^\/record-payment(\/.*)?$/, to: '/acs_subdomains/acs_admin/payments/record-payment$1' },
                { from: /^\/all-payments(\/.*)?$/, to: '/acs_subdomains/acs_admin/payments/all-payments$1' },
                { from: /^\/payment-receipts(\/.*)?$/, to: '/acs_subdomains/acs_admin/payments/receipts$1' },
                { from: /^\/receipts(\/.*)?$/, to: '/acs_subdomains/acs_admin/payments/receipts$1' },
                { from: /^\/tutors(\/.*)?$/, to: '/acs_subdomains/acs_admin/tutors$1' },
                { from: /^\/inquiries(\/.*)?$/, to: '/acs_subdomains/acs_admin/inquiries$1' },
                { from: /^\/settings(\/.*)?$/, to: '/acs_subdomains/acs_admin/settings$1' },
                { from: /^\/version-history(\/.*)?$/, to: '/acs_subdomains/acs_admin/version-history$1' },
            ];
            for (const rule of adminRewrites) {
                const m = pathname.match(rule.from);
                if (m) {
                    let target = rule.to.replace('$1', m[1] || '');
                    // Add trailing slash if no extension
                    if (!target.includes('.') && !target.endsWith('/')) target += '/';
                    // Add index.html for directories
                    if (target.endsWith('/')) target += 'index.html';
                    const newUrl = new URL(target, url);
                    return env.ASSETS.fetch(new Request(newUrl, request));
                }
            }

            // All other paths → rewrite to admin folder
            let finalPath = `/acs_subdomains/acs_admin${pathname}`;
            if (!pathname.includes(".") && !pathname.endsWith("/")) {
                finalPath += "/";
            }
            if (finalPath.endsWith("/")) {
                finalPath += "index.html";
            }
            const newUrl = new URL(finalPath, url);
            return env.ASSETS.fetch(new Request(newUrl, request));
        }
// Helper to set correct headers for CSS/JS assets
function setAssetHeaders(assetPath, origHeaders) {
    const headers = new Headers(origHeaders);
    if (assetPath.endsWith('.css')) {
        headers.set('Content-Type', 'text/css');
        headers.set('X-Content-Type-Options', 'nosniff');
    } else if (assetPath.endsWith('.js')) {
        headers.set('Content-Type', 'application/javascript');
        headers.set('X-Content-Type-Options', 'nosniff');
    }
    return headers;
}

        // ============================================
        // 2. STUDENT PORTAL (acs-student.craftsoft.co.in)
        // ============================================
        if (hostname.includes("acs-student")) {
            
            // ALL /assets/* requests → serve from students assets folder
            if (pathname.startsWith("/assets/")) {
                const assetPath = `/acs_subdomains/acs_students${pathname}`;
                const newUrl = new URL(assetPath, url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // Root → login page
            if (pathname === "/" || pathname === "") {
                const newUrl = new URL("/acs_subdomains/acs_students/index.html", url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // All other paths
            let finalPath = `/acs_subdomains/acs_students${pathname}`;
            if (!pathname.includes(".") && !pathname.endsWith("/")) {
                finalPath += "/";
            }
            if (finalPath.endsWith("/")) {
                finalPath += "index.html";
            }
            
            const newUrl = new URL(finalPath, url);
            return env.ASSETS.fetch(new Request(newUrl, request));
        }

        // ============================================
        // 3. SIGNUP SUBDOMAIN (signup.craftsoft.co.in)
        // ============================================
        if (hostname.includes("signup")) {
            
            // Root → signup page
            if (pathname === "/" || pathname === "") {
                const newUrl = new URL("/acs_subdomains/acs_signup/index.html", url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // All other paths
            let finalPath = `/acs_subdomains/acs_signup${pathname}`;
            if (!pathname.includes(".") && !pathname.endsWith("/")) {
                finalPath += "/";
            }
            if (finalPath.endsWith("/")) {
                finalPath += "index.html";
            }
            
            const newUrl = new URL(finalPath, url);
            return env.ASSETS.fetch(new Request(newUrl, request));
        }

        // ============================================
        // 4. MAIN WEBSITE (craftsoft.co.in / www)
        // ============================================
        return env.ASSETS.fetch(request);
    }
};
