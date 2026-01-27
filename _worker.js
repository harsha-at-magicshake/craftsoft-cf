/**
 * Cloudflare Pages Worker
 * Handles subdomain routing for craftsoft.co.in
 * Version: 3.6 - Hardened Routing & Redirect Shield
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const hostname = url.hostname.toLowerCase();
        const pathname = url.pathname;

        // 1. ASSET AND LOOP PROTECTION
        // Serving real files directly from the internal folder if requested (e.g. by another subrequest)
        if (pathname.startsWith('/acs_subdomains/')) {
            return env.ASSETS.fetch(request);
        }

        // 2. VIRTUAL ASSET ROUTING
        // Remap /assets/admin/* and /assets/student/*
        if (pathname.startsWith('/assets/admin/')) {
            const assetPath = `/acs_subdomains/acs_admin/assets/${pathname.replace('/assets/admin/', '')}`;
            return serveAsset(assetPath, request, env);
        }
        if (pathname.startsWith('/assets/student/')) {
            const assetPath = `/acs_subdomains/acs_students/assets/${pathname.replace('/assets/student/', '')}`;
            return serveAsset(assetPath, request, env);
        }

        // 3. SUBDOMAIN DISPATCHER

        // --- ADMNS ---
        if (hostname.includes('admin')) {
            return dispatchSubdomain('acs_admin', pathname, url, request, env);
        }

        // --- SIGNUP ---
        if (hostname.includes('signup')) {
            return dispatchSubdomain('acs_signup', pathname, url, request, env);
        }

        // --- STUDENTS ---
        if (hostname.includes('student')) {
            return dispatchSubdomain('acs_students', pathname, url, request, env);
        }

        // 4. MAIN WEBSITE FALLBACK (www or root)
        return env.ASSETS.fetch(request);
    }
};

/**
 * Dispatches a subdomain request to its designated folder with redirect shielding
 */
async function dispatchSubdomain(targetFolder, pathname, originalUrl, originalRequest, env) {
    // Construct internal path
    let internalPath = `/acs_subdomains/${targetFolder}${pathname}`;

    // Auto-append index.html for directory-like requests to prevent origin redirects
    if (!pathname.includes('.') && !internalPath.endsWith('/index.html')) {
        if (!internalPath.endsWith('/')) internalPath += '/';
        internalPath += 'index.html';
    }

    // Create the sub-request URL (Force hostname to be the origin for sub-request)
    const subRequestUrl = new URL(internalPath, originalUrl.origin);

    // Fetch internally
    let response = await env.ASSETS.fetch(new Request(subRequestUrl, originalRequest));

    // SHIELD: If the origin server returns a redirect (e.g. 301/302 for trailing slashes),
    // we follow it internally instead of letting it reach the browser.
    if (response.status >= 300 && response.status < 400) {
        const redirectLocation = response.headers.get('Location');
        if (redirectLocation) {
            const newInternalUrl = new URL(redirectLocation, originalUrl.origin);
            if (newInternalUrl.pathname.includes('/acs_subdomains/')) {
                response = await env.ASSETS.fetch(new Request(newInternalUrl, originalRequest));
            }
        }
    }

    // Default 404 handler for subdomains
    if (response.status === 404 && targetFolder === 'acs_admin') {
        const notFoundUrl = new URL('/acs_subdomains/acs_admin/404/index.html', originalUrl.origin);
        return env.ASSETS.fetch(new Request(notFoundUrl, originalRequest));
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
