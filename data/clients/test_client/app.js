"use strict";
document.addEventListener('DOMContentLoaded', () => {
    /**
     * ----------------------------------------------------------------
     * Graceful Null Checks for Core Interactive Elements
     * ----------------------------------------------------------------
     * Ensures the script doesn't crash if essential elements are missing.
     */
    const bookingForm = document.getElementById('booking-form');
    const successOverlay = document.getElementById('success-overlay');
    const closeSuccessOverlayBtn = document.getElementById('close-success-overlay');
    /**
     * ----------------------------------------------------------------
     * Smooth Scrolling for Anchor Links
     * ----------------------------------------------------------------
     * Intercepts clicks on links starting with '#' for smooth navigation.
     */
    const initSmoothScrolling = () => {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (!href)
                    return;
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    };
    /**
     * ----------------------------------------------------------------
     * Scroll Reveal Animation for Cards and Gallery Items
     * ----------------------------------------------------------------
     * Uses IntersectionObserver to fade-in and slide-up elements on scroll.
     */
    const initScrollReveal = () => {
        const revealElements = document.querySelectorAll('#services .grid > div, #testimonials .max-w-3xl, #gallery .grid > div');
        if (revealElements.length === 0)
            return;
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        });
        revealElements.forEach(element => {
            revealObserver.observe(element);
        });
    };
    /**
     * ----------------------------------------------------------------
     * Booking Form Submission Handler
     * ----------------------------------------------------------------
     * Handles form submission, API request, and success/error UI feedback.
     */
    const initBookingForm = () => {
        if (!bookingForm) {
            console.warn('Booking form with ID "booking-form" not found. Booking functionality disabled.');
            return;
        }
        if (!successOverlay || !closeSuccessOverlayBtn) {
            console.warn('Success overlay elements not found. Success message functionality disabled.');
        }
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            if (!submitButton) {
                console.error('Submit button not found within the booking form.');
                return;
            }
            const originalButtonText = submitButton.textContent || 'Book Now';
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';
            const formData = new FormData(bookingForm);
            const bookingData = {};
            formData.forEach((value, key) => {
                bookingData[key] = value.toString();
            });
            // Dynamic endpoint for SaaS preview and standalone hosting
            const bookingUrl = window.location.pathname.includes('/client/')
                ? window.location.pathname.replace(/\/$/, '') + '/book'
                : '/api/book';
            try {
                const response = await fetch(bookingUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bookingData),
                });
                if (response.ok) {
                    // Success
                    if (successOverlay) {
                        successOverlay.classList.remove('hidden');
                        successOverlay.classList.add('flex');
                    }
                    bookingForm.reset();
                }
                else {
                    // Handle HTTP errors
                    const errorData = await response.json();
                    alert(`Booking failed: ${errorData.message || 'Please try again.'}`);
                }
            }
            catch (error) {
                console.error('An error occurred during booking:', error);
                alert('An unexpected error occurred. Please check your connection and try again.');
            }
            finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
        // Add listener to close the success overlay
        if (closeSuccessOverlayBtn && successOverlay) {
            closeSuccessOverlayBtn.addEventListener('click', () => {
                successOverlay.classList.add('hidden');
                successOverlay.classList.remove('flex');
            });
        }
    };
    // Initialize all features
    initSmoothScrolling();
    initScrollReveal();
    initBookingForm();
});
