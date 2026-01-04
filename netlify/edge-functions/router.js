export default async (request, context) => {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname;

    // 1. Signup Subdomain
    if (hostname.includes("signup.craftsoft")) {
        if (pathname === "/") {
            return context.rewrite("/subdomains/acs_admin/signup/index.html");
        }
        if (!pathname.includes(".") && !pathname.endsWith("/")) {
            return Response.redirect(`${request.url}/`, 301);
        }
        return context.rewrite(`/subdomains/acs_admin/signup${pathname}`);
    }

    // 2. Admin Subdomain
    if (hostname.includes("admin.craftsoft")) {
        // Bypasses for direct file access
        if (pathname.startsWith("/assets/") || pathname.startsWith("/shared/") || pathname.startsWith("/subdomains/")) {
            return;
        }

        if (pathname === "/") {
            return context.rewrite("/subdomains/acs_admin/index.html");
        }

        if (pathname === "/login") {
            return context.rewrite("/subdomains/acs_admin/login.html");
        }

        // Precise Mapping Logic
        let targetPath = pathname;

        // Only apply short-url mapping if the full path isn't already used
        if (!pathname.startsWith("/students-clients/") && !pathname.startsWith("/courses-services/")) {
            if (pathname.startsWith("/students")) {
                targetPath = pathname.replace("/students", "/students-clients/students");
            } else if (pathname.startsWith("/clients")) {
                targetPath = pathname.replace("/clients", "/students-clients/clients");
            } else if (pathname.startsWith("/courses")) {
                targetPath = pathname.replace("/courses", "/courses-services/courses");
            } else if (pathname.startsWith("/services")) {
                targetPath = pathname.replace("/services", "/courses-services/services");
            }
        }

        // Redirect directories to trailing slash (except for file-like paths)
        const adminFolders = ["/dashboard", "/inquiries", "/students", "/clients", "/courses", "/services", "/payments", "/tutors", "/settings", "/students-clients", "/courses-services"];
        if (adminFolders.some(folder => pathname === folder || pathname === folder + "/students" || pathname === folder + "/clients" || pathname === folder + "/courses" || pathname === folder + "/services")) {
            if (!pathname.endsWith("/")) {
                return Response.redirect(`${request.url}/`, 301);
            }
        }

        // Final Rewrite
        let finalPath = `/subdomains/acs_admin${targetPath}`;
        if (finalPath.endsWith("/")) {
            finalPath += "index.html";
        }

        return context.rewrite(finalPath);
    }

    // 3. Main Website
    return;
};

export const config = { path: "/*" };
