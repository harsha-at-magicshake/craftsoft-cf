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

            // 3. Exact-match admin rewrites (no regex, no recursion)
            const adminRoutes = [
                { path: '/dashboard', target: '/acs_subdomains/acs_admin/dashboard/index.html' },
                { path: '/dashboard/', target: '/acs_subdomains/acs_admin/dashboard/index.html' },
                { path: '/archived', target: '/acs_subdomains/acs_admin/records/archived/index.html' },
                { path: '/archived/', target: '/acs_subdomains/acs_admin/records/archived/index.html' },
                { path: '/recently-deleted', target: '/acs_subdomains/acs_admin/records/recently-deleted/index.html' },
                { path: '/recently-deleted/', target: '/acs_subdomains/acs_admin/records/recently-deleted/index.html' },
                { path: '/students', target: '/acs_subdomains/acs_admin/students-clients/students/index.html' },
                { path: '/students/', target: '/acs_subdomains/acs_admin/students-clients/students/index.html' },
                { path: '/clients', target: '/acs_subdomains/acs_admin/students-clients/clients/index.html' },
                { path: '/clients/', target: '/acs_subdomains/acs_admin/students-clients/clients/index.html' },
                { path: '/courses', target: '/acs_subdomains/acs_admin/courses-services/courses/index.html' },
                { path: '/courses/', target: '/acs_subdomains/acs_admin/courses-services/courses/index.html' },
                { path: '/services', target: '/acs_subdomains/acs_admin/courses-services/services/index.html' },
                { path: '/services/', target: '/acs_subdomains/acs_admin/courses-services/services/index.html' },
                { path: '/upload-materials', target: '/acs_subdomains/acs_admin/academics/upload-materials/index.html' },
                { path: '/upload-materials/', target: '/acs_subdomains/acs_admin/academics/upload-materials/index.html' },
                { path: '/assignments', target: '/acs_subdomains/acs_admin/academics/assignments/index.html' },
                { path: '/assignments/', target: '/acs_subdomains/acs_admin/academics/assignments/index.html' },
                { path: '/submissions', target: '/acs_subdomains/acs_admin/academics/submissions/index.html' },
                { path: '/submissions/', target: '/acs_subdomains/acs_admin/academics/submissions/index.html' },
                { path: '/record-payment', target: '/acs_subdomains/acs_admin/payments/record-payment/index.html' },
                { path: '/record-payment/', target: '/acs_subdomains/acs_admin/payments/record-payment/index.html' },
                { path: '/all-payments', target: '/acs_subdomains/acs_admin/payments/all-payments/index.html' },
                { path: '/all-payments/', target: '/acs_subdomains/acs_admin/payments/all-payments/index.html' },
                { path: '/payment-receipts', target: '/acs_subdomains/acs_admin/payments/receipts/index.html' },
                { path: '/payment-receipts/', target: '/acs_subdomains/acs_admin/payments/receipts/index.html' },
                { path: '/receipts', target: '/acs_subdomains/acs_admin/payments/receipts/index.html' },
                { path: '/receipts/', target: '/acs_subdomains/acs_admin/payments/receipts/index.html' },
                { path: '/tutors', target: '/acs_subdomains/acs_admin/tutors/index.html' },
                { path: '/tutors/', target: '/acs_subdomains/acs_admin/tutors/index.html' },
                { path: '/inquiries', target: '/acs_subdomains/acs_admin/inquiries/index.html' },
                { path: '/inquiries/', target: '/acs_subdomains/acs_admin/inquiries/index.html' },
                { path: '/settings', target: '/acs_subdomains/acs_admin/settings/index.html' },
                { path: '/settings/', target: '/acs_subdomains/acs_admin/settings/index.html' },
                { path: '/version-history', target: '/acs_subdomains/acs_admin/version-history/index.html' },
                { path: '/version-history/', target: '/acs_subdomains/acs_admin/version-history/index.html' },
            ];
            for (const route of adminRoutes) {
                if (pathname === route.path) {
                    const newUrl = new URL(route.target, url);
                    return env.ASSETS.fetch(new Request(newUrl, request));
                }
            }

            // 4. Subfolder rewrites (e.g. /students/abc → /acs_subdomains/acs_admin/students-clients/students/abc)
            const subfolderRoutes = [
                { prefix: '/dashboard/', target: '/acs_subdomains/acs_admin/dashboard' },
                { prefix: '/archived/', target: '/acs_subdomains/acs_admin/records/archived' },
                { prefix: '/recently-deleted/', target: '/acs_subdomains/acs_admin/records/recently-deleted' },
                { prefix: '/students/', target: '/acs_subdomains/acs_admin/students-clients/students' },
                { prefix: '/clients/', target: '/acs_subdomains/acs_admin/students-clients/clients' },
                { prefix: '/courses/', target: '/acs_subdomains/acs_admin/courses-services/courses' },
                { prefix: '/services/', target: '/acs_subdomains/acs_admin/courses-services/services' },
                { prefix: '/upload-materials/', target: '/acs_subdomains/acs_admin/academics/upload-materials' },
                { prefix: '/assignments/', target: '/acs_subdomains/acs_admin/academics/assignments' },
                { prefix: '/submissions/', target: '/acs_subdomains/acs_admin/academics/submissions' },
                { prefix: '/record-payment/', target: '/acs_subdomains/acs_admin/payments/record-payment' },
                { prefix: '/all-payments/', target: '/acs_subdomains/acs_admin/payments/all-payments' },
                { prefix: '/payment-receipts/', target: '/acs_subdomains/acs_admin/payments/receipts' },
                { prefix: '/receipts/', target: '/acs_subdomains/acs_admin/payments/receipts' },
                { prefix: '/tutors/', target: '/acs_subdomains/acs_admin/tutors' },
                { prefix: '/inquiries/', target: '/acs_subdomains/acs_admin/inquiries' },
                { prefix: '/settings/', target: '/acs_subdomains/acs_admin/settings' },
                { prefix: '/version-history/', target: '/acs_subdomains/acs_admin/version-history' },
            ];
            for (const route of subfolderRoutes) {
                if (pathname.startsWith(route.prefix)) {
                    const rest = pathname.substring(route.prefix.length);
                    const newUrl = new URL(`${route.target}/${rest}`, url);
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
