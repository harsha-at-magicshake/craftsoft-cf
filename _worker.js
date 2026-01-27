/**
 * Cloudflare Pages Worker
 * Handles subdomain routing for craftsoft.co.in
 * Version: 3.3 - Optimized for Cloudflare Custom Domains
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const hostname = url.hostname.toLowerCase();
        const pathname = url.pathname;

        // 1. GLOBAL ASSET REMAPPING (Virtual paths to Physical folders)
        // This must happen before any static extension checks

        // Admin Assets: /assets/admin/* -> /acs_subdomains/acs_admin/assets/*
        if (pathname.startsWith('/assets/admin/')) {
            const internalPath = `/acs_subdomains/acs_admin/assets/${pathname.replace('/assets/admin/', '')}`;
            return serveAsset(internalPath, request, env);
        }

        // Student Assets: /assets/student/* -> /acs_subdomains/acs_students/assets/*
        if (pathname.startsWith('/assets/student/')) {
            const internalPath = `/acs_subdomains/acs_students/assets/${pathname.replace('/assets/student/', '')}`;
            return serveAsset(internalPath, request, env);
        }

        // Shared Root Assets: /assets/* -> /assets/*
        if (pathname.startsWith('/assets/')) {
            return serveAsset(pathname, request, env);
        }

        // Favicon handling
        if (pathname === '/favicon.ico' || pathname === '/favicon.svg') {
            return env.ASSETS.fetch(request);
        }

        // 2. SUBDOMAIN ROUTING

        // --- ADMIN SUBDOMAIN ---
        if (hostname.includes("admin")) {
            // Root or login -> admin index
            if (pathname === "/" || pathname === "" || pathname === "/login" || pathname === "/login/") {
                return env.ASSETS.fetch(new Request(new URL("/acs_subdomains/acs_admin/index.html", url), request));
            }

            // Virtual folder remappings for Admin
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
                { web: '/version-history', fs: '/acs_subdomains/acs_admin/version-history' }
            ];

            for (const route of adminFolders) {
                if (pathname === route.web || pathname === route.web + '/') {
                    return env.ASSETS.fetch(new Request(new URL(route.fs + '/index.html', url), request));
                }
                if (pathname.startsWith(route.web + '/')) {
                    const rest = pathname.substring((route.web + '/').length);
                    const fileUrl = new URL(route.fs + '/' + rest, url);
                    const res = await env.ASSETS.fetch(new Request(fileUrl, request));
                    if (res.status === 200) return res;
                    return env.ASSETS.fetch(new Request(new URL(route.fs + '/index.html', url), request));
                }
            }

            // Fallback for files physically in the folder but not mapped
            const directUrl = new URL(`/acs_subdomains/acs_admin${pathname}`, url);
            const directRes = await env.ASSETS.fetch(new Request(directUrl, request));
            if (directRes.status === 200) return directRes;

            return env.ASSETS.fetch(new Request(new URL('/acs_subdomains/acs_admin/404/index.html', url), request));
        }

        // --- STUDENT PORTAL ---
        if (hostname.includes("acs-student")) {
            if (pathname === "/" || pathname === "") {
                return env.ASSETS.fetch(new Request(new URL("/acs_subdomains/acs_students/index.html", url), request));
            }
            let targetPath = `/acs_subdomains/acs_students${pathname}`;
            if (!pathname.includes(".") && !pathname.endsWith("/")) targetPath += "/";
            if (targetPath.endsWith("/")) targetPath += "index.html";
            return env.ASSETS.fetch(new Request(new URL(targetPath, url), request));
        }

        // --- SIGNUP SUBDOMAIN ---
        if (hostname.includes("signup")) {
            if (pathname === "/" || pathname === "") {
                return env.ASSETS.fetch(new Request(new URL("/acs_subdomains/acs_signup/index.html", url), request));
            }
            let targetPath = `/acs_subdomains/acs_signup${pathname}`;
            if (!pathname.includes(".") && !pathname.endsWith("/")) targetPath += "/";
            if (targetPath.endsWith("/")) targetPath += "index.html";
            return env.ASSETS.fetch(new Request(new URL(targetPath, url), request));
        }

        // --- MAIN WEBSITE ---
        return env.ASSETS.fetch(request);
    }
};

/**
 * Serves an asset with correct MIME types, ignoring query strings
 */
async function serveAsset(internalPath, request, env) {
    const url = new URL(request.url);
    const assetUrl = new URL(internalPath, url);
    const res = await env.ASSETS.fetch(new Request(assetUrl, request));

    // If file missing, handle it properly (avoid serving HTML for JS/CSS)
    if (res.status === 404) {
        return new Response('Asset not found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    const headers = new Headers(res.headers);
    const cleanPath = internalPath.split('?')[0].split('#')[0];

    if (cleanPath.endsWith('.css')) {
        headers.set('Content-Type', 'text/css');
    } else if (cleanPath.endsWith('.js')) {
        headers.set('Content-Type', 'application/javascript');
    }

    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(res.body, { status: res.status, headers });
}
