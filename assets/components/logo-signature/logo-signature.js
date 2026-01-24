/**
 * Logo Signature Component
 * Usage: <div class="logo-signature-component" data-link="../index.html"></div>
 */
function initLogoSignature() {
    const containers = document.querySelectorAll('.logo-signature-component');

    containers.forEach(container => {
        // Skip if already initialized or if container is empty
        if (container.children.length > 0) return;

        const link = container.getAttribute('data-link') || 'index.html';

        container.innerHTML = `
            <a href="${link}" class="logo-component">
                <div class="logo-text-wrapper">
                    <span class="logo-sig">Abhi's</span>
                    <span class="logo-accent">Craftsoft</span>
                </div>
            </a>
        `;
    });
}

// Auto-run on load for static elements (Navbar)
document.addEventListener('DOMContentLoaded', initLogoSignature);

// Export for dynamic elements (Footer)
window.initLogoSignature = initLogoSignature;
