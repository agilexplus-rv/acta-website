/**
 * ACTA Website GDPR Cookie Consent Manager
 * Handles cookie consent banner, modal, and script gating
 */

(function() {
    'use strict';
    
    // Consent categories
    const CONSENT_CATEGORIES = {
        NECESSARY: 'necessary',
        ANALYTICS: 'analytics',
        MARKETING: 'marketing'
    };
    
    // Storage keys
    const STORAGE_KEY = 'acta_consent';
    const COOKIE_NAME = 'acta_consent';
    const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds
    
    // DOM elements
    let cookieBanner, cookieModal, cookieSettingsButton;
    let acceptAllBtn, rejectBtn, manageBtn, closeModalBtn, saveBtn, acceptAllModalBtn;
    let analyticsCheckbox, marketingCheckbox;
    
    // State
    let currentConsent = {
        necessary: true,
        analytics: false,
        marketing: false
    };
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Initialize consent manager
    function init() {
        // Get DOM elements
        cookieBanner = document.getElementById('cookie-banner');
        cookieModal = document.getElementById('cookie-modal');
        cookieSettingsButton = document.getElementById('cookie-settings');
        
        if (!cookieBanner || !cookieModal || !cookieSettingsButton) {
            console.warn('Cookie consent elements not found');
            return;
        }
        
        // Get button elements
        acceptAllBtn = document.getElementById('accept-all');
        rejectBtn = document.getElementById('reject-non-essential');
        manageBtn = document.getElementById('manage-preferences');
        closeModalBtn = document.getElementById('close-modal');
        saveBtn = document.getElementById('save-preferences');
        acceptAllModalBtn = document.getElementById('accept-all-modal');
        
        // Get checkbox elements
        analyticsCheckbox = document.getElementById('analytics-consent');
        marketingCheckbox = document.getElementById('marketing-consent');
        
        // Load existing consent
        loadConsent();
        
        // Check if banner should be shown
        if (shouldShowBanner()) {
            showBanner();
        }
        
        // Add event listeners
        addEventListeners();
        
        // Process gated scripts
        processGatedScripts();
    }
    
    // Load consent from storage
    function loadConsent() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                currentConsent = { ...currentConsent, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.warn('Failed to load consent preferences:', e);
        }
        
        // Update UI to reflect current consent
        updateConsentUI();
    }
    
    // Save consent to storage
    function saveConsent(consent) {
        currentConsent = { ...currentConsent, ...consent };
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConsent));
            
            // Also set cookie for server-side access
            const cookieValue = encodeURIComponent(JSON.stringify(currentConsent));
            document.cookie = `${COOKIE_NAME}=${cookieValue}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
        } catch (e) {
            console.warn('Failed to save consent preferences:', e);
        }
    }
    
    // Check if banner should be shown
    function shouldShowBanner() {
        // Don't show if consent already given
        if (currentConsent.analytics || currentConsent.marketing) {
            return false;
        }
        
        // Check if there are any gated scripts
        const gatedScripts = document.querySelectorAll('script[type="text/plain"][data-cookie-category]');
        return gatedScripts.length > 0;
    }
    
    // Show consent banner
    function showBanner() {
        if (!cookieBanner) return;
        
        cookieBanner.classList.remove('hidden');
        
        // Animate in if not reduced motion
        if (!prefersReducedMotion) {
            requestAnimationFrame(() => {
                cookieBanner.style.transform = 'translateY(0)';
            });
        }
    }
    
    // Hide consent banner
    function hideBanner() {
        if (!cookieBanner) return;
        
        if (prefersReducedMotion) {
            cookieBanner.classList.add('hidden');
        } else {
            cookieBanner.style.transform = 'translateY(100%)';
            setTimeout(() => {
                cookieBanner.classList.add('hidden');
            }, 300);
        }
    }
    
    // Show consent modal
    function showModal() {
        if (!cookieModal) return;
        
        cookieModal.classList.remove('hidden');
        
        // Animate in if not reduced motion
        if (!prefersReducedMotion) {
            requestAnimationFrame(() => {
                cookieModal.style.opacity = '1';
            });
        }
        
        // Focus first interactive element
        const firstFocusable = cookieModal.querySelector('button, input, select, textarea');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }
    
    // Hide consent modal
    function hideModal() {
        if (!cookieModal) return;
        
        if (prefersReducedMotion) {
            cookieModal.classList.add('hidden');
        } else {
            cookieModal.style.opacity = '0';
            setTimeout(() => {
                cookieModal.classList.add('hidden');
            }, 300);
        }
    }
    
    // Update consent UI
    function updateConsentUI() {
        if (analyticsCheckbox) {
            analyticsCheckbox.checked = currentConsent.analytics;
        }
        if (marketingCheckbox) {
            marketingCheckbox.checked = currentConsent.marketing;
        }
    }
    
    // Process gated scripts
    function processGatedScripts() {
        const gatedScripts = document.querySelectorAll('script[type="text/plain"][data-cookie-category]');
        
        gatedScripts.forEach(script => {
            const category = script.getAttribute('data-cookie-category');
            
            if (isAllowed(category)) {
                // Convert to executable script
                const newScript = document.createElement('script');
                newScript.textContent = script.textContent;
                newScript.type = 'text/javascript';
                
                // Copy other attributes
                Array.from(script.attributes).forEach(attr => {
                    if (attr.name !== 'type' && attr.name !== 'data-cookie-category') {
                        newScript.setAttribute(attr.name, attr.value);
                    }
                });
                
                // Replace the gated script
                script.parentNode.replaceChild(newScript, script);
            }
        });
    }
    
    // Check if category is allowed
    function isAllowed(category) {
        if (category === CONSENT_CATEGORIES.NECESSARY) {
            return true;
        }
        return currentConsent[category] === true;
    }
    
    // Add event listeners
    function addEventListeners() {
        // Banner buttons
        if (acceptAllBtn) {
            acceptAllBtn.addEventListener('click', () => {
                acceptAll();
            });
        }
        
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => {
                rejectNonEssential();
            });
        }
        
        if (manageBtn) {
            manageBtn.addEventListener('click', () => {
                showModal();
            });
        }
        
        // Modal buttons
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', hideModal);
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                savePreferences();
            });
        }
        
        if (acceptAllModalBtn) {
            acceptAllModalBtn.addEventListener('click', () => {
                acceptAll();
            });
        }
        
        // Cookie settings button
        if (cookieSettingsButton) {
            cookieSettingsButton.addEventListener('click', showModal);
        }
        
        // Close modal on backdrop click
        if (cookieModal) {
            cookieModal.addEventListener('click', (e) => {
                if (e.target === cookieModal) {
                    hideModal();
                }
            });
        }
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !cookieModal.classList.contains('hidden')) {
                hideModal();
            }
        });
    }
    
    // Accept all cookies
    function acceptAll() {
        const consent = {
            necessary: true,
            analytics: true,
            marketing: true
        };
        
        saveConsent(consent);
        hideBanner();
        hideModal();
        processGatedScripts();
    }
    
    // Reject non-essential cookies
    function rejectNonEssential() {
        const consent = {
            necessary: true,
            analytics: false,
            marketing: false
        };
        
        saveConsent(consent);
        hideBanner();
        hideModal();
        processGatedScripts();
    }
    
    // Save preferences from modal
    function savePreferences() {
        const consent = {
            necessary: true,
            analytics: analyticsCheckbox ? analyticsCheckbox.checked : false,
            marketing: marketingCheckbox ? marketingCheckbox.checked : false
        };
        
        saveConsent(consent);
        hideBanner();
        hideModal();
        processGatedScripts();
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Global API
    window.ACTAConsent = {
        isAllowed: isAllowed,
        update: saveConsent,
        getConsent: () => ({ ...currentConsent }),
        showBanner: showBanner,
        showModal: showModal
    };
    
})();
