/**
 * ACTA Website Animation JavaScript
 * Handles scroll-triggered animations with IntersectionObserver
 */

(function() {
    'use strict';
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // If user prefers reduced motion, don't initialize animations
    if (prefersReducedMotion) {
        // Still add the is-in class to all fade-up elements for proper display
        document.addEventListener('DOMContentLoaded', function() {
            const fadeUpElements = document.querySelectorAll('.fade-up');
            fadeUpElements.forEach(element => {
                element.classList.add('is-in');
            });
        });
        return;
    }
    
    // Animation configuration
    const animationConfig = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };
    
    // Animation callback
    function handleIntersection(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                observer.unobserve(entry.target);
            }
        });
    }
    
    // Create intersection observer
    const observer = new IntersectionObserver(handleIntersection, animationConfig);
    
    // Initialize animations
    function init() {
        const fadeUpElements = document.querySelectorAll('.fade-up');
        
        fadeUpElements.forEach((element, index) => {
            // Add will-change property for better performance
            element.style.willChange = 'opacity, transform';
            
            // Minimal stagger for visual appeal (very fast)
            element.style.transitionDelay = `${index * 0.02}s`;
            
            // Observe element
            observer.observe(element);
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Handle dynamic content (if any is added later)
    function observeNewElements() {
        const newFadeUpElements = document.querySelectorAll('.fade-up:not([data-observed])');
        
        newFadeUpElements.forEach(element => {
            element.setAttribute('data-observed', 'true');
            element.style.willChange = 'opacity, transform';
            observer.observe(element);
        });
    }
    
    // Expose function for external use
    window.ACTAAnimate = {
        observeNewElements: observeNewElements,
        observer: observer
    };
    
})();
