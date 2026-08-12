//! public/js/root/backToTop.js

(() => {
	const backToTop = document.querySelector('[data-back-to-top]');
	const scrollRoot = document.scrollingElement || document.documentElement;
	const SHOW_OFFSET = 48;

	if (!backToTop || !scrollRoot) return;

	function canPageScroll() {
		return scrollRoot.scrollHeight > scrollRoot.clientHeight + 1;
	}

	function updateBackToTopVisibility() {
		backToTop.hidden = !canPageScroll() || scrollRoot.scrollTop <= SHOW_OFFSET;
	}

	window.addEventListener('scroll', updateBackToTopVisibility, {
		passive: true,
	});
	window.addEventListener('resize', updateBackToTopVisibility);
	window.addEventListener('load', updateBackToTopVisibility);

	updateBackToTopVisibility();
})();
