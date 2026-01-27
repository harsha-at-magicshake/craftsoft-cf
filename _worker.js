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


            // 3. Exact-match and subfolder rewrites for all admin subpages
            const adminFolders = [
                { web: '/dashboard', fs: '/acs_subdomains/acs_admin/dashboard' },
                { web: '/archived', fs: '/acs_subdomains/acs_admin/records/archived' },
                { web: '/recently-deleted', fs: '/acs_subdomains/acs_admin/records/recently-deleted' },
                { web: '/students', fs: '/acs_subdomains/acs_admin/students-clients/students' },
                { web: '/clients', fs: '/acs_subdomains/acs_admin/students-clients/clients' },
                { web: '/courses', fs: '/acs_subdomains/acs_admin/courses-services/courses' },
                { web: '/services', fs: '/acs_subdomains/acs_admin/courses-services/services' },
                { web: '/upload-materials', fs: '/acs_subdomains/acs_admin/academics/upload-materials' },
                { web: '/assignments', fs: '/acs_subdomains/acs_admin/academics/assignments' },
                { web: '/submissions', fs: '/acs_subdomains/acs_admin/academics/submissions' },
                { web: '/record-payment', fs: '/acs_subdomains/acs_admin/payments/record-payment' },
                { web: '/all-payments', fs: '/acs_subdomains/acs_admin/payments/all-payments' },
                { web: '/payment-receipts', fs: '/acs_subdomains/acs_admin/payments/receipts' },
                { web: '/receipts', fs: '/acs_subdomains/acs_admin/payments/receipts' },
                { web: '/tutors', fs: '/acs_subdomains/acs_admin/tutors' },
                { web: '/inquiries', fs: '/acs_subdomains/acs_admin/inquiries' },
                { web: '/settings', fs: '/acs_subdomains/acs_admin/settings' },
                { web: '/version-history', fs: '/acs_subdomains/acs_admin/version-history' },
            ];
            for (const route of adminFolders) {
                // /page or /page/ → /fs/index.html
                if (pathname === route.web || pathname === route.web + '/') {
                    const newUrl = new URL(route.fs + '/index.html', url);
                    return env.ASSETS.fetch(new Request(newUrl, request));
                }
                // Prevent recursive /dashboard/dashboard... etc. by always serving index.html for /page/dashboard, /page/dashboard/, etc.
                if (pathname === route.web + '/dashboard' || pathname === route.web + '/dashboard/') {
                    const newUrl = new URL(route.fs + '/index.html', url);
                    return env.ASSETS.fetch(new Request(newUrl, request));
                }
                // /page/anything → /fs/anything, but prevent infinite recursion
                if (pathname.startsWith(route.web + '/')) {
                    const rest = pathname.substring((route.web + '/').length);
                    // If rest contains another /dashboard or /students, serve index.html
                    if (rest.startsWith('dashboard') || rest.startsWith('students') || rest.startsWith('clients')) {
                        const newUrl = new URL(route.fs + '/index.html', url);
                        return env.ASSETS.fetch(new Request(newUrl, request));
                    }
                    const newUrl = new URL(route.fs + '/' + rest, url);
                    return env.ASSETS.fetch(new Request(newUrl, request));
                }
            }

            // 5. If already inside /acs_subdomains/acs_admin/, serve directly (prevent recursion)
            if (pathname.startsWith('/acs_subdomains/acs_admin/')) {
                const newUrl = new URL(pathname, url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // 6. All other paths → admin 404
            const notFoundUrl = new URL('/acs_subdomains/acs_admin/404/index.html', url);
            return env.ASSETS.fetch(new Request(notFoundUrl, request));
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
