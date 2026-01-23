export default async (request, context) => {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname;

    // 1. Student Portal Subdomain - MUST be checked FIRST before generic bypass
    if (hostname.includes("acs-student.craftsoft")) {
        // Shared assets from root (admin SDK, shared components, images)
        if (pathname.startsWith("/assets/admin/") ||
            pathname.startsWith("/assets/components/") ||
            pathname.startsWith("/assets/images/")) {
            return; // Fall through to root assets
        }

        // Student-specific assets from student folder
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

    // Admin subdomain asset handling (MUST be before generic bypass)
    if (hostname.includes("admin.craftsoft")) {
        if (pathname.startsWith("/assets/admin/")) {
            // Rewrite /assets/admin/* to /acs_subdomains/acs_admin/assets/*
            const assetPath = pathname.replace("/assets/admin/", "/acs_subdomains/acs_admin/assets/");
            return context.rewrite(assetPath);
        }
    }

    // Bypasses for direct file access (for main site)
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
            return context.rewrite("/acs_subdomains/acs_admin/index.html");
        }

        // Precise Mapping Logic
        let targetPath = pathname;

        // Only apply short-url mapping if the full path isn't already used
        if (!pathname.startsWith("/students-clients/") && !pathname.startsWith("/courses-services/") && !pathname.startsWith("/payments/") && !pathname.startsWith("/academics/") && !pathname.startsWith("/records/")) {
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
            } else if (pathname.startsWith("/payment-receipts")) {
                targetPath = pathname.replace("/payment-receipts", "/payments/receipts");
            } else if (pathname.startsWith("/receipts")) {
                targetPath = pathname.replace("/receipts", "/payments/receipts");
            } else if (pathname.startsWith("/upload-materials")) {
                targetPath = pathname.replace("/upload-materials", "/academics/upload-materials");
            } else if (pathname.startsWith("/assignments")) {
                targetPath = pathname.replace("/assignments", "/academics/assignments");
            } else if (pathname.startsWith("/submissions")) {
                targetPath = pathname.replace("/submissions", "/academics/submissions");
            } else if (pathname.startsWith("/version-history")) {
                targetPath = pathname.replace("/version-history", "/version-history");
            } else if (pathname.startsWith("/v-history")) {
                targetPath = pathname.replace("/v-history", "/version-history");
            } else if (pathname.startsWith("/archived-records")) {
                targetPath = pathname.replace("/archived-records", "/records/archived");
            } else if (pathname.startsWith("/recently-deleted")) {
                targetPath = pathname.replace("/recently-deleted", "/records/recently-deleted");
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
