/**
 * ACTA Website Header JavaScript
 * Handles header reveal on scroll and mobile menu functionality
 */

(function() {
    'use strict';
    
    // DOM elements
    const html = document.documentElement;
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu a');
    const desktopNav = document.querySelector('.desktop-nav');
    
    // State
    let isScrolled = false;
    let isMobileMenuOpen = false;
    let lastScrollY = 0;
    
    // Throttle function for scroll events
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Header scroll reveal functionality
    function handleScroll() {
        const scrollY = window.scrollY;
        
        // Toggle scrolled state based on scroll position
        if (scrollY > 48 && !isScrolled) {
            isScrolled = true;
            html.setAttribute('data-state', 'scrolled');
        } else if (scrollY <= 48 && isScrolled) {
            isScrolled = false;
            html.setAttribute('data-state', 'loaded');
        }
        
        lastScrollY = scrollY;
    }
    
    // Mobile menu functionality
    function toggleMobileMenu() {
        isMobileMenuOpen = !isMobileMenuOpen;
        
        if (isMobileMenuOpen) {
            openMobileMenu();
        } else {
            closeMobileMenu();
        }
    }
    
    function openMobileMenu() {
        mobileMenuButton.setAttribute('aria-expanded', 'true');
        mobileMenu.classList.remove('hidden');
        isMobileMenuOpen = true;
        
        // Focus trap
        trapFocus(mobileMenu);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
    
    function closeMobileMenu() {
        mobileMenuButton.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.add('hidden');
        isMobileMenuOpen = false;
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Return focus to menu button
        mobileMenuButton.focus();
    }
    
    // Focus trap for mobile menu
    function trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        );
        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];
        
        element.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableElement) {
                        lastFocusableElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusableElement) {
                        firstFocusableElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
        
        // Focus first element
        if (firstFocusableElement) {
            firstFocusableElement.focus();
        }
    }
    
    // Handle mobile menu link clicks
    function handleMobileMenuLinkClick() {
        closeMobileMenu();
    }
    
    // Handle escape key
    function handleEscapeKey(e) {
        if (e.key === 'Escape' && isMobileMenuOpen) {
            closeMobileMenu();
        }
    }
    
    // Handle window resize
    function handleResize() {
        // Close mobile menu on desktop
        if (window.innerWidth >= 768 && isMobileMenuOpen) {
            closeMobileMenu();
        }
        
        // Update navigation visibility
        updateNavigationVisibility();
    }
    
    // Update navigation visibility based on screen size
    function updateNavigationVisibility() {
        if (desktopNav) {
            if (window.innerWidth >= 768) {
                desktopNav.style.display = 'block';
            } else {
                desktopNav.style.display = 'none';
            }
        }
    }
    
    // Initialize header functionality
    function init() {
        // Set initial state - show header initially, then hide if not scrolled
        html.setAttribute('data-state', 'loaded');
        
        // Check initial scroll position
        handleScroll();
        
        // Add scroll event listener with throttling
        window.addEventListener('scroll', throttle(handleScroll, 16), { passive: true });
        
        // Mobile menu event listeners
        if (mobileMenuButton) {
            mobileMenuButton.addEventListener('click', toggleMobileMenu);
        }
        
        // Close mobile menu when clicking on links
        mobileMenuLinks.forEach(link => {
            link.addEventListener('click', handleMobileMenuLinkClick);
        });
        
        // Handle escape key
        document.addEventListener('keydown', handleEscapeKey);
        
        // Handle window resize
        window.addEventListener('resize', throttle(handleResize, 250));
        
        // Initialize navigation visibility
        updateNavigationVisibility();
        
        // Handle clicks outside mobile menu
        document.addEventListener('click', function(e) {
            if (isMobileMenuOpen && 
                !mobileMenu.contains(e.target) && 
                !mobileMenuButton.contains(e.target)) {
                closeMobileMenu();
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose functions for external use if needed
    window.ACTAHeader = {
        closeMobileMenu: closeMobileMenu,
        openMobileMenu: openMobileMenu,
        isMobileMenuOpen: () => isMobileMenuOpen
    };
    
})();
