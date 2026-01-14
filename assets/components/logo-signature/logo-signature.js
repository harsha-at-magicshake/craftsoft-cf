/**
 * Logo Signature Component
 * Usage: <div class="logo-signature-component" data-link="../index.html"></div>
 */
document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('.logo-signature-component');
    
    containers.forEach(container => {
        const link = container.getAttribute('data-link') || '#home';
        const isFooter = container.hasAttribute('data-footer');
        
        container.innerHTML = `
            <a href="${link}" class="logo-component">
                ${!isFooter ? `<div class="logo-icon-box"><i class="fas fa-graduation-cap"></i></div>` : ''}
                <div class="logo-text-wrapper">
                    <span class="logo-sig">Abhi's</span>
                    <span class="logo-accent">Craft Soft</span>
                </div>
            </a>
        `;
    });
});
