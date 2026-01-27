/**
 * Cloudflare Pages Worker
 * Handles subdomain routing for craftsoft.co.in
 * Version: 3.4 - Loop-proof and Optimized
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const hostname = url.hostname.toLowerCase();
        const pathname = url.pathname;

        // 1. ASSET PROTECTION
        // Ensure that any request already targeting /acs_subdomains/ is served as is
        // to prevent recursive worker execution loops.
        if (pathname.startsWith('/acs_subdomains/')) {
            return env.ASSETS.fetch(request);
        }

        // 2. GLOBAL ASSET REMAPPING (Virtual paths to Physical folders)

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

        // Shared Root Assets: /assets/*, favicon, etc.
        if (pathname.startsWith('/assets/') || pathname === '/favicon.ico' || pathname === '/favicon.svg') {
            return env.ASSETS.fetch(request);
        }

        // 3. SUBDOMAIN ROUTING (Exact hostname checks for reliability)

        // --- ADMIN SUBDOMAIN ---
        // Handles: admin.craftsoft.co.in or local testing with 'admin' in name
        if (hostname.startsWith("admin.")) {
            if (pathname === "/" || pathname === "" || pathname === "/login" || pathname === "/login/") {
                return env.ASSETS.fetch(new Request(new URL("/acs_subdomains/acs_admin/index.html", url), request));
            }

            // Virtual folder remappings for Admin
            const adminFolders = [
                '/dashboard', '/archived', '/recently-deleted', '/students', '/clients',
                '/courses', '/services', '/upload-materials', '/assignments', '/submissions',
                '/record-payment', '/all-payments', '/payment-receipts', '/receipts',
                '/tutors', '/inquiries', '/settings', '/version-history'
            ];

            // Folders that need an internal mapping change (e.g., /students -> /students-clients/students)
            const specialMappings = {
                '/students': '/students-clients/students',
                '/clients': '/students-clients/clients',
                '/courses': '/courses-services/courses',
                '/services': '/courses-services/services',
                '/record-payment': '/payments/record-payment',
                '/all-payments': '/payments/all-payments',
                '/payment-receipts': '/payments/receipts',
                '/receipts': '/payments/receipts',
                '/upload-materials': '/academics/upload-materials',
                '/assignments': '/academics/assignments',
                '/submissions': '/academics/submissions',
                '/archived': '/records/archived',
                '/recently-deleted': '/records/recently-deleted'
            };

            for (const route of adminFolders) {
                if (pathname === route || pathname === route + '/') {
                    const fsPath = specialMappings[route] || route;
                    return env.ASSETS.fetch(new Request(new URL(`/acs_subdomains/acs_admin${fsPath}/index.html`, url), request));
                }
                if (pathname.startsWith(route + '/')) {
                    const fsPath = specialMappings[route] || route;
                    const rest = pathname.substring(route.length);
                    const fileUrl = new URL(`/acs_subdomains/acs_admin${fsPath}${rest}`, url);
                    const res = await env.ASSETS.fetch(new Request(fileUrl, request));
                    if (res.status === 200) return res;
                    return env.ASSETS.fetch(new Request(new URL(`/acs_subdomains/acs_admin${fsPath}/index.html`, url), request));
                }
            }

            // Direct file check for anything else in the admin folder
            const directUrl = new URL(`/acs_subdomains/acs_admin${pathname}`, url);
            const directRes = await env.ASSETS.fetch(new Request(directUrl, request));
            if (directRes.status === 200) return directRes;

            return env.ASSETS.fetch(new Request(new URL('/acs_subdomains/acs_admin/404/index.html', url), request));
        }

        // --- STUDENT PORTAL ---
        if (hostname.startsWith("acs-student.")) {
            if (pathname === "/" || pathname === "") {
                return env.ASSETS.fetch(new Request(new URL("/acs_subdomains/acs_students/index.html", url), request));
            }
            let targetPath = `/acs_subdomains/acs_students${pathname}`;
            // Only add slash if no extension and no trailing slash
            if (!pathname.includes(".") && !pathname.endsWith("/")) targetPath += "/";

            // If it ends in a slash, serve index.html
            if (targetPath.endsWith("/")) {
                const indexUrl = new URL(targetPath + "index.html", url);
                return env.ASSETS.fetch(new Request(indexUrl, request));
            }

            return env.ASSETS.fetch(new Request(new URL(targetPath, url), request));
        }

        // --- SIGNUP SUBDOMAIN ---
        if (hostname.startsWith("signup.")) {
            if (pathname === "/" || pathname === "") {
                return env.ASSETS.fetch(new Request(new URL("/acs_subdomains/acs_signup/index.html", url), request));
            }
            let targetPath = `/acs_subdomains/acs_signup${pathname}`;
            // Only add slash if no extension and no trailing slash
            if (!pathname.includes(".") && !pathname.endsWith("/")) targetPath += "/";

            // If it ends in a slash, serve index.html
            if (targetPath.endsWith("/")) {
                const indexUrl = new URL(targetPath + "index.html", url);
                return env.ASSETS.fetch(new Request(indexUrl, request));
            }

            return env.ASSETS.fetch(new Request(new URL(targetPath, url), request));
        }

        // --- MAIN WEBSITE ---
        return env.ASSETS.fetch(request);
    }
};

async function serveAsset(internalPath, request, env) {
    const assetUrl = new URL(internalPath, new URL(request.url));
    const res = await env.ASSETS.fetch(new Request(assetUrl, request));
    if (res.status === 404) return new Response('Asset not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });

    const headers = new Headers(res.headers);
    const cleanPath = internalPath.split('?')[0].split('#')[0];
    if (cleanPath.endsWith('.css')) headers.set('Content-Type', 'text/css');
    else if (cleanPath.endsWith('.js')) headers.set('Content-Type', 'application/javascript');

    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(res.body, { status: res.status, headers });
}
