document.addEventListener('DOMContentLoaded', () => {

    /**
     * Handles the booking form submission, API interaction, and success/error feedback.
     */
    const initBookingForm = (): void => {
        const form = document.getElementById('booking-form') as HTMLFormElement | null;
        const successOverlay = document.getElementById('success-overlay') as HTMLElement | null;
        const closeSuccessButton = document.getElementById('close-success-overlay') as HTMLButtonElement | null;

        if (!form) {
            console.warn('Booking form with ID "booking-form" not found. Form functionality will be disabled.');
            return;
        }

        if (!successOverlay || !closeSuccessButton) {
            console.warn('Success overlay or its close button not found. Success feedback will be disabled.');
        }

        form.addEventListener('submit', async (event: SubmitEvent) => {
            event.preventDefault();

            const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
            if (!submitButton) {
                console.error('Submit button not found within the booking form.');
                return;
            }

            const originalButtonText = submitButton.textContent || 'Book Now';
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';

            try {
                const formData = new FormData(form);
                const bookingData = {
                    name: formData.get('name') as string,
                    email: formData.get('email') as string,
                    service: formData.get('service') as string,
                    date: formData.get('date') as string,
                };

                const endpoint = window.location.pathname.replace(/\/$/, '') + '/book';

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bookingData),
                });

                if (response.ok) {
                    form.reset();
                    if (successOverlay) {
                        successOverlay.classList.remove('hidden');
                        successOverlay.classList.add('flex');
                    }
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
                }

            } catch (error) {
                console.error('Booking submission failed:', error);
                alert('There was an issue with your booking. Please check your details or try again later.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });

        if (successOverlay && closeSuccessButton) {
            closeSuccessButton.addEventListener('click', () => {
                successOverlay.classList.add('hidden');
                successOverlay.classList.remove('flex');
            });
        }
    };

    /**
     * Initializes smooth scrolling for all anchor links pointing to an element on the same page.
     */
    const initSmoothScrolling = (): void => {
        const anchorLinks = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');

        anchorLinks.forEach(link => {
            link.addEventListener('click', (event: MouseEvent) => {
                const href = link.getAttribute('href');
                if (!href || href === '#') return;

                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    event.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    };

    /**
     * Initializes a scroll-triggered fade-in and slide-up animation for designated elements.
     * A CSS class 'is-visible' is added to the element when it enters the viewport.
     * The CSS should handle the transition for .revealable and .revealable.is-visible states.
     * e.g.,
     * .revealable { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease-out, transform 0.6s ease-out; }
     * .revealable.is-visible { opacity: 1; transform: translateY(0); }
     */
    const initScrollReveal = (): void => {
        const revealElements = document.querySelectorAll<HTMLElement>('.service-card, .testimonial-card, .gallery-item');

        if (revealElements.length === 0) {
            return;
        }

        const observerOptions: IntersectionObserverInit = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observerCallback: IntersectionObserverCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add a class to trigger the animation defined in CSS
                    entry.target.classList.add('is-visible');
                    // Stop observing the element once it has been revealed
                    observer.unobserve(entry.target);
                }
            });
        };

        const scrollObserver = new IntersectionObserver(observerCallback, observerOptions);

        revealElements.forEach(element => {
            // Add a base class for styling the initial state
            element.classList.add('revealable');
            scrollObserver.observe(element);
        });
    };

    // Initialize all features
    initBookingForm();
    initSmoothScrolling();
    initScrollReveal();
});