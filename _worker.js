/**
 * Cloudflare Pages Worker
 * Handles subdomain routing for craftsoft.co.in
 * Version: 3.5 - Clean Subdomain Isolation
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const hostname = url.hostname.toLowerCase();
        const pathname = url.pathname;

        // 1. PREVENT LOOPING/EXPOSURE
        // If the request directly contains the internal folder, serve it as-is if it's an asset,
        // but otherwise we want to keep it hidden.
        if (pathname.startsWith('/acs_subdomains/')) {
            return env.ASSETS.fetch(request);
        }

        // 2. ASSET ROUTING (Remap virtual paths to physical folders)
        // Admin & Signup use Admin assets
        if (pathname.startsWith('/assets/admin/')) {
            const assetPath = `/acs_subdomains/acs_admin/assets/${pathname.replace('/assets/admin/', '')}`;
            return serveAsset(assetPath, request, env);
        }

        // Student Portal Assets
        if (pathname.startsWith('/assets/student/')) {
            const assetPath = `/acs_subdomains/acs_students/assets/${pathname.replace('/assets/student/', '')}`;
            return serveAsset(assetPath, request, env);
        }

        // Shared Root Assets (favicon, global assets)
        if (pathname.startsWith('/assets/') || pathname === '/favicon.ico' || pathname === '/favicon.svg') {
            return env.ASSETS.fetch(request);
        }

        // 3. SUBDOMAIN HANDLERS

        // --- ADMNS ---
        if (hostname.startsWith('admin.')) {
            return handleSubdomainRequest('acs_admin', pathname, url, request, env, true);
        }

        // --- SIGNUP ---
        if (hostname.startsWith('signup.')) {
            return handleSubdomainRequest('acs_signup', pathname, url, request, env, false);
        }

        // --- STUDENTS ---
        if (hostname.startsWith('acs-student.')) {
            return handleSubdomainRequest('acs_students', pathname, url, request, env, false);
        }

        // --- DEFAULT (MAIN WEBSITE) ---
        return env.ASSETS.fetch(request);
    }
};

/**
 * Robust subdomain request handler
 */
async function handleSubdomainRequest(folder, pathname, url, request, env, isAdmin) {
    // 1. Root/Index handling
    if (pathname === "/" || pathname === "" || pathname === "/login" || pathname === "/login/") {
        const indexUrl = new URL(`/acs_subdomains/${folder}/index.html`, url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    // 2. Virtual Folder Remapping (for Admin Only)
    if (isAdmin) {
        const mappings = {
            '/dashboard': '/dashboard',
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
            '/recently-deleted': '/records/recently-deleted',
            '/tutors': '/tutors',
            '/inquiries': '/inquiries',
            '/settings': '/settings',
            '/version-history': '/version-history'
        };

        for (const [webPath, fsPath] of Object.entries(mappings)) {
            if (pathname === webPath || pathname === webPath + '/') {
                return env.ASSETS.fetch(new Request(new URL(`/acs_subdomains/${folder}${fsPath}/index.html`, url), request));
            }
            if (pathname.startsWith(webPath + '/')) {
                const rest = pathname.substring(webPath.length);
                const fileUrl = new URL(`/acs_subdomains/${folder}${fsPath}${rest}`, url);
                const res = await env.ASSETS.fetch(new Request(fileUrl, request));
                if (res.status === 200) return res;
                return env.ASSETS.fetch(new Request(new URL(`/acs_subdomains/${folder}${fsPath}/index.html`, url), request));
            }
        }
    }

    // 3. General File/Folder Mapping
    let targetPath = `/acs_subdomains/${folder}${pathname}`;

    // If it looks like a directory (no extension), append index.html
    if (!pathname.includes('.')) {
        if (!targetPath.endsWith('/')) targetPath += '/';
        targetPath += 'index.html';
    }

    const finalRequest = new Request(new URL(targetPath, url), request);
    const response = await env.ASSETS.fetch(finalRequest);

    // If 404 and it's Admin, show Admin 404
    if (response.status === 404 && folder === 'acs_admin') {
        return env.ASSETS.fetch(new Request(new URL('/acs_subdomains/acs_admin/404/index.html', url), request));
    }

    return response;
}

/**
 * Serves an asset with correct MIME types
 */
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
