/**
 * ACTA Website Smooth Scroll JavaScript
 * Handles smooth scrolling for in-page anchor links
 */

(function() {
    'use strict';
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // If user prefers reduced motion, don't initialize smooth scrolling
    if (prefersReducedMotion) {
        return;
    }
    
    // Smooth scroll configuration
    const scrollConfig = {
        behavior: 'smooth',
        block: 'start'
    };
    
    // Handle anchor link clicks
    function handleAnchorClick(e) {
        const target = e.target.closest('a[href^="#"]');
        
        if (!target) return;
        
        const href = target.getAttribute('href');
        
        // Skip if it's just "#" or empty
        if (!href || href === '#') return;
        
        const targetElement = document.querySelector(href);
        
        if (!targetElement) return;
        
        e.preventDefault();
        
        // Scroll to target element
        targetElement.scrollIntoView(scrollConfig);
        
        // Move focus to target element after scroll
        setTimeout(() => {
            targetElement.focus();
            
            // Update URL hash without triggering scroll
            if (history.pushState) {
                history.pushState(null, null, href);
            } else {
                window.location.hash = href;
            }
        }, 100);
    }
    
    // Handle keyboard navigation
    function handleKeyboardNavigation(e) {
        // Only handle Enter key on anchor links
        if (e.key === 'Enter' && e.target.matches('a[href^="#"]')) {
            handleAnchorClick(e);
        }
    }
    
    // Initialize smooth scrolling
    function init() {
        // Add click event listener to document
        document.addEventListener('click', handleAnchorClick);
        
        // Add keyboard event listener for accessibility
        document.addEventListener('keydown', handleKeyboardNavigation);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose functions for external use
    window.ACTASmoothScroll = {
        scrollToElement: function(selector) {
            const element = document.querySelector(selector);
            if (element) {
                element.scrollIntoView(scrollConfig);
                setTimeout(() => element.focus(), 100);
            }
        }
    };
    
})();
