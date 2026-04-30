// ==UserScript==
// @name         UniFi Sort Fixer
// @namespace    UniFi Sort Fixer
// @version      0.1
// @description  Fixes the alphabetical sorting on UniFi
// @author       asheroto
// @match        https://unifi.ui.com/
// @icon         https://icons.duckduckgo.com/ip2/ui.com.ico
// @grant        none
// ==/UserScript==

(function() {

	function clickSiteHeader() {
		const btn = Array.from(document.querySelectorAll('span[role="button"]')).find(el => el.textContent.trim() === 'Site');
		if (btn) {
			btn.click();
		} else {
			setTimeout(clickSiteHeader, 200);
		}
	}

	// On page load
	if (location.href === 'https://unifi.ui.com/') {
		clickSiteHeader();
	}

	// On SPA navigation
	let lastUrl = location.href;

	const observer = new MutationObserver(() => {
		if (location.href !== lastUrl) {
			lastUrl = location.href;
			if (location.href === 'https://unifi.ui.com/') {
				clickSiteHeader();
			}
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });

})();