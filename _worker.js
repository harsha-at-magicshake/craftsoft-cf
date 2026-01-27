/**
 * Cloudflare Pages Worker
 * Handles subdomain routing for craftsoft.co.in
 * Version: 3.7 - Full Netlify-parity Redirects & Path Mappings
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const hostname = url.hostname.toLowerCase();
        const pathname = url.pathname;

        // 1. ASSET AND LOOP PROTECTION
        if (pathname.startsWith('/acs_subdomains/')) {
            return env.ASSETS.fetch(request);
        }

        // 2. VIRTUAL ASSET ROUTING
        if (pathname.startsWith('/assets/admin/')) {
            const assetPath = `/acs_subdomains/acs_admin/assets/${pathname.replace('/assets/admin/', '')}`;
            return serveAsset(assetPath, request, env);
        }
        if (pathname.startsWith('/assets/student/')) {
            const assetPath = `/acs_subdomains/acs_students/assets/${pathname.replace('/assets/student/', '')}`;
            return serveAsset(assetPath, request, env);
        }

        // Shared root assets
        if (pathname.startsWith('/assets/') || pathname.startsWith('/shared/') || pathname === '/favicon.ico' || pathname === '/favicon.svg') {
            if (pathname === '/favicon.ico') {
                return env.ASSETS.fetch(new Request(new URL('/favicon.svg', url), request));
            }
            return env.ASSETS.fetch(request);
        }

        // 3. SUBDOMAIN DISPATCHER

        // --- ADMIN SUBDOMAIN ---
        if (hostname.includes('admin')) {
            // Block /signup/* on admin subdomain per Netlify config
            if (pathname.startsWith('/signup/')) {
                return env.ASSETS.fetch(new Request(new URL('/acs_subdomains/acs_admin/404/index.html', url), request));
            }
            return dispatchSubdomain('acs_admin', pathname, url, request, env, true);
        }

        // --- SIGNUP SUBDOMAIN ---
        if (hostname.includes('signup')) {
            return dispatchSubdomain('acs_signup', pathname, url, request, env, false);
        }

        // --- STUDENT PORTAL ---
        if (hostname.includes('student')) {
            return dispatchSubdomain('acs_students', pathname, url, request, env, false);
        }

        // 4. MAIN WEBSITE REDIRECTS (Legacy parity)
        const legacyRedirects = {
            '/about.html': '/about/',
            '/contact.html': '/contact/',
            '/courses.html': '/courses/',
            '/services.html': '/acs_services/',
            '/privacy-policy.html': '/privacy-policy/',
            '/terms-of-service.html': '/terms-of-service/',
            '/v-history': '/version-history/',
            '/vhistory': '/version-history/'
        };

        if (legacyRedirects[pathname]) {
            return Response.redirect(new URL(legacyRedirects[pathname], url), 301);
        }

        // Main site 404 block for internal folders
        if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/acs_subdomains/')) {
            return env.ASSETS.fetch(new Request(new URL('/404.html', url), request));
        }

        // DEFAULT (Main Website)
        return env.ASSETS.fetch(request);
    }
};

/**
 * Dispatches a subdomain request with full path mapping
 */
async function dispatchSubdomain(targetFolder, pathname, originalUrl, originalRequest, env, isAdmin) {
    let internalPath = `/acs_subdomains/${targetFolder}${pathname}`;

    // ADMIN Path Mappings (Netlify Reference)
    if (isAdmin) {
        const mappings = {
            '/dashboard': '/dashboard',
            '/archived': '/records/archived',
            '/recently-deleted': '/records/recently-deleted',
            '/archived-records': '/records/archived',
            '/students': '/students-clients/students',
            '/clients': '/students-clients/clients',
            '/courses': '/courses-services/courses',
            '/services': '/courses-services/services',
            '/upload-materials': '/academics/upload-materials',
            '/assignments': '/academics/assignments',
            '/submissions': '/academics/submissions',
            '/record-payment': '/payments/record-payment',
            '/all-payments': '/payments/all-payments',
            '/payment-receipts': '/payments/receipts',
            '/receipts': '/payments/receipts',
            '/tutors': '/tutors',
            '/inquiries': '/inquiries',
            '/settings': '/settings',
            '/version-history': '/version-history'
        };

        // Handle exact path matches and sub-paths
        for (const [webPath, fsPath] of Object.entries(mappings)) {
            if (pathname === webPath || pathname === webPath + '/') {
                internalPath = `/acs_subdomains/${targetFolder}${fsPath}/index.html`;
                break;
            }
            if (pathname.startsWith(webPath + '/')) {
                const rest = pathname.substring(webPath.length);
                internalPath = `/acs_subdomains/${targetFolder}${fsPath}${rest}`;
                break;
            }
        }
    }

    // Auto-append index.html for directory-like requests
    if (!internalPath.includes('.') && !internalPath.endsWith('/index.html')) {
        if (!internalPath.endsWith('/')) internalPath += '/';
        internalPath += 'index.html';
    }

    const subRequestUrl = new URL(internalPath, originalUrl.origin);
    let response = await env.ASSETS.fetch(new Request(subRequestUrl, originalRequest));

    // Redirect Shield (Intercept internal 301/302 redirects)
    if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
            const nextUrl = new URL(location, originalUrl.origin);
            if (nextUrl.pathname.includes('/acs_subdomains/')) {
                response = await env.ASSETS.fetch(new Request(nextUrl, originalRequest));
            }
        }
    }

    // Default 404 handling per subdomain
    if (response.status === 404) {
        if (targetFolder === 'acs_admin') {
            return env.ASSETS.fetch(new Request(new URL('/acs_subdomains/acs_admin/404/index.html', originalUrl.origin), originalRequest));
        } else if (targetFolder === 'acs_signup') {
            return env.ASSETS.fetch(new Request(new URL('/acs_subdomains/acs_signup/404/index.html', originalUrl.origin), originalRequest));
        }
    }

    return response;
}

/**
 * Serves an asset with correct MIME types
 */
async function serveAsset(internalPath, request, env) {
    const assetUrl = new URL(internalPath, new URL(request.url).origin);
    const res = await env.ASSETS.fetch(new Request(assetUrl, request));
    if (res.status === 404) return new Response('Asset not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });

    const headers = new Headers(res.headers);
    const cleanPath = internalPath.split('?')[0].split('#')[0];
    if (cleanPath.endsWith('.css')) headers.set('Content-Type', 'text/css');
    else if (cleanPath.endsWith('.js')) headers.set('Content-Type', 'application/javascript');

    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(res.body, { status: res.status, headers });
}
