//! public/js/home/portfolio.js

/**
 * Portfolio Section Script
 *
 * Handles:
 * 1. Image slideshow for each portfolio card
 * 2. "Show more" behavior (reveal rows progressively)
 *
 * Design goals:
 * - Keep logic simple and robust (no fragile calculations)
 * - Avoid unnecessary global listeners duplication
 * - Work well across hover (desktop) and touch (mobile)
 */

(() => {
	document.getElementById('authModal')?.addEventListener('show.bs.modal', (event) => {
		const modal = event.currentTarget;
		const form = modal.querySelector('form[action="/auth/signin"]');
		const destination = event.relatedTarget
			? event.relatedTarget.dataset.appReturnTo || '/'
			: form?.querySelector('input[name="returnTo"]')?.value || '/';
		if (form) {
			let field = form.querySelector('input[name="returnTo"]');
			if (!field) {
				field = document.createElement('input');
				field.type = 'hidden';
				field.name = 'returnTo';
				form.append(field);
			}
			field.value = destination;
		}
		for (const provider of ['google', 'github', 'discord']) {
			modal.querySelectorAll(`a[href^="/auth/${provider}"]`).forEach((link) => {
				link.href = `/auth/${provider}?returnTo=${encodeURIComponent(destination)}`;
			});
		}
		if (event.relatedTarget?.dataset.appReturnTo) {
			const tab = document.getElementById('auth-signin-tab');
			if (tab) bootstrap.Tab.getOrCreateInstance(tab).show();
		}
	});
	// Root section guard (fail fast if section not present)
	const portfolioSection = document.querySelector('#portfolio');
	if (!portfolioSection) return;

	/**
	 * Utility: debounce
	 * Prevents a function from firing too often (used for resize)
	 */
	function debounce(callback, delay = 120) {
		let timeoutId;

		return () => {
			window.clearTimeout(timeoutId);
			timeoutId = window.setTimeout(callback, delay);
		};
	}

	/**
	 * Detect if device supports hover
	 * - Desktop → hover available
	 * - Mobile → no hover
	 */
	const isTouchDevice = window.matchMedia('(hover: none)').matches;

	/**
	 * Store all slider controllers
	 * Used to control them globally (e.g., visibility change)
	 */
	const sliderControllers = [];

	/**
	 * ============================
	 * 1. SLIDESHOW LOGIC
	 * ============================
	 */

	document
		.querySelectorAll('#portfolio .portfolio-media')
		.forEach((media) => {
			const images = Array.from(
				media.querySelectorAll('.portfolio-image'),
			);
			const dots = Array.from(media.querySelectorAll('.portfolio-dot'));

			// Skip cards with only one image
			if (images.length <= 1) return;

			let currentIndex = 0;
			let intervalId = null;

			// Interval delay (configurable via data attribute)
			const delay = Number(media.dataset.interval) || 2200;

			/**
			 * Update a single slide state
			 */
			function setSlideState(index, isActive) {
				const image = images[index];
				const dot = dots[index];

				if (!image) return;

				image.classList.toggle('active', isActive);

				if (isActive) {
					image.removeAttribute('aria-hidden');
					image.removeAttribute('tabindex');
				} else {
					image.setAttribute('aria-hidden', 'true');
					image.setAttribute('tabindex', '-1');
				}

				if (dot) {
					dot.classList.toggle('active', isActive);
				}
			}

			/**
			 * Switch to a specific slide
			 */
			function showSlide(nextIndex) {
				// Prevent unnecessary updates
				if (
					nextIndex === currentIndex ||
					nextIndex < 0 ||
					nextIndex >= images.length
				) {
					return;
				}

				setSlideState(currentIndex, false);
				currentIndex = nextIndex;
				setSlideState(currentIndex, true);
			}

			/**
			 * Go to next slide (loop)
			 */
			function nextSlide() {
				showSlide((currentIndex + 1) % images.length);
			}

			/**
			 * Start autoplay
			 */
			function startSlider() {
				// Do not run if already running or tab hidden
				if (intervalId || document.hidden) return;

				intervalId = window.setInterval(nextSlide, delay);
			}

			/**
			 * Stop autoplay
			 */
			function stopSlider() {
				if (!intervalId) return;

				window.clearInterval(intervalId);
				intervalId = null;
			}

			/**
			 * Dot navigation (manual slide selection)
			 */
			dots.forEach((dot, index) => {
				dot.addEventListener('click', () => {
					// Ignore clicking current slide
					if (index === currentIndex) return;

					stopSlider();
					showSlide(index);

					// Resume autoplay only on touch devices
					if (isTouchDevice) {
						startSlider();
					}
				});
			});

			/**
			 * Interaction behavior:
			 * - Mobile → autoplay always
			 * - Desktop → autoplay on hover only
			 */
			if (isTouchDevice) {
				startSlider();
			} else {
				media.addEventListener('mouseenter', startSlider);
				media.addEventListener('mouseleave', stopSlider);
			}

			// Register slider for global control
			sliderControllers.push({
				start: startSlider,
				stop: stopSlider,
			});
		});

	/**
	 * Pause sliders when tab is hidden
	 * Resume only for touch devices when visible again
	 */
	document.addEventListener('visibilitychange', () => {
		sliderControllers.forEach((slider) => {
			if (document.hidden) {
				slider.stop();
			} else if (isTouchDevice) {
				slider.start();
			}
		});
	});

	/**
	 * ============================
	 * 2. SHOW MORE (ROW LOGIC)
	 * ============================
	 */

	const portfolioGrid = document.querySelector('#portfolio-grid');
	const showMoreBtn = document.querySelector('#portfolio-show-more');

	if (portfolioGrid && showMoreBtn) {
		const items = Array.from(
			portfolioGrid.querySelectorAll('.portfolio-item'),
		);

		let itemsPerRow = 0;
		let visibleRows = 1;
		let gridWidth = portfolioGrid.clientWidth;

		/**
		 * Detect how many items fit in one row
		 * (based on actual layout, not breakpoints)
		 */
		function getItemsPerRow() {
			if (!items.length) return 1;

			const firstTop = items[0].offsetTop;
			let count = 0;

			for (const item of items) {
				if (item.offsetTop !== firstTop) break;
				count += 1;
			}

			return count || 1;
		}

		/**
		 * Apply visibility to items
		 */
		function updateVisibility() {
			const visibleCount = Math.min(visibleRows * itemsPerRow, items.length);
			items.forEach((item, index) => {
				item.classList.toggle('is-hidden', index >= visibleCount);
			});

			// Hide button if everything is visible
			showMoreBtn.hidden = visibleCount >= items.length;
		}

		/**
		 * Initialize grid:
		 * - calculate items per row dynamically
		 * - preserve the number of rows the visitor has revealed
		 */
		function initPortfolioRows() {
			// Reset (ensure accurate measurement)
			items.forEach((item) => item.classList.remove('is-hidden'));

			itemsPerRow = getItemsPerRow();

			updateVisibility();
		}

		/**
		 * Show more button → reveal next row
		 */
		showMoreBtn.addEventListener('click', () => {
			visibleRows += 1;

			updateVisibility();
		});

		/**
		 * Recalculate when the grid width changes. Mobile browser chrome can
		 * trigger height-only resize events while scrolling.
		 */
		window.addEventListener('resize', debounce(() => {
			const nextWidth = portfolioGrid.clientWidth;
			if (nextWidth === gridWidth) return;
			gridWidth = nextWidth;
			initPortfolioRows();
		}));

		// Initial setup
		initPortfolioRows();
	}
})();
