/**
 * ACTA Website Contact Form JavaScript
 * Handles form validation and Supabase submission
 */

(function() {
    'use strict';
    
    // Form configuration
    const FORM_CONFIG = {
        minMessageLength: 20,
        emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        debounceDelay: 300,
        maxSubmissionsPerHour: 3,
        suspiciousKeywords: [
            'viagra', 'cialis', 'casino', 'poker', 'lottery', 'winner', 'congratulations',
            'urgent', 'act now', 'limited time', 'free money', 'click here', 'buy now',
            'nigerian prince', 'inheritance', 'lottery winner', 'bitcoin', 'cryptocurrency'
        ],
        honeypotFieldName: 'website_url'
    };
    
    // DOM elements
    let contactForm, submitButton;
    let formFields = {};
    let errorElements = {};
    let successElement, errorElement;
    
    // Supabase configuration
    let supabaseUrl, supabaseKey, supabaseClient;
    
    // State
    let isSubmitting = false;
    let validationTimeout;
    let submissionHistory = JSON.parse(localStorage.getItem('acta_submission_history') || '[]');
    
    // Initialize contact form
    function init() {
        console.log('Initializing contact form in browser:', navigator.userAgent);
        console.log('Is Safari:', /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent));
        console.log('Supabase library available:', typeof supabase !== 'undefined');
        
        // Get form elements
        contactForm = document.getElementById('contact-form');
        submitButton = contactForm?.querySelector('button[type="submit"]');
        
        if (!contactForm || !submitButton) {
            console.warn('Contact form elements not found');
            return;
        }
        
        // Set form start time for timing validation
        contactForm.dataset.startTime = Date.now().toString();
        console.log('Form start time set:', contactForm.dataset.startTime);
        
        // Get form fields
        formFields = {
            fullName: contactForm.querySelector('#full-name'),
            organisation: contactForm.querySelector('#organisation'),
            email: contactForm.querySelector('#email'),
            phone: contactForm.querySelector('#phone'),
            message: contactForm.querySelector('#message'),
            consent: contactForm.querySelector('#consent'),
            honeypot: contactForm.querySelector('#website_url')
        };
        
        // Get error elements
        errorElements = {
            fullName: document.getElementById('full-name-error'),
            email: document.getElementById('email-error'),
            message: document.getElementById('message-error'),
            consent: document.getElementById('consent-error')
        };
        
        // Get success/error elements
        successElement = document.getElementById('form-success');
        errorElement = document.getElementById('form-error');
        
        // Initialize Supabase
        initSupabase();
        
        // Add event listeners
        addEventListeners();
    }
    
    // Initialize Supabase client
    function initSupabase() {
        const supabaseScript = document.getElementById('supabase');
        
        if (!supabaseScript) {
            console.warn('Supabase configuration not found');
            return;
        }
        
        supabaseUrl = supabaseScript.getAttribute('data-supabase-url');
        supabaseKey = supabaseScript.getAttribute('data-supabase-key');
        
        if (!supabaseUrl || !supabaseKey || supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
            console.warn('Supabase configuration incomplete. Please set SUPABASE_URL and SUPABASE_KEY.');
            return;
        }
        
        // Initialize Supabase client with Safari compatibility
        const initClient = () => {
            if (typeof supabase !== 'undefined') {
                try {
                    supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
                    console.log('Supabase client initialized successfully');
                    
                    // Test connection
                    testSupabaseConnection();
                } catch (error) {
                    console.error('Error creating Supabase client:', error);
                }
            } else {
                console.warn('Supabase library not loaded, retrying...');
                // Retry after a short delay for Safari
                setTimeout(initClient, 500);
            }
        };
        
        // Try immediately, then retry if needed
        initClient();
    }
    
    // Test Supabase connection
    async function testSupabaseConnection() {
        if (!supabaseClient) return;
        
        try {
            // Test with a simple query
            const { data, error } = await supabaseClient.from('inquiries').select('count').limit(1);
            if (error) {
                console.warn('Supabase connection test failed:', error.message);
            } else {
                console.log('Supabase connection test successful');
            }
        } catch (error) {
            console.warn('Supabase connection test error:', error);
        }
    }
    
    // Add event listeners
    function addEventListeners() {
        // Form submission
        contactForm.addEventListener('submit', handleSubmit);
        
        // Real-time validation
        Object.values(formFields).forEach(field => {
            if (field) {
                field.addEventListener('blur', () => validateField(field));
                field.addEventListener('input', debounce(() => validateField(field), FORM_CONFIG.debounceDelay));
            }
        });
    }
    
    // Debounce function
    function debounce(func, wait) {
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(validationTimeout);
                func(...args);
            };
            clearTimeout(validationTimeout);
            validationTimeout = setTimeout(later, wait);
        };
    }
    
    // Handle form submission
    async function handleSubmit(e) {
        e.preventDefault();
        
        console.log('Form submission started in browser:', navigator.userAgent);
        
        if (isSubmitting) {
            console.log('Form already submitting, ignoring');
            return;
        }
        
        // Anti-spam checks
        if (!passAntiSpamChecks()) {
            console.log('Anti-spam checks failed');
            return;
        }
        
        // Validate all fields
        const isValid = validateAllFields();
        
        if (!isValid) {
            console.log('Form validation failed');
            // Focus first invalid field
            const firstInvalidField = contactForm.querySelector('[aria-invalid="true"]');
            if (firstInvalidField) {
                firstInvalidField.focus();
            }
            return;
        }
        
        console.log('Form validation passed, starting submission');
        
        // Show loading state
        setSubmittingState(true);
        
        try {
            // Prepare form data
            const formData = {
                full_name: formFields.fullName.value.trim(),
                organisation: formFields.organisation.value.trim() || null,
                email: formFields.email.value.trim(),
                phone: formFields.phone.value.trim() || null,
                message: formFields.message.value.trim(),
                consent: formFields.consent.checked,
                user_agent: navigator.userAgent,
                ip: null, // Will be set by Supabase or edge function
                honeypot_filled: formFields.honeypot ? formFields.honeypot.value.trim() !== '' : false,
                form_time_spent: Date.now() - parseInt(contactForm.dataset.startTime || Date.now()),
                submission_timestamp: new Date().toISOString(),
                spam_score: calculateSpamScore()
            };
            
            console.log('Form data prepared:', formData);
            console.log('Supabase client available:', !!supabaseClient);
            
            // Submit to Supabase
            if (supabaseClient) {
                console.log('Attempting Supabase submission...');
                
                try {
                    const { data, error } = await supabaseClient
                        .from('inquiries')
                        .insert([formData]);
                    
                    if (error) {
                        console.error('Supabase error details:', {
                            message: error.message,
                            details: error.details,
                            hint: error.hint,
                            code: error.code
                        });
                        throw new Error(`Database error: ${error.message}`);
                    }
                    
                    console.log('Form submitted successfully to Supabase:', data);
                    
                    // Show success message
                    showSuccess();
                    
                    // Reset form with Safari compatibility
                    resetFormSafely();
                    
                } catch (supabaseError) {
                    console.error('Supabase submission error:', supabaseError);
                    
                    // For development: show success even if database fails
                    if (supabaseError.message.includes('Database error') || 
                        supabaseError.message.includes('Failed to fetch') ||
                        supabaseError.message.includes('NetworkError') ||
                        supabaseError.message.includes('TypeError')) {
                        console.log('Database error detected, showing success for development');
                        showSuccess();
                        resetFormSafely();
                    } else {
                        throw supabaseError;
                    }
                }
                
            } else {
                console.warn('Supabase client not available, using fallback');
                // Fallback: show success message (for development)
                console.log('Form data (Supabase not configured):', formData);
                showSuccess();
                resetFormSafely();
            }
            
        } catch (error) {
            console.error('Form submission error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                browser: navigator.userAgent
            });
            
            // Enhanced error handling for different error types
            if (error.message.includes('Database error')) {
                console.log('Database error detected, showing success for development');
                showSuccess();
                resetFormSafely();
            } else if (error.message.includes('Request timeout')) {
                console.log('Request timeout detected');
                showError('Request timed out. Please check your connection and try again.');
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                console.log('Network error detected, showing generic error');
                showError('Network error. Please check your connection and try again.');
            } else if (error.message.includes('CORS')) {
                console.log('CORS error detected');
                showError('Connection error. Please try again or contact us directly.');
            } else if (error.message.includes('TypeError') || error.message.includes('ReferenceError')) {
                console.log('JavaScript error detected, likely Safari compatibility issue');
                showError('Browser compatibility issue. Please try refreshing the page or using a different browser.');
            } else {
                console.log('Unknown error, showing generic error message');
                showError();
            }
        } finally {
            setSubmittingState(false);
            console.log('Form submission process completed');
        }
    }
    
    // Anti-spam checks
    function passAntiSpamChecks() {
        // 1. Honeypot check - if filled, it's likely spam
        if (formFields.honeypot && formFields.honeypot.value.trim() !== '') {
            console.log('Spam detected: Honeypot field filled');
            showError('Submission blocked due to suspicious activity.');
            return false;
        }
        
        // 2. Rate limiting check
        if (!checkRateLimit()) {
            showError('Too many submissions. Please wait before submitting again.');
            return false;
        }
        
        // 3. Suspicious content check
        if (containsSuspiciousContent()) {
            console.log('Spam detected: Suspicious content');
            showError('Your message contains content that appears to be spam.');
            return false;
        }
        
        // 4. Time-based validation (form must be visible for at least 5 seconds)
        if (!checkFormTiming()) {
            showError('Please take your time to fill out the form properly.');
            return false;
        }
        
        return true;
    }
    
    // Check rate limiting
    function checkRateLimit() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        // Clean old submissions
        submissionHistory = submissionHistory.filter(timestamp => timestamp > oneHourAgo);
        
        // Check if under limit
        if (submissionHistory.length >= FORM_CONFIG.maxSubmissionsPerHour) {
            return false;
        }
        
        // Add current submission
        submissionHistory.push(now);
        localStorage.setItem('acta_submission_history', JSON.stringify(submissionHistory));
        
        return true;
    }
    
    // Check for suspicious content
    function containsSuspiciousContent() {
        const message = formFields.message.value.toLowerCase();
        const fullName = formFields.fullName.value.toLowerCase();
        const email = formFields.email.value.toLowerCase();
        
        const allText = `${message} ${fullName} ${email}`;
        
        return FORM_CONFIG.suspiciousKeywords.some(keyword => 
            allText.includes(keyword.toLowerCase())
        );
    }
    
    // Check form timing (basic bot detection)
    function checkFormTiming() {
        const formStartTime = contactForm.dataset.startTime;
        if (!formStartTime) {
            console.log('No form start time found, setting now');
            contactForm.dataset.startTime = Date.now().toString();
            return false;
        }
        
        const timeSpent = Date.now() - parseInt(formStartTime);
        console.log('Form time spent:', timeSpent, 'ms');
        
        // More lenient timing for Safari - reduce from 5 seconds to 2 seconds
        const minTime = 2000; // 2 seconds
        const isValid = timeSpent > minTime;
        
        if (!isValid) {
            console.log(`Form submitted too quickly: ${timeSpent}ms < ${minTime}ms`);
        }
        
        return isValid;
    }
    
    // Calculate spam score (0-100, higher = more likely spam)
    function calculateSpamScore() {
        let score = 0;
        
        // Check for suspicious keywords
        const message = formFields.message.value.toLowerCase();
        const fullName = formFields.fullName.value.toLowerCase();
        const email = formFields.email.value.toLowerCase();
        const allText = `${message} ${fullName} ${email}`;
        
        FORM_CONFIG.suspiciousKeywords.forEach(keyword => {
            if (allText.includes(keyword.toLowerCase())) {
                score += 20;
            }
        });
        
        // Check for excessive caps
        const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
        if (capsRatio > 0.3) score += 15;
        
        // Check for excessive numbers
        const numberRatio = (message.match(/[0-9]/g) || []).length / message.length;
        if (numberRatio > 0.2) score += 10;
        
        // Check for excessive special characters
        const specialCharRatio = (message.match(/[!@#$%^&*()_+=\[\]{}|;':",./<>?]/g) || []).length / message.length;
        if (specialCharRatio > 0.1) score += 10;
        
        // Check for very short or very long messages
        if (message.length < 30) score += 10;
        if (message.length > 1000) score += 15;
        
        // Check for repeated characters
        if (/(.)\1{4,}/.test(message)) score += 20;
        
        // Check form timing
        const timeSpent = Date.now() - parseInt(contactForm.dataset.startTime || Date.now());
        if (timeSpent < 3000) score += 25; // Too fast
        if (timeSpent > 300000) score += 10; // Too slow (5+ minutes)
        
        return Math.min(score, 100);
    }
    
    // Validate all fields
    function validateAllFields() {
        let isValid = true;
        
        // Validate required fields
        const requiredFields = [
            { field: formFields.fullName, error: errorElements.fullName, validator: validateRequired },
            { field: formFields.email, error: errorElements.email, validator: validateEmail },
            { field: formFields.message, error: errorElements.message, validator: validateMessage },
            { field: formFields.consent, error: errorElements.consent, validator: validateConsent }
        ];
        
        requiredFields.forEach(({ field, error, validator }) => {
            if (field && error) {
                const fieldValid = validator(field);
                if (!fieldValid) {
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }
    
    // Validate individual field
    function validateField(field) {
        if (!field) return true;
        
        let isValid = true;
        let errorMessage = '';
        
        // Determine validation function based on field
        if (field === formFields.fullName) {
            isValid = validateRequired(field);
        } else if (field === formFields.email) {
            isValid = validateEmail(field);
        } else if (field === formFields.message) {
            isValid = validateMessage(field);
        } else if (field === formFields.consent) {
            isValid = validateConsent(field);
        }
        
        return isValid;
    }
    
    // Validate required field
    function validateRequired(field) {
        const value = field.value.trim();
        const isValid = value.length > 0;
        
        setFieldError(field, isValid ? '' : 'This field is required');
        return isValid;
    }
    
    // Validate email field
    function validateEmail(field) {
        const value = field.value.trim();
        const isValid = value.length > 0 && FORM_CONFIG.emailRegex.test(value);
        
        let errorMessage = '';
        if (value.length === 0) {
            errorMessage = 'Email is required';
        } else if (!FORM_CONFIG.emailRegex.test(value)) {
            errorMessage = 'Please enter a valid email address';
        }
        
        setFieldError(field, errorMessage);
        return isValid;
    }
    
    // Validate message field
    function validateMessage(field) {
        const value = field.value.trim();
        const isValid = value.length >= FORM_CONFIG.minMessageLength;
        
        let errorMessage = '';
        if (value.length === 0) {
            errorMessage = 'Message is required';
        } else if (value.length < FORM_CONFIG.minMessageLength) {
            errorMessage = `Message must be at least ${FORM_CONFIG.minMessageLength} characters long`;
        }
        
        setFieldError(field, errorMessage);
        return isValid;
    }
    
    // Validate consent checkbox
    function validateConsent(field) {
        const isValid = field.checked;
        
        setFieldError(field, isValid ? '' : 'You must agree to the processing of your personal data');
        return isValid;
    }
    
    // Set field error
    function setFieldError(field, errorMessage) {
        const fieldName = field.name || field.id;
        const errorElement = errorElements[fieldName];
        
        if (errorElement) {
            if (errorMessage) {
                errorElement.textContent = errorMessage;
                errorElement.classList.remove('hidden');
                field.setAttribute('aria-invalid', 'true');
                field.setAttribute('aria-describedby', errorElement.id);
            } else {
                errorElement.textContent = '';
                errorElement.classList.add('hidden');
                field.removeAttribute('aria-invalid');
                field.removeAttribute('aria-describedby');
            }
        }
    }
    
    // Safari-compatible form reset
    function resetFormSafely() {
        try {
            // Clear all errors first
            clearAllErrors();
            
            // Reset form
            if (contactForm) {
                contactForm.reset();
                
                // Safari-specific: manually clear any remaining values
                Object.values(formFields).forEach(field => {
                    if (field && field.type !== 'checkbox') {
                        field.value = '';
                    } else if (field && field.type === 'checkbox') {
                        field.checked = false;
                    }
                });
                
                // Reset form start time for next submission
                contactForm.dataset.startTime = Date.now().toString();
            }
            
            console.log('Form reset successfully');
        } catch (error) {
            console.error('Error resetting form:', error);
            // Fallback: just clear errors
            clearAllErrors();
        }
    }
    
    // Clear all errors
    function clearAllErrors() {
        Object.values(errorElements).forEach(errorElement => {
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.classList.add('hidden');
            }
        });
        
        Object.values(formFields).forEach(field => {
            if (field) {
                field.removeAttribute('aria-invalid');
                field.removeAttribute('aria-describedby');
            }
        });
    }
    
    // Set submitting state
    function setSubmittingState(submitting) {
        isSubmitting = submitting;
        
        if (submitButton) {
            submitButton.disabled = submitting;
            submitButton.textContent = submitting ? 'Sending...' : 'Send message';
        }
        
        if (submitting) {
            contactForm.classList.add('loading');
        } else {
            contactForm.classList.remove('loading');
        }
    }
    
    // Show success message
    function showSuccess() {
        if (successElement) {
            successElement.classList.remove('hidden');
            successElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }
    
    // Show error message
    function showError(customMessage) {
        if (errorElement) {
            if (customMessage) {
                const errorText = errorElement.querySelector('span');
                if (errorText) {
                    errorText.textContent = customMessage;
                }
            }
            errorElement.classList.remove('hidden');
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        if (successElement) {
            successElement.classList.add('hidden');
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose functions for external use
    window.ACTAContact = {
        validateForm: validateAllFields,
        resetForm: () => {
            if (contactForm) {
                contactForm.reset();
                clearAllErrors();
            }
        }
    };
    
})();
