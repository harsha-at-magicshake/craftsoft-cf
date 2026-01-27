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
            // Match /assets/* or /<subdir>/assets/*
            const assetRegex = /^\/(?:[\w-]+\/)?assets\/(.+)$/;
            const assetMatch = pathname.match(assetRegex);
            if (assetMatch) {
                // Always serve from /acs_subdomains/acs_admin/assets/<rest>
                const assetPath = `/acs_subdomains/acs_admin/assets/${assetMatch[1]}`;
                const newUrl = new URL(assetPath, url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // Root or /login → admin login page
            if (pathname === "/" || pathname === "" || pathname === "/login" || pathname === "/login/") {
                const newUrl = new URL("/acs_subdomains/acs_admin/index.html", url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // All other paths → rewrite to admin folder
            let finalPath = `/acs_subdomains/acs_admin${pathname}`;
            // Add trailing slash if no extension
            if (!pathname.includes(".") && !pathname.endsWith("/")) {
                finalPath += "/";
            }
            // Add index.html for directories
            if (finalPath.endsWith("/")) {
                finalPath += "index.html";
            }

            const newUrl = new URL(finalPath, url);
            return env.ASSETS.fetch(new Request(newUrl, request));
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
