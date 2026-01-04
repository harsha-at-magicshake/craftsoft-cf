export default async (request, context) => {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // 1. Signup Subdomain
    if (hostname === "signup.craftsoft.co.in") {
        if (url.pathname === "/") {
            return context.rewrite("/subdomains/acs_admin/signup/index.html");
        }
        return context.rewrite(`/subdomains/acs_admin/signup${url.pathname}`);
    }

    // 2. Admin Subdomain
    if (hostname === "admin.craftsoft.co.in") {
        if (url.pathname === "/") {
            return context.rewrite("/subdomains/acs_admin/index.html");
        }
        if (url.pathname === "/login") {
            return context.rewrite("/subdomains/acs_admin/login.html");
        }

        const adminPaths = ["/dashboard", "/inquiries", "/students", "/clients", "/courses", "/services", "/payments", "/settings"];
        if (adminPaths.some(path => url.pathname.startsWith(path))) {
            if (!url.pathname.includes(".") && !url.pathname.endsWith("/")) {
                return context.rewrite(`/subdomains/acs_admin${url.pathname}/index.html`);
            }
            return context.rewrite(`/subdomains/acs_admin${url.pathname}`);
        }

        return context.rewrite(`/subdomains/acs_admin${url.pathname}`);
    }

    // 3. Main Website
    return;
};

export const config = { path: "/*" };
