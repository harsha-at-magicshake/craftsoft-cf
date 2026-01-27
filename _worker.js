/**
 * Cloudflare Pages Worker
 * Handles subdomain routing for craftsoft.co.in
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const hostname = url.hostname.toLowerCase();
        const pathname = url.pathname;

        // ============================================
        // 1. STUDENT PORTAL (acs-student.craftsoft.co.in)
        // ============================================
        if (hostname.includes("acs-student")) {
            // Root → login page
            if (pathname === "/" || pathname === "") {
                const newUrl = new URL("/acs_subdomains/acs_students/index.html", url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // Serve student assets
            if (pathname.startsWith("/assets/")) {
                const newUrl = new URL(`/acs_subdomains/acs_students${pathname}`, url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // All other paths
            let targetPath = `/acs_subdomains/acs_students${pathname}`;
            if (!pathname.includes(".") && !pathname.endsWith("/")) {
                targetPath += "/";
            }
            if (targetPath.endsWith("/")) {
                targetPath += "index.html";
            }
            
            const newUrl = new URL(targetPath, url);
            return env.ASSETS.fetch(new Request(newUrl, request));
        }

        // ============================================
        // 2. SIGNUP SUBDOMAIN (signup.craftsoft.co.in)
        // ============================================
        if (hostname.includes("signup")) {
            // Root → signup page
            if (pathname === "/" || pathname === "") {
                const newUrl = new URL("/acs_subdomains/acs_signup/index.html", url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // All other paths
            let targetPath = `/acs_subdomains/acs_signup${pathname}`;
            if (!pathname.includes(".") && !pathname.endsWith("/")) {
                targetPath += "/";
            }
            if (targetPath.endsWith("/")) {
                targetPath += "index.html";
            }
            
            const newUrl = new URL(targetPath, url);
            return env.ASSETS.fetch(new Request(newUrl, request));
        }

        // ============================================
        // 3. ADMIN SUBDOMAIN (admin.craftsoft.co.in)
        // ============================================
        if (hostname.includes("admin")) {
            // Root or login → admin index
            if (pathname === "/" || pathname === "" || pathname === "/login") {
                const newUrl = new URL("/acs_subdomains/acs_admin/index.html", url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // Admin assets rewrite
            if (pathname.startsWith("/assets/admin/")) {
                const assetPath = pathname.replace("/assets/admin/", "/acs_subdomains/acs_admin/assets/");
                const newUrl = new URL(assetPath, url);
                return env.ASSETS.fetch(new Request(newUrl, request));
            }

            // Short URL mappings
            let targetPath = pathname;
            const mappings = [
                { from: "/students", to: "/students-clients/students" },
                { from: "/clients", to: "/students-clients/clients" },
                { from: "/courses", to: "/courses-services/courses" },
                { from: "/services", to: "/courses-services/services" },
                { from: "/record-payment", to: "/payments/record-payment" },
                { from: "/all-payments", to: "/payments/all-payments" },
                { from: "/payment-receipts", to: "/payments/receipts" },
                { from: "/receipts", to: "/payments/receipts" },
                { from: "/upload-materials", to: "/academics/upload-materials" },
                { from: "/assignments", to: "/academics/assignments" },
                { from: "/submissions", to: "/academics/submissions" },
                { from: "/archived-records", to: "/records/archived" },
                { from: "/archived", to: "/records/archived" },
                { from: "/recently-deleted", to: "/records/recently-deleted" }
            ];

            for (const map of mappings) {
                if (pathname === map.from || pathname.startsWith(map.from + "/")) {
                    targetPath = pathname.replace(map.from, map.to);
                    break;
                }
            }

            // Build final path
            let finalPath = `/acs_subdomains/acs_admin${targetPath}`;
            if (!finalPath.includes(".") && !finalPath.endsWith("/")) {
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
