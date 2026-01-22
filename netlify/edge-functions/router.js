export default async (request, context) => {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname;

    // 1. Student Portal Subdomain - MUST be checked FIRST before generic bypass
    if (hostname.includes("acs-student.craftsoft")) {
        // Student assets served from student folder
        if (pathname.startsWith("/assets/")) {
            return context.rewrite(`/acs_subdomains/acs_students${pathname}`);
        }

        if (pathname === "/") {
            return context.rewrite("/acs_subdomains/acs_students/index.html");
        }

        if (!pathname.includes(".") && !pathname.endsWith("/")) {
            return Response.redirect(`${request.url}/`, 301);
        }

        // Rewrite and handle 404
        const targetPath = `/acs_subdomains/acs_students${pathname}`;
        const response = await context.rewrite(targetPath);
        if (response.status === 404) {
            return context.rewrite("/acs_subdomains/acs_students/404/index.html");
        }
        return response;
    }

    // Bypasses for direct file access (for main site and admin)
    if (pathname.startsWith("/assets/") || pathname.startsWith("/shared/") || pathname.startsWith("/acs_subdomains/")) {
        return; // Fall through to static files at root
    }

    // 2. Signup Subdomain
    if (hostname.includes("signup.craftsoft")) {
        if (pathname === "/") {
            return context.rewrite("/acs_subdomains/acs_signup/index.html");
        }

        if (!pathname.includes(".") && !pathname.endsWith("/")) {
            return Response.redirect(`${request.url}/`, 301);
        }

        // Try to serve the file, fallback to 404
        const response = await context.next();
        if (response.status === 404) {
            return context.rewrite("/acs_subdomains/acs_signup/404/index.html");
        }
        return context.rewrite(`/acs_subdomains/acs_signup${pathname}`);
    }

    // 3. Admin Subdomain
    if (hostname.includes("admin.craftsoft")) {
        if (pathname === "/") {
            return context.rewrite("/acs_subdomains/acs_admin/index.html");
        }

        if (pathname === "/login") {
            return context.rewrite("/acs_subdomains/acs_admin/login.html");
        }

        // Precise Mapping Logic
        let targetPath = pathname;

        // Only apply short-url mapping if the full path isn't already used
        if (!pathname.startsWith("/students-clients/") && !pathname.startsWith("/courses-services/") && !pathname.startsWith("/payments/")) {
            if (pathname.startsWith("/students")) {
                targetPath = pathname.replace("/students", "/students-clients/students");
            } else if (pathname.startsWith("/clients")) {
                targetPath = pathname.replace("/clients", "/students-clients/clients");
            } else if (pathname.startsWith("/courses")) {
                targetPath = pathname.replace("/courses", "/courses-services/courses");
            } else if (pathname.startsWith("/services")) {
                targetPath = pathname.replace("/services", "/courses-services/services");
            } else if (pathname.startsWith("/record-payment")) {
                targetPath = pathname.replace("/record-payment", "/payments/record-payment");
            } else if (pathname.startsWith("/all-payments")) {
                targetPath = pathname.replace("/all-payments", "/payments/all-payments");
            } else if (pathname.startsWith("/receipts")) {
                targetPath = pathname.replace("/receipts", "/payments/receipts");
            }
        }

        // Redirect directories to trailing slash
        const adminFolders = ["/dashboard", "/inquiries", "/students", "/clients", "/courses", "/services", "/payments", "/tutors", "/settings", "/students-clients", "/courses-services"];
        if (adminFolders.some(folder => pathname === folder || pathname === folder + "/students" || pathname === folder + "/clients" || pathname === folder + "/courses" || pathname === folder + "/services")) {
            if (!pathname.endsWith("/")) {
                return Response.redirect(`${request.url}/`, 301);
            }
        }

        // Final Rewrite
        let finalPath = `/acs_subdomains/acs_admin${targetPath}`;
        if (finalPath.endsWith("/")) {
            finalPath += "index.html";
        }

        // Try rewrite, handle 404
        const response = await context.rewrite(finalPath);
        if (response.status === 404) {
            return context.rewrite("/acs_subdomains/acs_admin/404/index.html");
        }
        return response;
    }

    // 4. Main Website
    return;
};

export const config = { path: "/*" };
